import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { ProgramEntity, ProgramStatus } from './programs.entity';
import { CreateProgramDto, UpdateProgramDto } from './programs.dto';
import { CategoryEntity } from '../category/categories.entity';
import { CourseEntity } from '../course/courses.entity';
import {
    PaginatedQueryOptions,
    PaginatedResultWithMeta,
    PaginationService,
} from '../common/pagination/pagination.service';

export type ProgramListQueryOptions = PaginatedQueryOptions & { usePagination?: boolean };
export type ProgramPaginatedListResult = PaginatedResultWithMeta<ProgramEntity>;

export type ProgramLinkedCourse = {
    id: string;
    title: string;
    categoryTitle: string;
};

export type ProgramWithDetails = ProgramEntity & {
    linkedCourses: ProgramLinkedCourse[];
};

@Injectable()
export class ProgramService {
    constructor(
        @InjectRepository(ProgramEntity)
        private programRepository: Repository<ProgramEntity>,
        @InjectRepository(CategoryEntity)
        private categoryRepository: Repository<CategoryEntity>,
        @InjectRepository(CourseEntity)
        private courseRepository: Repository<CourseEntity>,
        private readonly paginationService: PaginationService,
    ) {}

    private async enrichProgram(program: ProgramEntity): Promise<ProgramWithDetails> {
        const courses = await this.courseRepository.find({
            where: { programId: program.id, isBundle: false },
            select: ['id', 'title', 'categoryId'],
            order: { createdAt: 'ASC' },
        });

        const categoryIds = [...new Set(courses.map((c) => c.categoryId).filter(Boolean))] as string[];
        const categories = categoryIds.length
            ? await this.categoryRepository.find({
                  where: { id: In(categoryIds) },
                  select: ['id', 'title'],
              })
            : [];
        const categoryMap = new Map(categories.map((c) => [c.id, c.title]));

        const linkedCourses: ProgramLinkedCourse[] = courses.map((course) => ({
            id: course.id,
            title: course.title,
            categoryTitle: course.categoryId ? categoryMap.get(course.categoryId) || '' : '',
        }));

        return { ...program, linkedCourses };
    }

    async getAll(
        queryOptions?: ProgramListQueryOptions,
    ): Promise<ProgramWithDetails[] | PaginatedResultWithMeta<ProgramWithDetails>> {
        const usePagination = Boolean(queryOptions?.usePagination);
        const normalized = this.paginationService.normalizePaginatedQuery(
            {
                page: queryOptions?.page,
                limit: queryOptions?.limit,
                search: queryOptions?.search,
            },
            10,
            100,
        );

        const query = this.programRepository.createQueryBuilder('program');
        if (normalized.hasSearch) {
            query.andWhere(
                new Brackets((qb) => {
                    qb.where('program.title ILIKE :search', { search: `%${normalized.search}%` })
                        .orWhere('program.description ILIKE :search', {
                            search: `%${normalized.search}%`,
                        });
                }),
            );
        }
        query.orderBy('program.createdAt', 'DESC');

        if (!usePagination) {
            const rows = await query.getMany();
            return Promise.all(rows.map((p) => this.enrichProgram(p)));
        }

        const paginated = await this.paginationService.paginateQueryBuilder({
            queryBuilder: query,
            page: normalized.page,
            limit: normalized.limit,
            search: normalized.hasSearch ? normalized.search : null,
        });

        return {
            ...paginated,
            data: await Promise.all(paginated.data.map((p) => this.enrichProgram(p))),
        };
    }

    async getById(id: string): Promise<ProgramWithDetails> {
        const program = await this.programRepository.findOne({ where: { id } });
        if (!program) throw new NotFoundException('Program not found');
        return this.enrichProgram(program);
    }

    async getByCourseId(courseId: string): Promise<ProgramWithDetails | null> {
        const course = await this.courseRepository.findOne({
            where: { id: courseId },
            select: ['programId'],
        });
        if (!course?.programId) return null;

        const program = await this.programRepository.findOne({
            where: { id: course.programId, status: ProgramStatus.Active },
        });
        if (!program) return null;
        return this.enrichProgram(program);
    }

    async create(dto: CreateProgramDto): Promise<{ message: string; program: ProgramWithDetails }> {
        const program = this.programRepository.create({
            title: dto.title.trim(),
            description: dto.description?.trim() || null,
            status: dto.status || ProgramStatus.Active,
        });

        await this.programRepository.save(program);
        return {
            message: 'Program created successfully',
            program: await this.enrichProgram(program),
        };
    }

    async update(
        id: string,
        dto: UpdateProgramDto,
    ): Promise<{ message: string; program: ProgramWithDetails }> {
        const program = await this.programRepository.findOne({ where: { id } });
        if (!program) throw new NotFoundException('Program not found');

        if (dto.title !== undefined) program.title = dto.title.trim();
        if (dto.description !== undefined) program.description = dto.description?.trim() || null;
        if (dto.status !== undefined) program.status = dto.status;

        await this.programRepository.save(program);
        return {
            message: 'Program updated successfully',
            program: await this.enrichProgram(program),
        };
    }

    async delete(id: string): Promise<{ message: string }> {
        const program = await this.programRepository.findOne({ where: { id } });
        if (!program) throw new NotFoundException('Program not found');
        await this.courseRepository.update({ programId: id }, { programId: null });
        await this.programRepository.remove(program);
        return { message: 'Program deleted successfully' };
    }
}
