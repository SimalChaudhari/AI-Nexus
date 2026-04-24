import {
    Controller,
    HttpStatus,
    Param,
    Get,
    Post,
    Delete,
    Put,
    Body,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import { UserRole } from '../user/users.entity';
import { Response } from 'express';
import { TagService } from './tags.service';
import { CreateTagDto, UpdateTagDto } from './tags.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationService } from '../common/pagination/pagination.service';
import { TagPaginatedListResult } from './tags.service';

const DEFAULT_TAGS_PAGE = 1;
const DEFAULT_TAGS_LIMIT = 10;

@ApiTags('Tags')
@Controller('tags')
export class TagController {
    private readonly baseUrl: string;

    constructor(
        private readonly tagService: TagService,
        private readonly paginationService: PaginationService
    ) {
        this.baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    }

    @Get()
    @ApiOperation({ summary: 'List all tags' })
    async getAllTags(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Res() response?: Response
    ) {
        const hasFilters = Boolean(page || limit || search);
        if (hasFilters) {
            const result = await this.tagService.getAll({
                usePagination: true,
                page: this.paginationService.parsePositiveInteger(page, DEFAULT_TAGS_PAGE),
                limit: this.paginationService.parsePositiveInteger(limit, DEFAULT_TAGS_LIMIT),
                search: search?.trim() || undefined,
            });
            const paginated = result as TagPaginatedListResult;
            return response!.status(HttpStatus.OK).json({
                length: paginated.data.length,
                data: paginated.data,
                pagination: paginated.pagination,
            });
        }

        const tags = (await this.tagService.getAll()) as TagPaginatedListResult['data'];
        return response!.status(HttpStatus.OK).json({
            length: tags.length,
            data: tags,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get tag details by id' })
    async getTagById(@Param('id') id: string, @Res() response: Response) {
        const tag = await this.tagService.getById(id);
        return response.status(HttpStatus.OK).json({
            data: tag,
        });
    }

    @Post()
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Create a tag' })
    @ApiBody({ type: CreateTagDto })
    async createTag(
        @Body() createTagDto: CreateTagDto,
        @Res() response: Response,
    ) {
        const result = await this.tagService.create(createTagDto);
        return response.status(HttpStatus.CREATED).json(result);
    }

    @Put('update/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update a tag' })
    @ApiBody({ type: UpdateTagDto })
    async updateTag(
        @Param('id') id: string,
        @Body() updateTagDto: UpdateTagDto,
        @Res() response: Response,
    ) {
        const result = await this.tagService.update(id, updateTagDto);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('delete/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete a tag' })
    async deleteTag(@Param('id') id: string, @Res() response: Response) {
        const result = await this.tagService.delete(id);
        return response.status(HttpStatus.OK).json(result);
    }
}

