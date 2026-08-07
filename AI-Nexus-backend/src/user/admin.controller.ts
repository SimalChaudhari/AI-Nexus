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
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from './users.entity';
import { Response, Request } from 'express';
import { UserService } from './users.service';
import { UpdateUserDto, AdminUpdateProfileDto } from './users.dto';
import { JwtAuthGuard } from './../jwt/jwt-auth.guard';
import { RolesGuard } from './../jwt/roles.guard';
import { Roles } from './../jwt/roles.decorator';
import { SessionGuard } from './../jwt/session.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { LocalStorageService } from '../service/local-storage.service';

const USER_AVATAR_MAX_SIZE = (Number(process.env.UPLOAD_IMAGE_MAX_MB) || 10) * 1024 * 1024;
const USER_AVATAR_FILE_TYPE = /(jpg|jpeg|png|gif|webp)$/;

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Controller('admin')
@UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
export class AdminController {
    constructor(
        private readonly userService: UserService,
        private readonly localStorageService: LocalStorageService,
    ) {}

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
    @ApiBody({ type: AdminUpdateProfileDto })
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: memoryStorage(),
            limits: { fileSize: USER_AVATAR_MAX_SIZE },
        }),
    )
    async updateAdminProfile(
        @Req() request: Request,
        @Body() updateUserDto: AdminUpdateProfileDto,
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
        const existingUser = await this.userService.getById(userId);
        if (avatar) {
            await this.localStorageService.deleteFileByUrl(existingUser.avatarUrl);
            updateUserDto.avatarUrl = await this.localStorageService.saveFile(avatar, 'users');
        } else if (updateUserDto.avatarUrl === '') {
            await this.localStorageService.deleteFileByUrl(existingUser.avatarUrl);
        }
        // Admins can update their own profile including role and status
        const result = await this.userService.update(userId, updateUserDto);
        return response.status(HttpStatus.OK).json(result);
    }
}

