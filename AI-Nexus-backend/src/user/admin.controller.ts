//admin.controller.ts
import {
    Controller,
    HttpStatus,
    Get,
    Put,
    Post,
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
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { LocalStorageService } from '../service/local-storage.service';
import { AdminEnrolmentService } from './admin-enrolment.service';
import { AdminEnrolmentApplyDto } from './admin-enrolment.dto';

const USER_AVATAR_MAX_SIZE = (Number(process.env.UPLOAD_IMAGE_MAX_MB) || 10) * 1024 * 1024;
const USER_AVATAR_FILE_TYPE = /(jpg|jpeg|png|gif|webp)$/;
const ENROLMENT_EXCEL_MAX_SIZE = 25 * 1024 * 1024;
const enrolmentExcelFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
    const name = String(file?.originalname || '');
    const allowedExt = /\.(xlsx|xls)$/i.test(name);
    const mime = String(file?.mimetype || '');
    const allowedMime =
        !mime
        || /^(application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/octet-stream)$/i.test(
            mime,
        );
    if (!allowedExt || !allowedMime) {
        cb(new Error('Only .xlsx or .xls files are allowed') as any, false);
        return;
    }
    cb(null, true);
};

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Controller('admin')
@UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
export class AdminController {
    constructor(
        private readonly userService: UserService,
        private readonly localStorageService: LocalStorageService,
        private readonly adminEnrolmentService: AdminEnrolmentService,
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

    @Post('enrolment/preview')
    @Roles(UserRole.Admin)
    @ApiOperation({
        summary: 'Parse bulk enrolment Excel, map fields, and verify with AI before saving users',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['file', 'companyCode', 'companyName'],
            properties: {
                file: { type: 'string', format: 'binary' },
                companyCode: { type: 'string' },
                companyName: { type: 'string' },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: ENROLMENT_EXCEL_MAX_SIZE },
            fileFilter: enrolmentExcelFileFilter,
        }),
    )
    async previewEnrolment(
        @UploadedFile() file: Express.Multer.File,
        @Body('companyCode') companyCode: string,
        @Body('companyName') companyName: string,
        @Res() response: Response,
    ) {
        const data = await this.adminEnrolmentService.preview({
            file,
            companyCode,
            companyName,
        });
        return response.status(HttpStatus.OK).json({ data });
    }

    @Post('enrolment/apply')
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Apply previewed bulk enrolment rows (insert missing, fill empty existing fields)' })
    async applyEnrolment(@Body() body: AdminEnrolmentApplyDto, @Res() response: Response) {
        const data = await this.adminEnrolmentService.apply({
            companyCode: body.companyCode,
            companyName: body.companyName,
            rows: Array.isArray(body.rows) ? (body.rows as any[]) : [],
        });
        return response.status(HttpStatus.OK).json({ data });
    }
}

