import { Injectable, NotFoundException } from '@nestjs/common';
import { TagEntity } from './tags.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateTagDto, UpdateTagDto } from './tags.dto';
import { PaginatedQueryOptions, PaginatedResultWithMeta, PaginationService } from '../common/pagination/pagination.service';

export type TagListQueryOptions = PaginatedQueryOptions & {
    usePagination?: boolean;
};

export type TagPaginatedListResult = PaginatedResultWithMeta<TagEntity>;

@Injectable()
export class TagService {
    constructor(
        @InjectRepository(TagEntity)
        private tagRepository: Repository<TagEntity>,
        private readonly paginationService: PaginationService,
    ) { }

    async getAll(queryOptions?: TagListQueryOptions): Promise<TagEntity[] | TagPaginatedListResult> {
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

        const query = this.tagRepository.createQueryBuilder('tag');

        if (normalized.hasSearch) {
            query.andWhere(
                new Brackets((qb) => {
                    qb.where('tag.title ILIKE :search', { search: `%${normalized.search}%` });
                })
            );
        }

        query.orderBy('tag.createdAt', 'DESC');

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

    async getById(id: string): Promise<TagEntity> {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) {
            throw new NotFoundException("Tag not found");
        }
        return tag;
    }

    async create(createTagDto: CreateTagDto): Promise<{ message: string; tag: TagEntity }> {
        const tag = this.tagRepository.create({
            title: createTagDto.title,
        });

        await this.tagRepository.save(tag);
        return {
            message: 'Tag created successfully',
            tag: tag,
        };
    }

    async update(id: string, updateTagDto: UpdateTagDto): Promise<{ message: string; tag: TagEntity }> {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) {
            throw new NotFoundException('Tag not found');
        }

        if (updateTagDto.title !== undefined) {
            tag.title = updateTagDto.title;
        }

        await this.tagRepository.save(tag);
        return {
            message: 'Tag updated successfully',
            tag: tag,
        };
    }

    async delete(id: string): Promise<{ message: string }> {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) {
            throw new NotFoundException('Tag not found');
        }

        await this.tagRepository.remove(tag);
        return { message: 'Tag deleted successfully' };
    }
}

