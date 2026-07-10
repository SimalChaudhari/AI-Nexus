//users.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserEntity, UserRole, UserStatus, AuthProvider } from './users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
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
    usePagination?: boolean;
};

export type UserPaginatedListResult = PaginatedResultWithMeta<UserEntity, { status: UserStatus | null }>;

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        private readonly emailService: EmailService,
        private readonly paginationService: PaginationService,
        private readonly authService: AuthService,
    ) { }

    private normalizeUsername(username: string): string {
        return username.trim().toLowerCase();
    }

    async getAll(queryOptions?: UserListQueryOptions): Promise<UserEntity[] | UserPaginatedListResult> {
        const usePagination = Boolean(queryOptions?.usePagination);
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

        const query = this.userRepository
            .createQueryBuilder('user')
            .where('user.role != :adminRole', { adminRole: UserRole.Admin })
            .andWhere('user.isDraft = :isDraft', { isDraft: false });

        if (status) {
            query.andWhere('user.status = :status', { status });
        }

        if (normalized.hasSearch) {
            query.andWhere(
                new Brackets((qb) => {
                    qb.where('user.firstname ILIKE :search', { search: `%${normalized.search}%` })
                        .orWhere('user.lastname ILIKE :search', { search: `%${normalized.search}%` })
                        .orWhere('user.username ILIKE :search', { search: `%${normalized.search}%` })
                        .orWhere('user.email ILIKE :search', { search: `%${normalized.search}%` })
                        .orWhere('user.contactNumber ILIKE :search', { search: `%${normalized.search}%` });
                }),
            );
        }

        query.orderBy('user.createdAt', 'DESC');

        if (!usePagination) {
            return query.getMany();
        }

        const paginated = await this.paginationService.paginateQueryBuilder({
            queryBuilder: query,
            page: normalized.page,
            limit: normalized.limit,
            search: normalized.hasSearch ? normalized.search : null,
        });

        return {
            data: paginated.data,
            pagination: {
                ...paginated.pagination,
                status: status ?? null,
            },
        };
    }

    async findAllUsers(): Promise<UserEntity[]> {
        return this.userRepository.find({ where: { role: UserRole.User, isDraft: false } });
    }

    async getById(id: string): Promise<UserEntity> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException("User not found");
        }
        return user;
    }

    async create(createUserDto: Partial<UserDto>): Promise<{
        message: string;
        user: Omit<UserEntity, 'password'>;
        temporaryPasswordEmailSent: boolean;
    }> {
        // Check if email already exists
        const existingUserByEmail = await this.userRepository.findOne({
            where: { email: createUserDto.email },
        });
        if (existingUserByEmail) {
            throw new BadRequestException('Email already exists');
        }

        const normalizedUsername = this.normalizeUsername(createUserDto.username || '');
        if (!normalizedUsername) {
            throw new BadRequestException('Username is required');
        }
        if (!/^(?=.*[a-z])(?=.*\d)[a-z0-9]+$/i.test(normalizedUsername)) {
            throw new BadRequestException(
                'Username must contain both letters and numbers, and no special characters.',
            );
        }
        if (!createUserDto.email) {
            throw new BadRequestException('Email is required');
        }
        const createEmailVerification = await verifyEmailAddress(createUserDto.email);
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
            email: createUserDto.email,
            aiExperienceLevel: createUserDto.aiExperienceLevel?.trim() || null,
            aiLearningGoals: normalizeStringArray(createUserDto.aiLearningGoals),
            aiUseAreas: normalizeStringArray(createUserDto.aiUseAreas),
            financeRole: createUserDto.financeRole?.trim() || null,
            avatarUrl: createUserDto.avatarUrl?.trim() || null,
            contactNumber: createUserDto.contactNumber?.trim() || null,
            companyCode: createUserDto.companyCode?.trim() || null,
            password: passwordHash,
            authProvider: AuthProvider.LOCAL,
            role: createUserDto.role || UserRole.User,
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

        // Check if email is being updated and if it already exists
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const updateEmailVerification = await verifyEmailAddress(updateUserDto.email);
            if (!updateEmailVerification.isValid) {
                throw new BadRequestException(
                    updateEmailVerification.reason || 'Please provide a valid real email address.',
                );
            }
            const existingUser = await this.userRepository.findOne({
                where: { email: updateUserDto.email },
            });
            if (existingUser) {
                throw new BadRequestException('Email already exists');
            }
            user.email = updateUserDto.email;
        }

        // Check if username is being updated and if it already exists
        if (updateUserDto.username && updateUserDto.username !== user.username) {
            const normalizedUsername = this.normalizeUsername(updateUserDto.username);
            if (!/^(?=.*[a-z])(?=.*\d)[a-z0-9]+$/i.test(normalizedUsername)) {
                throw new BadRequestException(
                    'Username must contain both letters and numbers, and no special characters.',
                );
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
        if (updateUserDto.password) {
            // Hash new password
            user.password = await bcrypt.hash(updateUserDto.password, 10);
        }
        if (updateUserDto.role !== undefined) {
            user.role = updateUserDto.role;
        }
        if (updateUserDto.status !== undefined) {
            user.status = updateUserDto.status;
        }
        if (updateUserDto.isVerified !== undefined) {
            user.isVerified = updateUserDto.isVerified;
        }

        await this.userRepository.save(user);
        return {
            message: 'User updated successfully',
            user: user,
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
