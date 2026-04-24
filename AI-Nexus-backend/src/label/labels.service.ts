import { Injectable, NotFoundException } from '@nestjs/common';
import { LabelEntity } from './labels.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateLabelDto, UpdateLabelDto } from './labels.dto';
import { PaginatedQueryOptions, PaginatedResultWithMeta, PaginationService } from '../common/pagination/pagination.service';

export type LabelListQueryOptions = PaginatedQueryOptions & {
    usePagination?: boolean;
};

export type LabelPaginatedListResult = PaginatedResultWithMeta<LabelEntity>;

@Injectable()
export class LabelService {
    constructor(
        @InjectRepository(LabelEntity)
        private labelRepository: Repository<LabelEntity>,
        private readonly paginationService: PaginationService,
    ) { }

    async getAll(queryOptions?: LabelListQueryOptions): Promise<LabelEntity[] | LabelPaginatedListResult> {
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

        const query = this.labelRepository.createQueryBuilder('label');

        if (normalized.hasSearch) {
            query.andWhere(
                new Brackets((qb) => {
                    qb.where('label.title ILIKE :search', { search: `%${normalized.search}%` });
                })
            );
        }

        query.orderBy('label.createdAt', 'DESC');

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

    async getById(id: string): Promise<LabelEntity> {
        const label = await this.labelRepository.findOne({ where: { id } });
        if (!label) {
            throw new NotFoundException("Label not found");
        }
        return label;
    }

    async create(createLabelDto: CreateLabelDto): Promise<{ message: string; label: LabelEntity }> {
        const label = this.labelRepository.create({
            title: createLabelDto.title,
        });

        await this.labelRepository.save(label);
        return {
            message: 'Label created successfully',
            label: label,
        };
    }

    async update(id: string, updateLabelDto: UpdateLabelDto): Promise<{ message: string; label: LabelEntity }> {
        const label = await this.labelRepository.findOne({ where: { id } });
        if (!label) {
            throw new NotFoundException('Label not found');
        }

        if (updateLabelDto.title !== undefined) {
            label.title = updateLabelDto.title;
        }

        await this.labelRepository.save(label);
        return {
            message: 'Label updated successfully',
            label: label,
        };
    }

    async delete(id: string): Promise<{ message: string }> {
        const label = await this.labelRepository.findOne({ where: { id } });
        if (!label) {
            throw new NotFoundException('Label not found');
        }

        await this.labelRepository.remove(label);
        return { message: 'Label deleted successfully' };
    }
}

