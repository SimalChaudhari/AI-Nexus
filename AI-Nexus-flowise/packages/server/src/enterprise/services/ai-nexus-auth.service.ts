/**
 * AI Nexus token-based login: verify JWT signed with the same secret as the main app,
 * then map the user into Flowise enterprise (user, org, workspace) and build LoggedInUser.
 *
 * Env: AINEXUS_JWT_SECRET or JWT_SECRET must match AI Nexus backend JWT_SECRET.
 */
import { StatusCodes } from 'http-status-codes'
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import type { QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { LoggedInUser } from '../Interface.Enterprise'
import { OrganizationName } from '../database/entities/organization.entity'
import { OrganizationUser, OrganizationUserStatus } from '../database/entities/organization-user.entity'
import { GeneralRole } from '../database/entities/role.entity'
import { User, UserStatus } from '../database/entities/user.entity'
import { WorkspaceUser, WorkspaceUserStatus } from '../database/entities/workspace-user.entity'
import { Workspace, WorkspaceName } from '../database/entities/workspace.entity'
import { OrganizationUserErrorMessage } from './organization-user.service'
import { OrganizationService } from './organization.service'
import { OrganizationUserService } from './organization-user.service'
import { RoleErrorMessage, RoleService } from './role.service'
import { UserService } from './user.service'
import { WorkspaceService } from './workspace.service'
import { WorkspaceUserService } from './workspace-user.service'
import { isInvalidUUID } from '../utils/validation.util'

export type AiNexusJwtPayload = {
    id?: string
    email?: string
    username?: string
    firstname?: string
    lastname?: string
    role?: string
}

const buildDisplayName = (payload: AiNexusJwtPayload, email: string) => {
    const full = [payload.firstname, payload.lastname].filter(Boolean).join(' ').trim()
    if (full) return full.slice(0, 100)
    if (payload.username) return payload.username.slice(0, 100)
    return (email.split('@')[0] || 'User').slice(0, 100)
}

const attachWorkspaceMembershipIfMissing = async (user: User, queryRunner: QueryRunner) => {
    const workspaceRepo = queryRunner.manager.getRepository(Workspace)
    const firstWorkspace = await workspaceRepo.findOne({ where: {}, order: { createdDate: 'ASC' } })
    const roleService = new RoleService()

    if (firstWorkspace) {
        const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
        if (!ownerRole) throw new Error('Owner role not found')

        const existingOrgUser = await queryRunner.manager.findOneBy(OrganizationUser, {
            organizationId: firstWorkspace.organizationId as string,
            userId: user.id
        })
        if (!existingOrgUser) {
            const ou = queryRunner.manager.create(OrganizationUser, {
                organizationId: firstWorkspace.organizationId,
                userId: user.id,
                roleId: ownerRole.id,
                status: OrganizationUserStatus.ACTIVE,
                createdBy: user.id,
                updatedBy: user.id
            })
            await queryRunner.manager.save(ou)
        } else if (existingOrgUser.roleId !== ownerRole.id) {
            existingOrgUser.roleId = ownerRole.id
            existingOrgUser.updatedBy = user.id
            await queryRunner.manager.save(existingOrgUser)
        }

        const existingWsUser = await queryRunner.manager.findOneBy(WorkspaceUser, {
            workspaceId: firstWorkspace.id,
            userId: user.id
        })
        if (!existingWsUser) {
            const wu = queryRunner.manager.create(WorkspaceUser, {
                workspaceId: firstWorkspace.id,
                userId: user.id,
                roleId: ownerRole.id,
                status: WorkspaceUserStatus.ACTIVE,
                lastLogin: new Date().toISOString(),
                createdBy: user.id,
                updatedBy: user.id
            })
            await queryRunner.manager.save(wu)
        } else if (existingWsUser.roleId !== ownerRole.id) {
            existingWsUser.roleId = ownerRole.id
            existingWsUser.updatedBy = user.id
            existingWsUser.lastLogin = new Date().toISOString()
            await queryRunner.manager.save(existingWsUser)
        }
        return
    }

    const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
    if (!ownerRole) throw new Error('Owner role not found')

    const organizationService = new OrganizationService()
    const workspaceService = new WorkspaceService()

    let organization = organizationService.createNewOrganization(
        { name: OrganizationName.DEFAULT_ORGANIZATION, createdBy: user.id },
        queryRunner,
        true
    )
    organization = await organizationService.saveOrganization(organization, queryRunner)

    const orgUserRow = queryRunner.manager.create(OrganizationUser, {
        organizationId: organization.id,
        userId: user.id,
        roleId: ownerRole.id,
        status: OrganizationUserStatus.ACTIVE,
        createdBy: user.id,
        updatedBy: user.id
    })
    await queryRunner.manager.save(orgUserRow)

    let workspace = workspaceService.createNewWorkspace(
        {
            name: WorkspaceName.DEFAULT_WORKSPACE,
            organizationId: organization.id,
            createdBy: user.id
        },
        queryRunner,
        true
    )
    workspace = await workspaceService.saveWorkspace(workspace, queryRunner)

    const wsUserRow = queryRunner.manager.create(WorkspaceUser, {
        workspaceId: workspace.id,
        userId: user.id,
        roleId: ownerRole.id,
        status: WorkspaceUserStatus.ACTIVE,
        lastLogin: new Date().toISOString(),
        createdBy: user.id,
        updatedBy: user.id
    })
    await queryRunner.manager.save(wsUserRow)
}

/**
 * Verifies AI Nexus access token and returns Flowise LoggedInUser (creates/links tenant rows as needed).
 */
export const resolveLoggedInUserFromAiNexusToken = async (externalToken: string): Promise<LoggedInUser> => {
    const appServer = getRunningExpressApp()
    const externalJwtSecret = process.env.AINEXUS_JWT_SECRET || process.env.JWT_SECRET
    if (!externalJwtSecret) throw new Error('AINEXUS_JWT_SECRET (or JWT_SECRET) is not configured for AI Nexus login')

    let payload: AiNexusJwtPayload
    try {
        payload = jwt.verify(externalToken, externalJwtSecret, { algorithms: ['HS256'] }) as AiNexusJwtPayload
    } catch (e: unknown) {
        if (e instanceof TokenExpiredError) {
            throw new Error('Token expired — sign in again in AI Nexus and retry.')
        }
        if (e instanceof JsonWebTokenError) {
            throw new Error(
                `Invalid JWT (${e.message}). Set Flowise AINEXUS_JWT_SECRET to the same value as AI Nexus JWT_SECRET.`
            )
        }
        throw e
    }

    const email = payload?.email
    if (!email) throw new Error('Invalid token payload (email required)')

    const displayName = buildDisplayName(payload, email)

    const queryRunner = appServer.AppDataSource.createQueryRunner()
    await queryRunner.connect()

    try {
        const userService = new UserService()
        let user: User | null = null
        if (payload.id && !isInvalidUUID(payload.id)) {
            user = await userService.readUserById(payload.id, queryRunner)
        }
        if (!user) {
            user = await userService.readUserByEmail(email, queryRunner)
        }

        if (user) {
            const nameChanged = displayName && user.name !== displayName
            const emailChanged = user.email.toLowerCase() !== email.toLowerCase()
            if (nameChanged || emailChanged) {
                user.name = displayName || user.name
                user.email = email
                user.updatedBy = user.id
                user = await queryRunner.manager.save(User, user)
            }
        }

        if (!user) {
            const newUserId = payload.id && !isInvalidUUID(payload.id) ? payload.id : null
            if (!newUserId) throw new Error('Token must include a valid user id (uuid) for first-time provisioning')

            const workspaceRepo = queryRunner.manager.getRepository(Workspace)
            const firstWorkspace = await workspaceRepo.findOne({ where: {}, order: { createdDate: 'ASC' } })

            const roleService = new RoleService()
            user = queryRunner.manager.create(User, {
                id: newUserId,
                name: displayName,
                email,
                credential: null,
                status: UserStatus.ACTIVE,
                createdBy: newUserId,
                updatedBy: newUserId
            })
            user = await queryRunner.manager.save(User, user)

            if (firstWorkspace) {
                const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
                if (!ownerRole) throw new Error('Owner role not found')

                const ouNew = queryRunner.manager.create(OrganizationUser, {
                    organizationId: firstWorkspace.organizationId,
                    userId: user.id,
                    roleId: ownerRole.id,
                    status: OrganizationUserStatus.ACTIVE,
                    createdBy: user.id,
                    updatedBy: user.id
                })
                await queryRunner.manager.save(ouNew)
                const wuNew = queryRunner.manager.create(WorkspaceUser, {
                    workspaceId: firstWorkspace.id,
                    userId: user.id,
                    roleId: ownerRole.id,
                    status: WorkspaceUserStatus.ACTIVE,
                    lastLogin: new Date().toISOString(),
                    createdBy: user.id,
                    updatedBy: user.id
                })
                await queryRunner.manager.save(wuNew)
            } else {
                const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
                if (!ownerRole) throw new Error('Owner role not found')

                const organizationService = new OrganizationService()
                const workspaceService = new WorkspaceService()

                let organization = organizationService.createNewOrganization(
                    { name: OrganizationName.DEFAULT_ORGANIZATION, createdBy: newUserId },
                    queryRunner,
                    true
                )
                organization = await organizationService.saveOrganization(organization, queryRunner)

                const ouBoot = queryRunner.manager.create(OrganizationUser, {
                    organizationId: organization.id,
                    userId: user.id,
                    roleId: ownerRole.id,
                    status: OrganizationUserStatus.ACTIVE,
                    createdBy: user.id,
                    updatedBy: user.id
                })
                await queryRunner.manager.save(ouBoot)

                let workspace = workspaceService.createNewWorkspace(
                    {
                        name: WorkspaceName.DEFAULT_WORKSPACE,
                        organizationId: organization.id,
                        createdBy: newUserId
                    },
                    queryRunner,
                    true
                )
                workspace = await workspaceService.saveWorkspace(workspace, queryRunner)

                const wuBoot = queryRunner.manager.create(WorkspaceUser, {
                    workspaceId: workspace.id,
                    userId: user.id,
                    roleId: ownerRole.id,
                    status: WorkspaceUserStatus.ACTIVE,
                    lastLogin: new Date().toISOString(),
                    createdBy: user.id,
                    updatedBy: user.id
                })
                await queryRunner.manager.save(wuBoot)
            }
        }

        const workspaceUserService = new WorkspaceUserService()
        let workspaceUsers = await workspaceUserService.readWorkspaceUserByUserId(user.id, queryRunner)
        if (!workspaceUsers || workspaceUsers.length === 0) {
            await attachWorkspaceMembershipIfMissing(user, queryRunner)
            workspaceUsers = await workspaceUserService.readWorkspaceUserByUserId(user.id, queryRunner)
        }
        if (!workspaceUsers || workspaceUsers.length === 0) throw new Error('No workspace assigned after provisioning')

        let workspaceUser = workspaceUsers[0]

        const organizationUserService = new OrganizationUserService()
        const { organizationUser } = await organizationUserService.readOrganizationUserByWorkspaceIdUserId(
            workspaceUser.workspaceId,
            workspaceUser.userId,
            queryRunner
        )
        if (!organizationUser)
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)

        const assignedWorkspaces = workspaceUsers.map((item) => ({
            id: item.workspace.id,
            name: item.workspace.name,
            role: item.role?.name || '',
            organizationId: item.workspace.organizationId || ''
        }))

        const roleService = new RoleService()
        const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
        if (!ownerRole) throw new Error('Owner role not found')

        if (workspaceUser.roleId !== ownerRole.id) {
            workspaceUser.roleId = ownerRole.id
            workspaceUser.updatedBy = user.id
            workspaceUser.lastLogin = new Date().toISOString()
            workspaceUser = await queryRunner.manager.save(WorkspaceUser, workspaceUser)
            organizationUser.roleId = ownerRole.id
            organizationUser.updatedBy = user.id
            await queryRunner.manager.save(OrganizationUser, organizationUser)
        }

        const role = await roleService.readRoleById(workspaceUser.roleId, queryRunner)
        if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)

        const orgService = new OrganizationService()
        const organization = await orgService.readOrganizationById(organizationUser.organizationId, queryRunner)
        if (!organization) throw new Error('Organization not found')

        const subscriptionId = (organization.subscriptionId as string) || ''
        const customerId = (organization.customerId as string) || ''
        const features = subscriptionId ? await appServer.identityManager.getFeaturesByPlan(subscriptionId) : {}
        const productId = subscriptionId ? await appServer.identityManager.getProductIdFromSubscription(subscriptionId) : ''
        let permissions: string[] = []
        try {
            permissions = role.permissions ? [...JSON.parse(role.permissions)] : []
        } catch {
            permissions = []
        }

        const loggedInUser: LoggedInUser = {
            id: workspaceUser.userId,
            email: user.email,
            name: user.name,
            roleId: workspaceUser.roleId,
            activeOrganizationId: organization.id,
            activeOrganizationSubscriptionId: subscriptionId,
            activeOrganizationCustomerId: customerId,
            activeOrganizationProductId: productId,
            isOrganizationAdmin: ownerRole ? workspaceUser.roleId === ownerRole.id : false,
            activeWorkspaceId: workspaceUser.workspaceId,
            activeWorkspace: workspaceUser.workspace.name,
            assignedWorkspaces,
            permissions,
            features
        }

        return loggedInUser
    } finally {
        await queryRunner.release()
    }
}
