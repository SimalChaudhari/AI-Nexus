//categories.controller.ts
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
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '../user/users.entity';
import { Response } from 'express';
import { CategoryService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationService } from '../common/pagination/pagination.service';
import { CategoryPaginatedListResult } from './categories.service';
import { LocalStorageService } from '../service/local-storage.service';

const DEFAULT_CATEGORIES_PAGE = 1;
const DEFAULT_CATEGORIES_LIMIT = 10;
const CATEGORY_IMAGE_LIMIT = 5 * 1024 * 1024;
const CATEGORY_IMAGE_TYPE = /(jpg|jpeg|png|gif|webp)$/;

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
    constructor(
        private readonly categoryService: CategoryService,
        private readonly paginationService: PaginationService,
        private readonly localStorageService: LocalStorageService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List all categories' })
    async getAllCategories(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Res() response?: Response,
    ) {
        const hasFilters = Boolean(page || limit || search);
        if (hasFilters) {
            const result = await this.categoryService.getAll({
                usePagination: true,
                page: this.paginationService.parsePositiveInteger(page, DEFAULT_CATEGORIES_PAGE),
                limit: this.paginationService.parsePositiveInteger(limit, DEFAULT_CATEGORIES_LIMIT),
                search: search?.trim() || undefined,
            });
            const paginated = result as CategoryPaginatedListResult;
            return response!.status(HttpStatus.OK).json({
                length: paginated.data.length,
                data: paginated.data,
                pagination: paginated.pagination,
            });
        }

        const categories = (await this.categoryService.getAll()) as CategoryPaginatedListResult['data'];
        return response!.status(HttpStatus.OK).json({
            length: categories.length,
            data: categories,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get category details by id' })
    async getCategoryById(@Param('id') id: string, @Res() response: Response) {
        const category = await this.categoryService.getById(id);
        return response.status(HttpStatus.OK).json({
            data: category,
        });
    }

    @Post()
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a category' })
    @ApiBody({ type: CreateCategoryDto })
    @UseInterceptors(
        FileInterceptor('image', {
            storage: memoryStorage(),
            limits: { fileSize: CATEGORY_IMAGE_LIMIT },
        }),
    )
    async createCategory(
        @Body() createCategoryDto: CreateCategoryDto,
        @Res() response: Response,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [
                    new MaxFileSizeValidator({ maxSize: CATEGORY_IMAGE_LIMIT }),
                    new FileTypeValidator({ fileType: CATEGORY_IMAGE_TYPE }),
                ],
            }),
        )
        imageFile?: Express.Multer.File,
    ) {
        if (imageFile) {
            const imageUrl = await this.localStorageService.saveFile(imageFile, 'category');
            createCategoryDto.image = imageUrl;
        }
        const result = await this.categoryService.create(createCategoryDto);
        return response.status(HttpStatus.CREATED).json(result);
    }

    @Put('update/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update a category' })
    @ApiBody({ type: UpdateCategoryDto })
    @UseInterceptors(
        FileInterceptor('image', {
            storage: memoryStorage(),
            limits: { fileSize: CATEGORY_IMAGE_LIMIT },
        }),
    )
    async updateCategory(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
        @Res() response: Response,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [
                    new MaxFileSizeValidator({ maxSize: CATEGORY_IMAGE_LIMIT }),
                    new FileTypeValidator({ fileType: CATEGORY_IMAGE_TYPE }),
                ],
            }),
        )
        imageFile?: Express.Multer.File,
    ) {
        const existingCategory = await this.categoryService.getById(id);
        if (imageFile) {
            await this.localStorageService.deleteFileByUrl(existingCategory.image || undefined);
            const imageUrl = await this.localStorageService.saveFile(imageFile, 'category');
            updateCategoryDto.image = imageUrl;
        } else if (updateCategoryDto.image === '') {
            await this.localStorageService.deleteFileByUrl(existingCategory.image || undefined);
        }
        const result = await this.categoryService.update(id, updateCategoryDto);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('delete/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete a category' })
    async deleteCategory(@Param('id') id: string, @Res() response: Response) {
        const category = await this.categoryService.getById(id);
        await this.localStorageService.deleteFileByUrl(category.image || undefined);
        const result = await this.categoryService.delete(id);
        return response.status(HttpStatus.OK).json(result);
    }
}

