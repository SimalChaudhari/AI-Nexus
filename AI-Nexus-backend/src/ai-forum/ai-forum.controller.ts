import {
    Controller,
    HttpStatus,
    Param,
    Get,
    Query,
    Post,
    Delete,
    Put,
    Body,
    Res,
    UseGuards,
    Req,
} from '@nestjs/common';
import { UserRole } from '../user/users.entity';
import { Response, Request } from 'express';
import { AiForumService } from './ai-forum.service';
import { CreateAiForumPostDto, UpdateAiForumPostDto, CreateAiForumCommentDto, UpdateAiForumCommentDto } from './ai-forum.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parseBooleanQuery, parsePositiveInteger } from '../common/pagination/paginated-list.util';

@ApiTags('AiForumPosts')
@Controller('posts')
export class AiForumController {
    constructor(private readonly postService: AiForumService) {}

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'List posts with pagination and optional filters' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
    @ApiQuery({ name: 'search', required: false, description: 'Search in title and description' })
    @ApiQuery({ name: 'isPinned', required: false, description: 'Filter by current user pinned status', example: true })
    async getAllAiForumPosts(
        @Req() request: Request,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('isPinned') isPinned?: string,
        @Res() response?: Response,
    ) {
        const userId = request.user?.id;
        const result = await this.postService.getAllPaginated({
            userId,
            page: parsePositiveInteger(page, 1),
            limit: parsePositiveInteger(limit, 10),
            search,
            isPinned: parseBooleanQuery(isPinned),
        });
        return response!.status(HttpStatus.OK).json({
            length: result.data.length,
            data: result.data,
            pagination: result.pagination,
        });
    }

    @Post(':id/view')
    @ApiOperation({ summary: 'Increment post view count' })
    async incrementViewCount(@Param('id') id: string, @Res() response: Response) {
        const post = await this.postService.incrementViewCount(id);
        return response.status(HttpStatus.OK).json({
            message: 'View count incremented',
            data: post,
        });
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Get post details by id' })
    async getAiForumPostById(@Param('id') id: string, @Req() request: Request, @Res() response: Response) {
        const userId = request.user?.id;
        const post = await this.postService.getById(id, userId);
        return response.status(HttpStatus.OK).json({
            data: post,
        });
    }

    @Post()
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Create a post' })
    @ApiBody({ type: CreateAiForumPostDto })
    async createAiForumPost(
        @Body() createAiForumPostDto: CreateAiForumPostDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        const result = await this.postService.create(createAiForumPostDto, userId);
        return response.status(HttpStatus.CREATED).json(result);
    }

    @Put('update/:id')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update a post' })
    @ApiBody({ type: UpdateAiForumPostDto })
    async updateAiForumPost(
        @Param('id') id: string,
        @Body() updateAiForumPostDto: UpdateAiForumPostDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const isAdmin = request.user?.role === UserRole.Admin;
        const userId = isAdmin ? undefined : request.user?.id;
        const result = await this.postService.update(id, updateAiForumPostDto, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('delete/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete a post' })
    async deleteAiForumPost(@Param('id') id: string, @Res() response: Response) {
        const result = await this.postService.delete(id);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post(':id/comments')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Add a comment to a post' })
    @ApiBody({ type: CreateAiForumCommentDto })
    async addComment(
        @Param('id') postId: string,
        @Body() createCommentDto: CreateAiForumCommentDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'User not authenticated',
            });
        }
        const result = await this.postService.addComment(postId, userId, createCommentDto);
        return response.status(HttpStatus.CREATED).json(result);
    }

    @Get(':id/comments')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'List comments for a post' })
    async getComments(
        @Param('id') postId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        const comments = await this.postService.getComments(postId, userId);
        return response.status(HttpStatus.OK).json({
            length: comments.length,
            data: comments,
        });
    }

    @Put('comments/update/:id')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update a post comment' })
    @ApiBody({ type: UpdateAiForumCommentDto })
    async updateComment(
        @Param('id') commentId: string,
        @Body() updateCommentDto: UpdateAiForumCommentDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({
                message: 'User not authenticated',
            });
        }
        const result = await this.postService.updateComment(commentId, userId, updateCommentDto);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('comments/delete/:id')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete a post comment' })
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
        const result = await this.postService.deleteComment(commentId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post('comments/:id/like')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Like a post comment' })
    async likeComment(
        @Param('id') commentId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
        }
        const result = await this.postService.likeComment(commentId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('comments/:id/like')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Unlike a post comment' })
    async unlikeComment(
        @Param('id') commentId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
        }
        const result = await this.postService.unlikeComment(commentId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post('comments/:id/toggle-like')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Toggle like on a post comment' })
    async toggleCommentLike(
        @Param('id') commentId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
        }
        const result = await this.postService.toggleCommentLike(commentId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post(':id/pin')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Pin a post for current user' })
    async pinAiForumPost(
        @Param('id') postId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
        }
        const result = await this.postService.pinAiForumPost(postId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete(':id/pin')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Unpin a post for current user' })
    async unpinAiForumPost(
        @Param('id') postId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
        }
        const result = await this.postService.unpinAiForumPost(postId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post(':id/toggle-pin')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Toggle pinned state on a post' })
    async togglePinAiForumPost(
        @Param('id') postId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = request.user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'User not authenticated' });
        }
        const result = await this.postService.togglePinAiForumPost(postId, userId);
        return response.status(HttpStatus.OK).json(result);
    }

}

