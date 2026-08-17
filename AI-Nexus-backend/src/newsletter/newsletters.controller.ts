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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '../user/users.entity';
import { Response } from 'express';
import { NewsletterService, NewsletterPaginatedListResult } from './newsletters.service';
import { CreateNewsletterDto, UpdateNewsletterDto } from './newsletters.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationService } from '../common/pagination/pagination.service';

const DEFAULT_NEWSLETTERS_PAGE = 1;
const DEFAULT_NEWSLETTERS_LIMIT = 10;
const NEWSLETTER_FILE_LIMIT = 50 * 1024 * 1024;

@ApiTags('Newsletters')
@Controller('newsletters')
export class NewsletterController {
  constructor(
    private readonly newsletterService: NewsletterService,
    private readonly paginationService: PaginationService,
  ) {}

  private async listNewsletters(
    response: Response,
    options: {
      page?: string;
      limit?: string;
      search?: string;
      includeUnpublished?: boolean;
    },
  ) {
    const hasPagination = Boolean(options.page || options.limit || options.search);
    if (hasPagination) {
      const result = await this.newsletterService.getAll({
        usePagination: true,
        page: this.paginationService.parsePositiveInteger(options.page, DEFAULT_NEWSLETTERS_PAGE),
        limit: this.paginationService.parsePositiveInteger(options.limit, DEFAULT_NEWSLETTERS_LIMIT),
        search: options.search?.trim() || undefined,
        includeUnpublished: Boolean(options.includeUnpublished),
      });
      const paginated = result as NewsletterPaginatedListResult;
      return response.status(HttpStatus.OK).json({
        length: paginated.data.length,
        data: paginated.data,
        pagination: paginated.pagination,
      });
    }

    const newsletters = (await this.newsletterService.getAll({
      includeUnpublished: Boolean(options.includeUnpublished),
    })) as NewsletterPaginatedListResult['data'];
    return response.status(HttpStatus.OK).json({
      length: newsletters.length,
      data: newsletters,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List published newsletters' })
  async getAllNewsletters(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Res() response?: Response,
  ) {
    return this.listNewsletters(response!, { page, limit, search, includeUnpublished: false });
  }

  @Get('admin')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List all newsletters including drafts and scheduled (admin)' })
  async getAdminNewsletters(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Res() response?: Response,
  ) {
    return this.listNewsletters(response!, { page, limit, search, includeUnpublished: true });
  }

  @Get('admin/:id/html')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get unpublished HTML file content (admin)' })
  async getAdminNewsletterHtml(@Param('id') id: string, @Res() response: Response) {
    const html = await this.newsletterService.getHtmlContent(id, { includeUnpublished: true });
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return response.status(HttpStatus.OK).send(html);
  }

  @Get('admin/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get newsletter by id including unpublished (admin)' })
  async getAdminNewsletterById(@Param('id') id: string, @Res() response: Response) {
    const newsletter = await this.newsletterService.getById(id, { includeUnpublished: true });
    return response.status(HttpStatus.OK).json({ data: newsletter });
  }

  @Get(':id/html')
  @ApiOperation({ summary: 'Get published HTML file content' })
  async getNewsletterHtml(@Param('id') id: string, @Res() response: Response) {
    const html = await this.newsletterService.getHtmlContent(id, { includeUnpublished: false });
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return response.status(HttpStatus.OK).send(html);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a published newsletter by id' })
  async getNewsletterById(@Param('id') id: string, @Res() response: Response) {
    const newsletter = await this.newsletterService.getById(id, { includeUnpublished: false });
    return response.status(HttpStatus.OK).json({ data: newsletter });
  }

  @Post()
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a newsletter with an HTML or PDF file' })
  @ApiBody({ type: CreateNewsletterDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: NEWSLETTER_FILE_LIMIT },
    }),
  )
  async createNewsletter(
    @Body() createNewsletterDto: CreateNewsletterDto,
    @Res() response: Response,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [new MaxFileSizeValidator({ maxSize: NEWSLETTER_FILE_LIMIT })],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.newsletterService.create(createNewsletterDto, file);
    return response.status(HttpStatus.CREATED).json(result);
  }

  @Put('update/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a newsletter and optionally replace the file' })
  @ApiBody({ type: UpdateNewsletterDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: NEWSLETTER_FILE_LIMIT },
    }),
  )
  async updateNewsletter(
    @Param('id') id: string,
    @Body() updateNewsletterDto: UpdateNewsletterDto,
    @Res() response: Response,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [new MaxFileSizeValidator({ maxSize: NEWSLETTER_FILE_LIMIT })],
      }),
    )
    file?: Express.Multer.File,
  ) {
    const result = await this.newsletterService.update(id, updateNewsletterDto, file);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('delete/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a newsletter' })
  async deleteNewsletter(@Param('id') id: string, @Res() response: Response) {
    const result = await this.newsletterService.delete(id);
    return response.status(HttpStatus.OK).json(result);
  }
}
