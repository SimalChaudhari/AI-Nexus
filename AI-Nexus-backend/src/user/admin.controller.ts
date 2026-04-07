//admin.controller.ts
import {
    Controller,
    HttpStatus,
    Get,
    Put,
    Body,
    Res,
    UseGuards,
    Req,
} from '@nestjs/common';
import { UserRole } from './users.entity';
import { Response, Request } from 'express';
import { UserService } from './users.service';
import { UpdateUserDto } from './users.dto';
import { JwtAuthGuard } from './../jwt/jwt-auth.guard';
import { RolesGuard } from './../jwt/roles.guard';
import { Roles } from './../jwt/roles.decorator';
import { SessionGuard } from './../jwt/session.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Controller('admin')
@UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
export class AdminController {
    constructor(private readonly userService: UserService) {}

    // Profile endpoints for Admin role
    @Get('profile')
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Get current admin profile' })
    async getAdminProfile(@Req() request: Request, @Res() response: Response) {
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

    @Put('profile')
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Update current admin profile' })
    @ApiBody({ type: UpdateUserDto })
    async updateAdminProfile(
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
        // Admins can update their own profile including role and status
        const result = await this.userService.update(userId, updateUserDto);
        return response.status(HttpStatus.OK).json(result);
    }
}

