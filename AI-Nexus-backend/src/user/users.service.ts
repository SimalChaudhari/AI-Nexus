//users.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { UserEntity, UserRole, UserStatus, AuthProvider } from './users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In } from 'typeorm';
import { UpdateUserDto, UserDto } from './users.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EmailService } from '../service/email.service';
import {
    PaginatedQueryOptions,
    PaginatedResultWithMeta,
    PaginationService,
} from '../common/pagination/pagination.service';
import { verifyEmailAddress } from '../utils/email-verification.util';
import { AuthService } from '../auth/auth.service';
import { OAuthAuthService } from '../auth/oauth-auth.service';
import { normalizeEmail } from '../utils/auth.utils';
import { assertEmailAvailableForRole } from './user-email-availability.util';
import {
    AdminUserProgressFilter,
    AdminUserProgressService,
} from '../course/admin-user-progress.service';
import {
    adminUserExportNeedsProgress,
    buildAdminUsersCsv,
    parseAdminUserExportFields,
} from './admin-user-export.util';

function generateTemporaryPassword(length = 14): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let out = '';
    for (let i = 0; i < length; i += 1) out += chars[crypto.randomInt(0, chars.length)];
    return out;
}

function normalizeStringArray(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;
    const normalized = [...new Set(value.map((v) => String(v || '').trim()).filter(Boolean))];
    return normalized.length > 0 ? normalized : [];
}

export type UserListQueryOptions = PaginatedQueryOptions & {
    status?: UserStatus;
    role?: UserRole;
    usePagination?: boolean;
    progressFilter?: AdminUserProgressFilter;
};

export type UserPaginatedListResult = PaginatedResultWithMeta<
    UserEntity,
    { status: UserStatus | null; progressFilter: AdminUserProgressFilter | null }
>;

const PROGRESS_FILTERS = new Set<AdminUserProgressFilter>([
    'pillars_current',
    'badge_certificate',
    'pillars_100',
]);

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        private readonly emailService: EmailService,
        private readonly paginationService: PaginationService,
        private readonly authService: AuthService,
        private readonly oauthAuthService: OAuthAuthService,
        private readonly adminUserProgressService: AdminUserProgressService,
    ) { }

    parseProgressFilter(raw?: string): AdminUserProgressFilter | undefined {
        const value = String(raw || '').trim() as AdminUserProgressFilter;
        return PROGRESS_FILTERS.has(value) ? value : undefined;
    }

    private normalizeUsername(username: string): string {
        return username.trim().toLowerCase();
    }

    /** Company display name: prefer last admin/profile edit, then cached Salesforce corporate userinfo. */
    private resolveCorporateCompanyName(user: UserEntity): string {
        const snapshot =
            user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
                ? (user.eligibilitySnapshot as Record<string, unknown>)
                : {};
        for (const key of ['companyName', 'company'] as const) {
            const fromSnapshot = String(snapshot[key] || '').trim();
            if (fromSnapshot) return fromSnapshot;
        }

        const raw = user.salesforceUserInfoRaw;
        if (raw && typeof raw === 'object') {
            const corporate =
                (raw as Record<string, unknown>).corporate
                && typeof (raw as Record<string, unknown>).corporate === 'object'
                    ? ((raw as Record<string, unknown>).corporate as Record<string, unknown>)
                    : null;
            const candidates = [
                corporate?.accountName,
                corporate?.companyName,
                corporate?.name,
                (raw as Record<string, unknown>).accountName,
                (raw as Record<string, unknown>).companyName,
            ];
            for (const value of candidates) {
                const name = String(value || '').trim();
                if (name) return name;
            }
        }
        return '';
    }

    private withCompanyName<T extends UserEntity>(user: T): T & { companyName: string | null; company: string | null } {
        const companyName = this.resolveCorporateCompanyName(user) || null;
        // Frontend transformUser already maps `company` as the display name.
        return Object.assign(user, { companyName, company: companyName });
    }

    private buildListQuery(queryOptions?: {
        search?: string;
        status?: UserStatus;
        role?: UserRole;
        page?: number;
        limit?: number;
    }) {
        const normalized = this.paginationService.normalizePaginatedQuery(
            {
                page: queryOptions?.page,
                limit: queryOptions?.limit,
                search: queryOptions?.search,
            },
            10,
            100,
        );
        const status = queryOptions?.status;
        const role = queryOptions?.role;

        const query = this.userRepository
            .createQueryBuilder('user')
            .where('user.role != :adminRole', { adminRole: UserRole.Admin })
            .andWhere('user.isDraft = :isDraft', { isDraft: false });

        if (role) {
            query.andWhere('user.role = :role', { role });
        } else {
            // Default Users list excludes Corporate accounts (shown under Corporate Members).
            query.andWhere('user.role != :corporateRole', { corporateRole: UserRole.Corporate });
        }

        if (status) {
            query.andWhere('user.status = :status', { status });
        }

        if (normalized.hasSearch) {
            const searchPattern = `%${normalized.search}%`;
            query.andWhere(
                new Brackets((qb) => {
                    // Match full display name ("First Last") as well as individual fields.
                    qb.where(
                        `CONCAT(COALESCE(user.firstname, ''), ' ', COALESCE(user.lastname, '')) ILIKE :search`,
                        { search: searchPattern },
                    )
                        .orWhere('user.firstname ILIKE :search', { search: searchPattern })
                        .orWhere('user.lastname ILIKE :search', { search: searchPattern })
                        .orWhere('user.username ILIKE :search', { search: searchPattern })
                        .orWhere('user.email ILIKE :search', { search: searchPattern })
                        .orWhere('user.contactNumber ILIKE :search', { search: searchPattern })
                        .orWhere('user.companyCode ILIKE :search', { search: searchPattern })
                        // CAST avoids TypeORM treating Postgres `::text` as a `:text` bind param.
                        .orWhere('CAST(user.salesforceUserInfoRaw AS text) ILIKE :search', {
                            search: searchPattern,
                        });
                }),
            );
        }

        query.orderBy('user.createdAt', 'DESC');
        return { query, normalized, status, role };
    }

    private async applyProgressFilterToIds(
        userIds: string[],
        progressFilter?: AdminUserProgressFilter,
    ): Promise<string[]> {
        if (!progressFilter || !userIds.length) return userIds;
        return this.adminUserProgressService.filterUserIds(userIds, progressFilter);
    }

    /**
     * Build one-account Salesforce update payload from local user.
     * Only allowed updatebulkuserfornexus fields; keyed by salesforceAccountId.
     */
    private buildSalesforceSingleAccountUpdateFromUser(user: UserEntity): {
        accountId: string;
        salutation?: string;
        first_name?: string;
        last_name?: string;
        name_as_per_id?: string;
        email?: string;
        jobFunction?: string;
        mobile?: string;
        countryOfResidence?: string;
        company?: string;
        department?: string;
    } | null {
        const accountId = String(user.salesforceAccountId || '').trim();
        if (!accountId) return null;

        const snapshot =
            user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
                ? (user.eligibilitySnapshot as Record<string, unknown>)
                : {};
        const rawRoot =
            user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
                ? (user.salesforceUserInfoRaw as Record<string, unknown>)
                : {};
        const nested =
            rawRoot.nexus && typeof rawRoot.nexus === 'object'
                ? (rawRoot.nexus as Record<string, unknown>)
                : null;
        const raw = nested || rawRoot;

        const read = (...keys: string[]) => {
            for (const key of keys) {
                const fromSnapshot = snapshot[key];
                if (fromSnapshot !== undefined && fromSnapshot !== null && String(fromSnapshot).trim()) {
                    return String(fromSnapshot).trim();
                }
                const fromRaw = raw[key];
                if (fromRaw !== undefined && fromRaw !== null && String(fromRaw).trim()) {
                    return String(fromRaw).trim();
                }
            }
            return '';
        };

        const firstName = String(user.firstname || '').trim();
        const lastName = String(user.lastname || '').trim();
        const email = normalizeEmail(user.email || '');
        const mobile = String(user.contactNumber || '').trim();
        const nameAsPerId =
            read('nameAsPerId', 'name_as_per_id')
            || [firstName, lastName].filter(Boolean).join(' ').trim();
        const company =
            read('companyName', 'company')
            || this.resolveCorporateCompanyName(user);
        const jobFunction = read('jobFunctionLabel', 'jobFunction');
        const countryOfResidence = read('countryOfResidence');
        const department = read('department');
        const salutation = read('salutation');

        return {
            accountId,
            ...(salutation ? { salutation } : {}),
            ...(firstName ? { first_name: firstName } : {}),
            ...(lastName ? { last_name: lastName } : {}),
            ...(nameAsPerId ? { name_as_per_id: nameAsPerId } : {}),
            ...(email ? { email } : {}),
            ...(jobFunction ? { jobFunction } : {}),
            ...(mobile ? { mobile } : {}),
            ...(countryOfResidence ? { countryOfResidence } : {}),
            ...(company ? { company } : {}),
            ...(department ? { department } : {}),
        };
    }

    /** After local DB update, sync this one user to Salesforce by accountId. */
    private async syncSalesforceProfileAfterLocalUpdate(user: UserEntity): Promise<void> {
        const row = this.buildSalesforceSingleAccountUpdateFromUser(user);
        if (!row) {
            this.logger.log(
                `[UserUpdate] Skipping Salesforce sync — no salesforceAccountId for user ${user.id}`,
            );
            return;
        }

        await this.oauthAuthService.updateSalesforceNexusUserByAccountId(row);
        this.logger.log(
            `[UserUpdate] Salesforce profile synced for accountId=${row.accountId}`,
        );
    }

    async getAll(queryOptions?: UserListQueryOptions): Promise<UserEntity[] | UserPaginatedListResult> {
        const usePagination = Boolean(queryOptions?.usePagination);
        const progressFilter = queryOptions?.progressFilter;
        const { query, normalized, status } = this.buildListQuery(queryOptions);

        if (!progressFilter) {
            if (!usePagination) {
                const rows = await query.getMany();
                return rows.map((row) => this.withCompanyName(row));
            }

            const paginated = await this.paginationService.paginateQueryBuilder({
                queryBuilder: query,
                page: normalized.page,
                limit: normalized.limit,
                search: normalized.hasSearch ? normalized.search : null,
            });

            return {
                data: paginated.data.map((row) => this.withCompanyName(row)),
                pagination: {
                    ...paginated.pagination,
                    status: status ?? null,
                    progressFilter: null,
                },
            };
        }

        const idRows = await query.select(['user.id', 'user.createdAt']).getMany();
        const orderedIds = await this.applyProgressFilterToIds(
            idRows.map((row) => row.id),
            progressFilter,
        );

        if (!usePagination) {
            if (!orderedIds.length) return [];
            const users = await this.userRepository.find({ where: { id: In(orderedIds) } });
            const byId = new Map(users.map((user) => [user.id, user]));
            return orderedIds
                .map((id) => byId.get(id))
                .filter((user): user is UserEntity => Boolean(user))
                .map((row) => this.withCompanyName(row));
        }

        const page = normalized.page;
        const limit = normalized.limit;
        const totalItems = orderedIds.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / limit) || 1);
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * limit;
        const pageIds = orderedIds.slice(start, start + limit);
        const pageUsers = pageIds.length
            ? await this.userRepository.find({ where: { id: In(pageIds) } })
            : [];
        const byId = new Map(pageUsers.map((user) => [user.id, user]));
        const data = pageIds
            .map((id) => byId.get(id))
            .filter((user): user is UserEntity => Boolean(user))
            .map((row) => this.withCompanyName(row));

        return {
            data,
            pagination: {
                page: safePage,
                limit,
                totalItems,
                totalPages,
                hasNextPage: safePage < totalPages,
                hasPreviousPage: safePage > 1,
                search: normalized.hasSearch ? normalized.search : null,
                isPinned: null,
                status: status ?? null,
                progressFilter: progressFilter ?? null,
            },
        };
    }

    async exportUsersCsv(params: {
        search?: string;
        status?: UserStatus;
        role?: UserRole;
        progressFilter?: AdminUserProgressFilter;
        fields?: string | string[];
        from?: string;
        to?: string;
    }): Promise<{ filename: string; csv: string }> {
        const fields = parseAdminUserExportFields(params.fields);
        let users = (await this.getAll({
            usePagination: false,
            search: params.search,
            status: params.status,
            role: params.role,
            progressFilter: params.progressFilter,
        })) as Array<UserEntity & { companyName?: string | null; company?: string | null }>;

        const fromBound = this.parseExportDayBound(params.from, false);
        const toBound = this.parseExportDayBound(params.to, true);
        if (fromBound || toBound) {
            users = users.filter((user) => {
                const created = user.createdAt instanceof Date ? user.createdAt : new Date(String(user.createdAt || ''));
                if (Number.isNaN(created.getTime())) return false;
                const t = created.getTime();
                if (fromBound && t < fromBound.getTime()) return false;
                if (toBound && t > toBound.getTime()) return false;
                return true;
            });
        }

        let progressByUser;
        if (adminUserExportNeedsProgress(fields) && users.length) {
            progressByUser = await this.adminUserProgressService.buildProgressFlags(
                users.map((user) => user.id),
            );
        }

        return buildAdminUsersCsv({
            users,
            fields,
            progressByUser,
            filenamePrefix: params.role === UserRole.Corporate ? 'corporate-hr-export' : 'admin-users-export',
        });
    }

    private parseExportDayBound(value: string | undefined, endOfDay: boolean): Date | null {
        const raw = String(value || '').trim();
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
        if (!match) return null;
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);
        const sgOffsetMs = 8 * 60 * 60 * 1000;
        const start = new Date(Date.UTC(year, month, day) - sgOffsetMs);
        if (!endOfDay) return start;
        return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    }

    async findAllUsers(): Promise<UserEntity[]> {
        return this.userRepository.find({ where: { role: UserRole.User, isDraft: false } });
    }

    async getById(id: string): Promise<UserEntity & { companyName: string | null }> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException("User not found");
        }
        return this.withCompanyName(user);
    }

    async create(createUserDto: Partial<UserDto>): Promise<{
        message: string;
        user: Omit<UserEntity, 'password'>;
        temporaryPasswordEmailSent: boolean;
    }> {
        if (!createUserDto.email) {
            throw new BadRequestException('Email is required');
        }
        const normalizedEmail = normalizeEmail(createUserDto.email);
        const createRole = createUserDto.role || UserRole.User;

        // Same email allowed once for User + once for Corporate; reject third / duplicate role.
        await assertEmailAvailableForRole(this.userRepository, normalizedEmail, createRole);

        const normalizedUsername = this.normalizeUsername(createUserDto.username || '');
        if (!normalizedUsername) {
            throw new BadRequestException('Username is required');
        }
        const createEmailVerification = await verifyEmailAddress(normalizedEmail);
        if (!createEmailVerification.isValid) {
            throw new BadRequestException(
                createEmailVerification.reason || 'Please provide a valid real email address.',
            );
        }

        // Check if username already exists (case-insensitive)
        const existingUserByUsername = await this.userRepository
            .createQueryBuilder('user')
            .where('LOWER(user.username) = LOWER(:username)', { username: normalizedUsername })
            .getOne();
        if (existingUserByUsername) {
            throw new BadRequestException('Username already exists');
        }

        const plainPassword =
            createUserDto.password?.trim() && createUserDto.password.trim().length > 0
                ? createUserDto.password.trim()
                : generateTemporaryPassword();
        const passwordHash = await bcrypt.hash(plainPassword, 10);

        // Create new user (LOCAL auth)
        const user = this.userRepository.create({
            username: normalizedUsername,
            firstname: createUserDto.firstname,
            lastname: createUserDto.lastname,
            email: normalizedEmail,
            aiExperienceLevel: createUserDto.aiExperienceLevel?.trim() || null,
            aiLearningGoals: normalizeStringArray(createUserDto.aiLearningGoals),
            aiUseAreas: normalizeStringArray(createUserDto.aiUseAreas),
            financeRole: createUserDto.financeRole?.trim() || null,
            avatarUrl: createUserDto.avatarUrl?.trim() || null,
            contactNumber: createUserDto.contactNumber?.trim() || null,
            companyCode: createUserDto.companyCode?.trim() || null,
            password: passwordHash,
            authProvider: AuthProvider.LOCAL,
            role: createRole,
            status: createUserDto.status || UserStatus.Active,
            // Admin-provisioned accounts receive credentials by email; skip self-signup verification.
            isVerified: true,
        });

        await this.userRepository.save(user);

        let temporaryPasswordEmailSent = false;
        try {
            const displayName =
                [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || user.username || '';
            await this.emailService.sendTemporaryPasswordEmail(
                user.email!,
                displayName,
                user.username!,
                plainPassword,
            );
            temporaryPasswordEmailSent = true;
        } catch (err) {
            console.error('[UserService] Failed to send temporary password email:', err);
        }

        const { password: _pw, ...userWithoutPassword } = user;
        return {
            message: temporaryPasswordEmailSent
                ? 'User created successfully. Temporary password sent to email.'
                : 'User created successfully, but the welcome email could not be sent. Share credentials manually or check SMTP settings.',
            user: userWithoutPassword as Omit<UserEntity, 'password'>,
            temporaryPasswordEmailSent,
        };
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<{ message: string; user: UserEntity }> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if email is being updated — allow same email on the other role only
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const updateEmailVerification = await verifyEmailAddress(updateUserDto.email);
            if (!updateEmailVerification.isValid) {
                throw new BadRequestException(
                    updateEmailVerification.reason || 'Please provide a valid real email address.',
                );
            }
            const targetRole = updateUserDto.role ?? user.role;
            await assertEmailAvailableForRole(
                this.userRepository,
                updateUserDto.email,
                targetRole,
                { excludeUserId: user.id },
            );
            user.email = normalizeEmail(updateUserDto.email);
        }

        // Check if username is being updated and if it already exists
        if (updateUserDto.username && updateUserDto.username !== user.username) {
            const normalizedUsername = this.normalizeUsername(updateUserDto.username);
            if (!normalizedUsername) {
                throw new BadRequestException('Username is required');
            }

            const existingUser = await this.userRepository
                .createQueryBuilder('user')
                .where('LOWER(user.username) = LOWER(:username)', { username: normalizedUsername })
                .andWhere('user.id != :id', { id: user.id })
                .getOne();
            if (existingUser) {
                throw new BadRequestException('Username already exists');
            }
            user.username = normalizedUsername;
        }

        // Update other fields if provided
        if (updateUserDto.firstname !== undefined) {
            user.firstname = updateUserDto.firstname;
        }
        if (updateUserDto.lastname !== undefined) {
            user.lastname = updateUserDto.lastname;
        }
        if (updateUserDto.avatarUrl !== undefined) {
            user.avatarUrl = updateUserDto.avatarUrl?.trim() || null;
        }
        if (updateUserDto.aiExperienceLevel !== undefined) {
            user.aiExperienceLevel = updateUserDto.aiExperienceLevel?.trim() || null;
        }
        if (updateUserDto.aiLearningGoals !== undefined) {
            user.aiLearningGoals = normalizeStringArray(updateUserDto.aiLearningGoals);
        }
        if (updateUserDto.aiUseAreas !== undefined) {
            user.aiUseAreas = normalizeStringArray(updateUserDto.aiUseAreas);
        }
        if (updateUserDto.financeRole !== undefined) {
            user.financeRole = updateUserDto.financeRole?.trim() || null;
            if (updateUserDto.persona === undefined) {
                user.persona = updateUserDto.financeRole?.trim() || null;
            }
        }
        if (updateUserDto.contactNumber !== undefined) {
            const trimmed = updateUserDto.contactNumber?.trim();
            user.contactNumber = trimmed ? trimmed : null;
        }
        if (updateUserDto.companyCode !== undefined) {
            const trimmed = updateUserDto.companyCode?.trim();
            user.companyCode = trimmed ? trimmed : null;
        }

        // Merge Salesforce-syncable profile fields into eligibilitySnapshot (source for updatebulkuserfornexus).
        const snapshotPatch: Record<string, unknown> = {};
        const trimOrEmpty = (value?: string) => String(value ?? '').trim();
        if (updateUserDto.salutation !== undefined) {
            snapshotPatch.salutation = trimOrEmpty(updateUserDto.salutation);
        }
        if (updateUserDto.nameAsPerId !== undefined) {
            const nameAsPerId = trimOrEmpty(updateUserDto.nameAsPerId);
            snapshotPatch.nameAsPerId = nameAsPerId;
            snapshotPatch.name_as_per_id = nameAsPerId;
        }
        if (updateUserDto.company !== undefined) {
            const company = trimOrEmpty(updateUserDto.company);
            snapshotPatch.company = company;
            snapshotPatch.companyName = company;

            // Keep cached Salesforce corporate display name in sync so list/details
            // do not keep showing the old accountName after a local edit.
            const existingRaw =
                user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
                    ? (user.salesforceUserInfoRaw as Record<string, unknown>)
                    : {};
            const existingCorporate =
                existingRaw.corporate && typeof existingRaw.corporate === 'object'
                    ? (existingRaw.corporate as Record<string, unknown>)
                    : {};
            user.salesforceUserInfoRaw = {
                ...existingRaw,
                company,
                companyName: company,
                corporate: {
                    ...existingCorporate,
                    accountName: company,
                    companyName: company,
                    name: company,
                },
            };
        }
        if (updateUserDto.department !== undefined) {
            snapshotPatch.department = trimOrEmpty(updateUserDto.department);
        }
        if (updateUserDto.jobFunction !== undefined) {
            const jobFunction = trimOrEmpty(updateUserDto.jobFunction);
            snapshotPatch.jobFunction = jobFunction;
            snapshotPatch.jobFunctionLabel = jobFunction;
        }
        if (updateUserDto.countryOfResidence !== undefined) {
            snapshotPatch.countryOfResidence = trimOrEmpty(updateUserDto.countryOfResidence);
        }
        if (Object.keys(snapshotPatch).length > 0) {
            const existingSnapshot =
                user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
                    ? (user.eligibilitySnapshot as Record<string, unknown>)
                    : {};
            user.eligibilitySnapshot = {
                ...existingSnapshot,
                ...snapshotPatch,
            };
        }

        if (updateUserDto.password) {
            // Hash new password
            user.password = await bcrypt.hash(updateUserDto.password, 10);
        }
        if (updateUserDto.role !== undefined) {
            if (updateUserDto.role !== user.role && user.email) {
                await assertEmailAvailableForRole(
                    this.userRepository,
                    user.email,
                    updateUserDto.role,
                    { excludeUserId: user.id },
                );
            }
            user.role = updateUserDto.role;
        }
        if (updateUserDto.status !== undefined) {
            user.status = updateUserDto.status;
        }
        if (updateUserDto.isVerified !== undefined) {
            user.isVerified = updateUserDto.isVerified;
        }

        await this.userRepository.save(user);

        // One user only — sync this accountId to Salesforce after local DB save.
        try {
            await this.syncSalesforceProfileAfterLocalUpdate(user);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to update Salesforce eServices profile.';
            this.logger.error(
                `[UserUpdate] Local DB saved but Salesforce sync failed for user ${user.id}: ${message}`,
            );
            throw new BadRequestException(
                `Profile saved locally, but Salesforce update failed: ${message}`,
            );
        }

        return {
            message: 'User updated successfully',
            user: this.withCompanyName(user),
        };
    }

    async delete(id: string): Promise<{ message: string }> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        await this.userRepository.remove(user);
        return { message: 'User deleted successfully' };
    }

    async verifyFeeWaiverJobRole(userId: string) {
        const user = await this.getById(userId);
        const existingSnapshot =
            user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
                ? user.eligibilitySnapshot
                : {};
        const existingAudit =
            typeof existingSnapshot.feeWaiverAudit === 'object' && existingSnapshot.feeWaiverAudit
                ? existingSnapshot.feeWaiverAudit
                : {};

        user.eligibilitySnapshot = {
            ...existingSnapshot,
            feeWaiverAudit: {
                ...existingAudit,
                status: 'admin_verified',
                verifiedAt: new Date().toISOString(),
                verifiedBy: 'admin',
                updatedAt: new Date().toISOString(),
            },
        };
        user.feeWaiverJobVerified = true;
        user.eligibilityCheckedAt = new Date();
        await this.userRepository.save(user);

        const { password, ...userWithoutPassword } = user;
        return {
            message: 'Fee-waiver job role marked as verified.',
            verified: true,
            user: userWithoutPassword,
        };
    }

    async rejectFeeWaiverJobRole(userId: string, reason?: string) {
        const user = await this.getById(userId);
        const existingSnapshot =
            user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
                ? user.eligibilitySnapshot
                : {};
        const existingAudit =
            typeof existingSnapshot.feeWaiverAudit === 'object' && existingSnapshot.feeWaiverAudit
                ? existingSnapshot.feeWaiverAudit
                : {};

        const rejectionReason = String(reason || '').trim() || 'Rejected by administrator.';

        user.eligibilitySnapshot = {
            ...existingSnapshot,
            feeWaiverAudit: {
                ...existingAudit,
                status: 'admin_rejected',
                verifiedAt: null,
                rejectedAt: new Date().toISOString(),
                verifiedBy: null,
                rejectedBy: 'admin',
                rejectionReason,
                updatedAt: new Date().toISOString(),
            },
        };
        user.feeWaiverJobVerified = false;
        user.eligibilityCheckedAt = new Date();
        await this.userRepository.save(user);

        const { password, ...userWithoutPassword } = user;
        return {
            message: 'Fee-waiver job role verification rejected.',
            verified: false,
            user: userWithoutPassword,
        };
    }

    async resendFeeWaiverHrVerification(userId: string, hrEmail: string) {
        await this.getById(userId);
        if (!String(hrEmail || '').trim()) {
            throw new BadRequestException('Please enter a valid HR email address.');
        }
        return this.authService.resendFeeWaiverHrVerificationEmail({
            userId,
            hrEmail,
            requestedBy: 'admin',
        });
    }
}
