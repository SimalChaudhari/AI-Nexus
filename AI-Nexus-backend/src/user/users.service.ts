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

function generateTemporaryPassword(length = 14): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let out = '';
    for (let i = 0; i < length; i += 1) out += chars[crypto.randomInt(0, chars.length)];
    return out;
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
    ) { }

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
            .where('user.role != :adminRole', { adminRole: UserRole.Admin });

        if (status) {
            query.andWhere('user.status = :status', { status });
        }

        if (normalized.hasSearch) {
            query.andWhere(
                new Brackets((qb) => {
                    qb.where('user.firstname ILIKE :search', { search: `%${normalized.search}%` })
                        .orWhere('user.lastname ILIKE :search', { search: `%${normalized.search}%` })
                        .orWhere('user.username ILIKE :search', { search: `%${normalized.search}%` })
                        .orWhere('user.email ILIKE :search', { search: `%${normalized.search}%` });
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
        return this.userRepository.find({ where: { role: UserRole.User } });
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

        // Check if username already exists
        const existingUserByUsername = await this.userRepository.findOne({
            where: { username: createUserDto.username },
        });
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
            username: createUserDto.username,
            firstname: createUserDto.firstname,
            lastname: createUserDto.lastname,
            email: createUserDto.email,
            password: passwordHash,
            authProvider: AuthProvider.LOCAL,
            role: createUserDto.role || UserRole.User,
            status: createUserDto.status || UserStatus.Active,
            isVerified: false,
        });

        await this.userRepository.save(user);

        let temporaryPasswordEmailSent = false;
        try {
            const displayName =
                [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || user.username;
            await this.emailService.sendTemporaryPasswordEmail(
                user.email,
                displayName,
                user.username,
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
            const existingUser = await this.userRepository.findOne({
                where: { username: updateUserDto.username },
            });
            if (existingUser) {
                throw new BadRequestException('Username already exists');
            }
            user.username = updateUserDto.username;
        }

        // Update other fields if provided
        if (updateUserDto.firstname !== undefined) {
            user.firstname = updateUserDto.firstname;
        }
        if (updateUserDto.lastname !== undefined) {
            user.lastname = updateUserDto.lastname;
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
}
