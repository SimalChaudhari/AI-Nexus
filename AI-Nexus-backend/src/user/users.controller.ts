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
} from '@nestjs/common';
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

const DEFAULT_USERS_PAGE = 1;
const DEFAULT_USERS_LIMIT = 10;

@ApiTags('Users')
@ApiBearerAuth('bearer')
@Controller('users')
@UseGuards(SessionGuard,JwtAuthGuard, RolesGuard)
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly paginationService: PaginationService,
    ) { }
    @Get()
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'List all users' })
    async getAllUsers(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Res() response?: Response,
    ) {
        const normalizedStatus = this.paginationService.parseEnumQuery(status, UserStatus);

        const hasFilters = Boolean(page || limit || search || normalizedStatus);
        if (hasFilters) {
            const result = await this.userService.getAll({
                usePagination: true,
                page: this.paginationService.parsePositiveInteger(page, DEFAULT_USERS_PAGE),
                limit: this.paginationService.parsePositiveInteger(limit, DEFAULT_USERS_LIMIT),
                search: search?.trim() || undefined,
                status: normalizedStatus,
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

    // Profile endpoints - accessible to both User and Admin roles - must be before @Get(':id') to avoid route conflicts
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
    async createUser(
        @Body() createUserDto: Partial<UserDto>,
        @Res() response: Response,
    ) {
        const result = await this.userService.create(createUserDto);
        return response.status(HttpStatus.CREATED).json(result);
    }

    @Put('update/:id')
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Update a user by id' })
    @ApiBody({ type: UpdateUserDto })
    async updateUser(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
        @Res() response: Response,
    ) {
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
    async updateUserProfile(
        @Req() request: Request,
        @Body() updateUserDto: UpdateUserDto,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'User not authenticated',
            });
        }
        const userRole = request.user?.role;
        
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
