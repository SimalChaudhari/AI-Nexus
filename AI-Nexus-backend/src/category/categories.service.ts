//categories.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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

    private slugifyInput(raw: string): string {
        const s = raw
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return s || 'category';
    }

    private async resolveUniqueSlug(desired: string, excludeId?: string): Promise<string> {
        let base = this.slugifyInput(desired);
        let candidate = base;
        for (let n = 0; n < 10_000; n += 1) {
            const qb = this.categoryRepository.createQueryBuilder('c').where('c.slug = :slug', { slug: candidate });
            if (excludeId) {
                qb.andWhere('c.id != :id', { id: excludeId });
            }
            const exists = await qb.getExists();
            if (!exists) {
                return candidate;
            }
            candidate = `${base}-${n + 1}`;
        }
        throw new ConflictException('Could not allocate a unique slug');
    }

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
                    qb.where('category.title ILIKE :search', { search: `%${normalized.search}%` })
                        .orWhere('category.slug ILIKE :search', { search: `%${normalized.search}%` })
                        .orWhere('category.description ILIKE :search', { search: `%${normalized.search}%` });
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
        const slugSource =
            createCategoryDto.slug?.trim() ||
            createCategoryDto.title;
        const slug = await this.resolveUniqueSlug(slugSource);

        const categoryData: Partial<CategoryEntity> = {
            title: createCategoryDto.title.trim(),
            slug,
            status: createCategoryDto.status || CategoryStatus.Active,
        };

        if (createCategoryDto.description !== undefined) {
            categoryData.description = createCategoryDto.description?.trim() || null;
        }
        if (createCategoryDto.image !== undefined) {
            categoryData.image = createCategoryDto.image?.trim() || null;
        }
        if (createCategoryDto.icon !== undefined) {
            categoryData.icon = createCategoryDto.icon?.trim() || undefined;
        }

        const category = this.categoryRepository.create(categoryData);

        try {
            await this.categoryRepository.save(category);
        } catch (e: unknown) {
            const code = (e as { code?: string })?.code;
            if (code === '23505') {
                throw new ConflictException('A category with this slug already exists');
            }
            throw e;
        }
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
            category.title = updateCategoryDto.title.trim();
        }
        if (updateCategoryDto.description !== undefined) {
            category.description = updateCategoryDto.description?.trim() || null;
        }
        if (updateCategoryDto.image !== undefined) {
            category.image = updateCategoryDto.image?.trim() || null;
        }
        if (updateCategoryDto.slug !== undefined) {
            const raw = updateCategoryDto.slug.trim();
            category.slug = raw
                ? await this.resolveUniqueSlug(raw, id)
                : await this.resolveUniqueSlug(category.title, id);
        }
        if (updateCategoryDto.icon !== undefined) {
            category.icon = updateCategoryDto.icon?.trim() || undefined;
        }
        if (updateCategoryDto.status !== undefined) {
            category.status = updateCategoryDto.status;
        }

        try {
            await this.categoryRepository.save(category);
        } catch (e: unknown) {
            const code = (e as { code?: string })?.code;
            if (code === '23505') {
                throw new ConflictException('A category with this slug already exists');
            }
            throw e;
        }
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

