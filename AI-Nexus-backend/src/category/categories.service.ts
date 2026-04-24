//categories.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryEntity, CategoryStatus } from './categories.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';
import { PaginatedQueryOptions, PaginatedResultWithMeta, PaginationService } from '../common/pagination/pagination.service';

export type CategoryListQueryOptions = PaginatedQueryOptions & {
    usePagination?: boolean;
};

export type CategoryPaginatedListResult = PaginatedResultWithMeta<CategoryEntity>;

@Injectable()
export class CategoryService {
    constructor(
        @InjectRepository(CategoryEntity)
        private categoryRepository: Repository<CategoryEntity>,
        private readonly paginationService: PaginationService,
    ) { }

    async getAll(queryOptions?: CategoryListQueryOptions): Promise<CategoryEntity[] | CategoryPaginatedListResult> {
        const usePagination = Boolean(queryOptions?.usePagination);
        const normalized = this.paginationService.normalizePaginatedQuery(
            {
                page: queryOptions?.page,
                limit: queryOptions?.limit,
                search: queryOptions?.search,
            },
            10,
            100
        );

        const query = this.categoryRepository.createQueryBuilder('category');

        if (normalized.hasSearch) {
            query.andWhere(
                new Brackets((qb) => {
                    qb.where('category.title ILIKE :search', { search: `%${normalized.search}%` });
                })
            );
        }

        query.orderBy('category.createdAt', 'DESC');

        if (!usePagination) {
            return query.getMany();
        }

        return this.paginationService.paginateQueryBuilder({
            queryBuilder: query,
            page: normalized.page,
            limit: normalized.limit,
            search: normalized.hasSearch ? normalized.search : null,
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

