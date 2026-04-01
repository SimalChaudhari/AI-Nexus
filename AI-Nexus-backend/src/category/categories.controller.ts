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
    Res,
    UseGuards,
} from '@nestjs/common';
import { UserRole } from '../user/users.entity';
import { Response } from 'express';
import { CategoryService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    @Get()
    @ApiOperation({ summary: 'List all categories' })
    async getAllCategories(@Res() response: Response) {
        const categories = await this.categoryService.getAll();
        return response.status(HttpStatus.OK).json({
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
    @ApiOperation({ summary: 'Create a category' })
    @ApiBody({ type: CreateCategoryDto })
    async createCategory(
        @Body() createCategoryDto: CreateCategoryDto,
        @Res() response: Response,
    ) {
        const result = await this.categoryService.create(createCategoryDto);
        return response.status(HttpStatus.CREATED).json(result);
    }

    @Put('update/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update a category' })
    @ApiBody({ type: UpdateCategoryDto })
    async updateCategory(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
        @Res() response: Response,
    ) {
        const result = await this.categoryService.update(id, updateCategoryDto);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('delete/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete a category' })
    async deleteCategory(@Param('id') id: string, @Res() response: Response) {
        const result = await this.categoryService.delete(id);
        return response.status(HttpStatus.OK).json(result);
    }
}

