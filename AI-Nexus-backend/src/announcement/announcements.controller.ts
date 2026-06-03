import {
    Controller,
    FileTypeValidator,
    HttpStatus,
    MaxFileSizeValidator,
    ParseFilePipe,
    Param,
    Get,
    Query,
    Post,
    Delete,
    Put,
    Body,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    Req,
} from '@nestjs/common';
import { UserRole } from '../user/users.entity';
import { Response, Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AnnouncementService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto, CreateCommentDto, UpdateCommentDto } from './announcements.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaginationService } from '../common/pagination/pagination.service';
import { LocalStorageService } from '../service/local-storage.service';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementController {
    constructor(
        private readonly announcementService: AnnouncementService,
        private readonly localStorageService: LocalStorageService,
        private readonly paginationService: PaginationService,
    ) {}

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'List announcements with pagination and optional filters' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
    @ApiQuery({ name: 'search', required: false, description: 'Search in title and description' })
    @ApiQuery({ name: 'isPinned', required: false, description: 'Filter by current user pinned status', example: true })
    async getAllAnnouncements(
        @Req() request: Request,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('isPinned') isPinned?: string,
        @Res() response?: Response,
    ) {
        const userId = request.user?.id;
        const normalizedIsPinned = this.paginationService.parseBooleanQuery(isPinned);
        const hasFilters = Boolean(page || limit || search || normalizedIsPinned !== undefined);

        if (hasFilters) {
            const result = await this.announcementService.getAll({
                userId,
                usePagination: true,
                page: this.paginationService.parsePositiveInteger(page, 1),
                limit: this.paginationService.parsePositiveInteger(limit, 10),
                search,
                isPinned: normalizedIsPinned,
            });
            const paginated = result as Awaited<ReturnType<AnnouncementService['getAllPaginated']>>;
            const parsedPage = this.paginationService.parsePositiveInteger(page, 1);
            const parsedLimit = this.paginationService.parsePositiveInteger(limit, 10);
            const offset = (parsedPage - 1) * parsedLimit;
            const correctedData =
                Array.isArray(paginated.data) && paginated.data.length > parsedLimit
                    ? paginated.data.slice(offset, offset + parsedLimit)
                    : paginated.data;
            return response!.status(HttpStatus.OK).json({
                length: correctedData.length,
                data: correctedData,
                pagination: paginated.pagination,
            });
        }

        const announcements = (await this.announcementService.getAll({ userId })) as any[];
        return response!.status(HttpStatus.OK).json({
            length: announcements.length,
            data: announcements,
        });
    }

    @Post(':id/view')
    @ApiOperation({ summary: 'Increment announcement view count' })
    async incrementViewCount(@Param('id') id: string, @Res() response: Response) {
        const announcement = await this.announcementService.incrementViewCount(id);
        return response.status(HttpStatus.OK).json({
            message: 'View count incremented',
            data: announcement,
        });
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Get announcement details by id' })
    async getAnnouncementById(
        @Param('id') id: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        const announcement = await this.announcementService.getById(id, userId);
        return response.status(HttpStatus.OK).json({
            data: announcement,
        });
    }

    @Post()
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Create an announcement' })
    @ApiBody({ type: CreateAnnouncementDto })
    async createAnnouncement(
        @Body() createAnnouncementDto: CreateAnnouncementDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const createdById = request.user?.id;
        const result = await this.announcementService.create(createAnnouncementDto, createdById);
        return response.status(HttpStatus.CREATED).json(result);
    }

    @Post('upload-media')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload announcement media (images/documents) for posts and comments' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 50 * 1024 * 1024 },
        }),
    )
    async uploadAnnouncementMedia(
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: true,
                validators: [
                    new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
                    new FileTypeValidator({
                        fileType:
                            /^(image\/(jpeg|png|gif|webp|svg\+xml)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i,
                    }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Res() response: Response,
    ) {
        const url = await this.localStorageService.saveFile(file, 'announcements');
        return response.status(HttpStatus.OK).json({ url });
    }

    @Put('update/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update an announcement' })
    @ApiBody({ type: UpdateAnnouncementDto })
    async updateAnnouncement(
        @Param('id') id: string,
        @Body() updateAnnouncementDto: UpdateAnnouncementDto,
        @Res() response: Response,
    ) {
        const result = await this.announcementService.update(id, updateAnnouncementDto);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('delete/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete an announcement' })
    async deleteAnnouncement(@Param('id') id: string, @Res() response: Response) {
        const result = await this.announcementService.delete(id);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post(':id/comments')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Add a comment to an announcement' })
    @ApiBody({ type: CreateCommentDto })
    async addComment(
        @Param('id') announcementId: string,
        @Body() createCommentDto: CreateCommentDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'User not authenticated',
            });
        }
        const result = await this.announcementService.addComment(announcementId, userId, createCommentDto);
        return response.status(HttpStatus.CREATED).json(result);
    }

    @Get(':id/comments')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'List comments for an announcement' })
    async getComments(
        @Param('id') announcementId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        const comments = await this.announcementService.getComments(announcementId, userId);
        return response.status(HttpStatus.OK).json({
            length: comments.length,
            data: comments,
        });
    }

    @Put('comments/update/:id')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update an announcement comment' })
    @ApiBody({ type: UpdateCommentDto })
    async updateComment(
        @Param('id') commentId: string,
        @Body() updateCommentDto: UpdateCommentDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'User not authenticated',
            });
        }
        const result = await this.announcementService.updateComment(commentId, userId, updateCommentDto);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('comments/delete/:id')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete an announcement comment' })
    async deleteComment(
        @Param('id') commentId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'User not authenticated',
            });
        }
        const result = await this.announcementService.deleteComment(commentId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post('comments/:id/like')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Like an announcement comment' })
    async likeComment(
        @Param('id') commentId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
        }
        const result = await this.announcementService.likeComment(commentId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('comments/:id/like')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Unlike an announcement comment' })
    async unlikeComment(
        @Param('id') commentId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
        }
        const result = await this.announcementService.unlikeComment(commentId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post('comments/:id/toggle-like')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Toggle like on an announcement comment' })
    async toggleCommentLike(
        @Param('id') commentId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
        }
        const result = await this.announcementService.toggleCommentLike(commentId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post(':id/pin')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Pin an announcement for current user' })
    async pinAnnouncement(
        @Param('id') announcementId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'User not authenticated',
            });
        }
        const result = await this.announcementService.pinAnnouncement(announcementId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete(':id/pin')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Unpin an announcement for current user' })
    async unpinAnnouncement(
        @Param('id') announcementId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'User not authenticated',
            });
        }
        const result = await this.announcementService.unpinAnnouncement(announcementId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post(':id/toggle-pin')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Toggle pinned status for current user' })
    async togglePinAnnouncement(
        @Param('id') announcementId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'User not authenticated',
            });
        }
        const result = await this.announcementService.togglePinAnnouncement(announcementId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

}
