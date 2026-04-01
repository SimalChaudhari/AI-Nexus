//categories.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryEntity, CategoryStatus } from './categories.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

@Injectable()
export class CategoryService {
    constructor(
        @InjectRepository(CategoryEntity)
        private categoryRepository: Repository<CategoryEntity>,
    ) { }

    async getAll(): Promise<CategoryEntity[]> {
        return await this.categoryRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    async getById(id: string): Promise<CategoryEntity> {
        const category = await this.categoryRepository.findOne({ where: { id } });
        if (!category) {
            throw new NotFoundException("Category not found");
        }
        return category;
    }

    async create(createCategoryDto: CreateCategoryDto): Promise<{ message: string; category: CategoryEntity }> {
        const categoryData: Partial<CategoryEntity> = {
            title: createCategoryDto.title,
            status: createCategoryDto.status || CategoryStatus.Active,
        };

        if (createCategoryDto.icon !== undefined) {
            categoryData.icon = createCategoryDto.icon;
        }

        const category = this.categoryRepository.create(categoryData);

        await this.categoryRepository.save(category);
        return {
            message: 'Category created successfully',
            category: category,
        };
    }

    async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<{ message: string; category: CategoryEntity }> {
        const category = await this.categoryRepository.findOne({ where: { id } });
        if (!category) {
            throw new NotFoundException('Category not found');
        }

        // Update fields if provided
        if (updateCategoryDto.title !== undefined) {
            category.title = updateCategoryDto.title;
        }
        if (updateCategoryDto.icon !== undefined) {
            category.icon = updateCategoryDto.icon;
        }
        if (updateCategoryDto.status !== undefined) {
            category.status = updateCategoryDto.status;
        }

        await this.categoryRepository.save(category);
        return {
            message: 'Category updated successfully',
            category: category,
        };
    }

    async delete(id: string): Promise<{ message: string }> {
        const category = await this.categoryRepository.findOne({ where: { id } });
        if (!category) {
            throw new NotFoundException('Category not found');
        }

        await this.categoryRepository.remove(category);
        return { message: 'Category deleted successfully' };
    }
}

