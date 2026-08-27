//users.controller.ts
import {
    Controller,
    HttpStatus,
    Param,
    Get,
    Post,
    Delete,
    Put,
    Body,
    Res,
    Query,
    UseGuards,
    Req,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole, UserStatus } from './users.entity';
import { Response, Request } from 'express';
import { UserPaginatedListResult, UserService } from './users.service';
import { UpdateUserDto, UserDto } from './users.dto';
import { JwtAuthGuard } from './../jwt/jwt-auth.guard';
import { RolesGuard } from './../jwt/roles.guard';
import { Roles } from './../jwt/roles.decorator';
import { SessionGuard } from './../jwt/session.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationService } from '../common/pagination/pagination.service';
import { memoryStorage } from 'multer';
import { LocalStorageService } from '../service/local-storage.service';

const DEFAULT_USERS_PAGE = 1;
const DEFAULT_USERS_LIMIT = 10;
const USER_AVATAR_MAX_SIZE = (Number(process.env.UPLOAD_IMAGE_MAX_MB) || 10) * 1024 * 1024;
const USER_AVATAR_FILE_TYPE = /(jpg|jpeg|png|gif|webp)$/;

@ApiTags('Users')
@ApiBearerAuth('bearer')
@Controller('users')
@UseGuards(SessionGuard,JwtAuthGuard, RolesGuard)
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly paginationService: PaginationService,
        private readonly localStorageService: LocalStorageService,
    ) { }
    @Get()
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'List all users' })
    async getAllUsers(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('role') role?: string,
        @Query('progressFilter') progressFilter?: string,
        @Res() response?: Response,
    ) {
        const normalizedStatus = this.paginationService.parseEnumQuery(status, UserStatus);
        const normalizedRole = this.paginationService.parseEnumQuery(role, UserRole);
        const normalizedProgressFilter = this.userService.parseProgressFilter(progressFilter);

        const hasFilters = Boolean(
            page ||
                limit ||
                search ||
                normalizedStatus ||
                normalizedRole ||
                normalizedProgressFilter,
        );
        if (hasFilters) {
            const result = await this.userService.getAll({
                usePagination: true,
                page: this.paginationService.parsePositiveInteger(page, DEFAULT_USERS_PAGE),
                limit: this.paginationService.parsePositiveInteger(limit, DEFAULT_USERS_LIMIT),
                search: search?.trim() || undefined,
                status: normalizedStatus,
                role: normalizedRole,
                progressFilter: normalizedProgressFilter,
            });

            const paginated = result as UserPaginatedListResult;

            return response!.status(HttpStatus.OK).json({
                length: paginated.data.length,
                data: paginated.data,
                pagination: paginated.pagination,
            });
        }

        const users = (await this.userService.getAll()) as Awaited<ReturnType<UserService['findAllUsers']>>;
        return response!.status(HttpStatus.OK).json({
            length: users.length,
            data: users,
        });
    }

    @Get('export')
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Export users CSV with selected fields and optional progress filters' })
    async exportUsers(
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('role') role?: string,
        @Query('progressFilter') progressFilter?: string,
        @Query('fields') fields?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Res() response?: Response,
    ) {
        const normalizedStatus = this.paginationService.parseEnumQuery(status, UserStatus);
        const normalizedRole = this.paginationService.parseEnumQuery(role, UserRole);
        const normalizedProgressFilter = this.userService.parseProgressFilter(progressFilter);
        const { filename, csv } = await this.userService.exportUsersCsv({
            search: search?.trim() || undefined,
            status: normalizedStatus,
            role: normalizedRole,
            progressFilter: normalizedProgressFilter,
            fields,
            from,
            to,
        });

        response!.setHeader('Content-Type', 'text/csv; charset=utf-8');
        response!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return response!.status(HttpStatus.OK).send(csv);
    }

    @Get('profile')
    @Roles(UserRole.User, UserRole.Admin)
    @ApiOperation({ summary: 'Get current user profile' })
    async getUserProfile(@Req() request: Request, @Res() response: Response) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'User not authenticated',
            });
        }
        const user = await this.userService.getById(userId);
        const { password, ...userWithoutPassword } = user;
        return response.status(HttpStatus.OK).json({
            data: userWithoutPassword,
        });
    }

    @Put('fee-waiver-job-verify/:id')
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Manually verify fee-waiver job role for a learner (admin)' })
    async verifyFeeWaiverJobRole(@Param('id') id: string, @Res() response: Response) {
        const result = await this.userService.verifyFeeWaiverJobRole(id);
        return response.status(HttpStatus.OK).json(result);
    }

    @Put('fee-waiver-job-reject/:id')
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Reject fee-waiver job role verification for a learner (admin)' })
    async rejectFeeWaiverJobRole(
        @Param('id') id: string,
        @Body('reason') reason: string,
        @Res() response: Response,
    ) {
        const result = await this.userService.rejectFeeWaiverJobRole(id, reason);
        return response.status(HttpStatus.OK).json(result);
    }

    @Put('fee-waiver-resend-hr/:id')
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Send or resend HR verification email for a learner (admin)' })
    async resendFeeWaiverHrVerification(
        @Param('id') id: string,
        @Body('hrEmail') hrEmail: string,
        @Res() response: Response,
    ) {
        const result = await this.userService.resendFeeWaiverHrVerification(id, hrEmail);
        return response.status(HttpStatus.OK).json(result);
    }

    @Get(':id')
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Get user details by id' })
    async getUserById(@Param('id') id: string, @Res() response: Response) {
        const user = await this.userService.getById(id);
        return response.status(HttpStatus.OK).json({
            data: user,
        });
    }

    @Post()
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Create a new user' })
    @ApiBody({ type: UserDto })
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: memoryStorage(),
            limits: { fileSize: USER_AVATAR_MAX_SIZE },
        }),
    )
    async createUser(
        @Body() createUserDto: Partial<UserDto>,
        @Res() response: Response,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [
                    new MaxFileSizeValidator({ maxSize: USER_AVATAR_MAX_SIZE }),
                    new FileTypeValidator({ fileType: USER_AVATAR_FILE_TYPE }),
                ],
            }),
        )
        avatar: Express.Multer.File | undefined,
    ) {
        if (avatar) {
            createUserDto.avatarUrl = await this.localStorageService.saveFile(avatar, 'users');
        }
        const result = await this.userService.create(createUserDto);
        return response.status(HttpStatus.CREATED).json(result);
    }

    @Put('update/:id')
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Update a user by id' })
    @ApiBody({ type: UpdateUserDto })
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: memoryStorage(),
            limits: { fileSize: USER_AVATAR_MAX_SIZE },
        }),
    )
    async updateUser(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
        @Res() response: Response,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [
                    new MaxFileSizeValidator({ maxSize: USER_AVATAR_MAX_SIZE }),
                    new FileTypeValidator({ fileType: USER_AVATAR_FILE_TYPE }),
                ],
            }),
        )
        avatar: Express.Multer.File | undefined,
    ) {
        const existingUser = await this.userService.getById(id);
        if (avatar) {
            await this.localStorageService.deleteFileByUrl(existingUser.avatarUrl);
            updateUserDto.avatarUrl = await this.localStorageService.saveFile(avatar, 'users');
        } else if (updateUserDto.avatarUrl === '') {
            await this.localStorageService.deleteFileByUrl(existingUser.avatarUrl);
        }
        const result = await this.userService.update(id, updateUserDto);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('delete/:id')
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Delete a user by id' })
    async deleteUser(@Param('id') id: string, @Res() response: Response) {
        const result = await this.userService.delete(id);
        return response.status(HttpStatus.OK).json(result);
    }

    // Profile update endpoint - accessible to both User and Admin roles - must be before @Put('update/:id') to avoid route conflicts
    @Put('profile')
    @Roles(UserRole.User, UserRole.Admin)
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiBody({ type: UpdateUserDto })
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: memoryStorage(),
            limits: { fileSize: USER_AVATAR_MAX_SIZE },
        }),
    )
    async updateUserProfile(
        @Req() request: Request,
        @Body() updateUserDto: UpdateUserDto,
        @Res() response: Response,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [
                    new MaxFileSizeValidator({ maxSize: USER_AVATAR_MAX_SIZE }),
                    new FileTypeValidator({ fileType: USER_AVATAR_FILE_TYPE }),
                ],
            }),
        )
        avatar: Express.Multer.File | undefined,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'User not authenticated',
            });
        }
        const userRole = request.user?.role;
        const existingUser = await this.userService.getById(userId);

        if (avatar) {
            await this.localStorageService.deleteFileByUrl(existingUser.avatarUrl);
            updateUserDto.avatarUrl = await this.localStorageService.saveFile(avatar, 'users');
        } else if (updateUserDto.avatarUrl === '') {
            await this.localStorageService.deleteFileByUrl(existingUser.avatarUrl);
        }
        
        // If user is Admin, allow updating role and status. If User, prevent changing role/status
        if (userRole === UserRole.Admin) {
            // Admin can update everything including role and status
            const result = await this.userService.update(userId, updateUserDto);
            return response.status(HttpStatus.OK).json(result);
        } else {
            // Regular users cannot change their role or status
            const { role, status, ...safeUpdateDto } = updateUserDto;
            const result = await this.userService.update(userId, safeUpdateDto);
            return response.status(HttpStatus.OK).json(result);
        }
    }

}
