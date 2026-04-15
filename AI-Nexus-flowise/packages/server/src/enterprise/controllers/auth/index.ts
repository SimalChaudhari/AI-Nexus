import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { Platform } from '../../../Interface'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { setTokenOrCookies } from '../../middleware/passport'
import { LoggedInUser } from '../../Interface.Enterprise'
import { resolveLoggedInUserFromAiNexusToken } from '../../services/ai-nexus-auth.service'

const establishSession = async (req: Request, user: LoggedInUser): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
        if (!req.session || !req.login) return resolve()
        req.session.regenerate((regenerateErr) => {
            if (regenerateErr) return reject(regenerateErr)
            req.login(user, { session: true }, (loginErr) => {
                if (loginErr) return reject(loginErr)
                resolve()
            })
        })
    })
}

const getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        const type = req.params.type as string
        const allPermissions = appServer.identityManager.getPermissions().toJSON()
        const user = req.user as LoggedInUser

        let permissions: { [key: string]: { key: string; value: string }[] } = allPermissions

        // Mapping of feature flags to permission prefixes
        const featureToPermissionMap: { [key: string]: string[] } = {
            'feat:login-activity': ['loginActivity:'],
            'feat:logs': ['logs:'],
            'feat:roles': ['roles:'],
            'feat:share': ['credentials:share', 'templates:custom-share'],
            'feat:sso-config': ['sso:'],
            'feat:users': ['users:'],
            'feat:workspaces': ['workspace:']
        }

        // Category filtering for non-ROLE type
        if (type !== 'ROLE') {
            const filteredPermissions: { [key: string]: { key: string; value: string }[] } = {}

            for (const [category, categoryPermissions] of Object.entries(allPermissions)) {
                // Exclude workspace and admin categories
                if (category !== 'workspace' && category !== 'admin') {
                    filteredPermissions[category] = categoryPermissions
                }
            }

            permissions = filteredPermissions
        }

        // Feature-based filtering for Cloud platform
        if (type !== 'ROLE' && appServer.identityManager.getPlatformType() === Platform.CLOUD) {
            const userFeatures = user.features
            if (userFeatures) {
                const disabledFeatures = Object.entries(userFeatures).filter(([, value]) => value === 'false')

                // Get list of disabled permission prefixes
                const disabledPermissionPrefixes: string[] = []
                disabledFeatures.forEach(([featureKey]) => {
                    const prefixes = featureToPermissionMap[featureKey]
                    if (prefixes) {
                        disabledPermissionPrefixes.push(...prefixes)
                    }
                })

                // Filter out permissions based on disabled features
                const filteredPermissions: { [key: string]: { key: string; value: string }[] } = {}

                for (const [category, categoryPermissions] of Object.entries(permissions)) {
                    const filteredCategoryPermissions = (categoryPermissions as any[]).filter((permission) => {
                        // Check if this permission starts with any disabled prefix
                        const isDisabled = disabledPermissionPrefixes.some((prefix) => permission.key.startsWith(prefix))
                        return !isDisabled
                    })

                    // Only include category if it has remaining permissions
                    if (filteredCategoryPermissions.length > 0) {
                        filteredPermissions[category] = filteredCategoryPermissions
                    }
                }

                permissions = filteredPermissions
            }
        }

        // User-level filtering for non-admin users
        if (type !== 'ROLE' && user.isOrganizationAdmin === false) {
            const userPermissions = user.permissions as string[]
            const filteredPermissions: { [key: string]: { key: string; value: string }[] } = {}

            for (const [category, categoryPermissions] of Object.entries(permissions)) {
                const filteredCategoryPermissions = (categoryPermissions as any[]).filter((permission) =>
                    userPermissions?.includes(permission.key)
                )

                if (filteredCategoryPermissions.length > 0) {
                    filteredPermissions[category] = filteredCategoryPermissions
                }
            }

            permissions = filteredPermissions
        }

        return res.status(StatusCodes.OK).json(permissions)
    } catch (error) {
        next(error)
    }
}

const ssoSuccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        const ssoToken = req.query.token as string
        if (!ssoToken) {
            console.warn('[ssoSuccess] Missing token query param', { path: req.path, hasTokenCookie: Boolean(req.cookies?.token) })
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Missing SSO token' })
        }
        const user = await appServer.cachePool.getSSOTokenCache(ssoToken)
        if (!user) {
            // One-time SSO token can expire or be consumed after first read.
            // If JWT cookie session already exists, return it instead of forcing relogin.
            const sessionUser = req.user as LoggedInUser | undefined
            if (sessionUser) {
                console.info('[ssoSuccess] Cache miss but session user exists; returning session user', {
                    userId: sessionUser.id,
                    activeWorkspaceId: sessionUser.activeWorkspaceId
                })
                return res.status(StatusCodes.OK).json(sessionUser)
            }
            console.warn('[ssoSuccess] Cache miss and no session user', {
                tokenPrefix: ssoToken.slice(0, 8),
                hasTokenCookie: Boolean(req.cookies?.token),
                hasRefreshCookie: Boolean(req.cookies?.refreshToken),
                hasReqUser: Boolean(req.user)
            })
            return res.status(401).json({ message: 'Invalid or expired SSO token' })
        }
        console.info('[ssoSuccess] Cache hit; returning SSO user payload', {
            tokenPrefix: ssoToken.slice(0, 8),
            userId: user?.id
        })
        await appServer.cachePool.deleteSSOTokenCache(ssoToken)
        return res.json(user)
    } catch (error) {
        console.error('[ssoSuccess] Unexpected error', error)
        next(error)
    }
}

/**
 * AI Nexus token-based login: GET /api/v1/auth/external-login?token=JWT
 * Verifies JWT, provisions Flowise user/workspace, sets session cookies, redirects to SSO success.
 */
const externalLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const externalToken = req.query.token as string
        if (!externalToken) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Missing token' })
        const loggedInUser = await resolveLoggedInUserFromAiNexusToken(externalToken)
        await establishSession(req, loggedInUser)
        return setTokenOrCookies(res, loggedInUser, true, req, true, true)
    } catch (error: unknown) {
        const message =
            error instanceof InternalFlowiseError ? error.message : (error as Error)?.message || 'External login failed'
        return res.status(StatusCodes.UNAUTHORIZED).json({ message: `External login failed: ${message}` })
    }
}

/**
 * Session bootstrap: GET /api/v1/auth/session-user (cookie session) or ?token=JWT from AI Nexus
 */
const sessionUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as LoggedInUser | undefined
        if (user) return res.status(StatusCodes.OK).json(user)

        const externalToken = (req.query.token as string) || ''
        if (!externalToken) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'No active session' })

        const loggedInUser = await resolveLoggedInUserFromAiNexusToken(externalToken)
        await establishSession(req, loggedInUser)
        return setTokenOrCookies(res, loggedInUser, true, req, false, true)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllPermissions,
    ssoSuccess,
    externalLogin,
    sessionUser
}
