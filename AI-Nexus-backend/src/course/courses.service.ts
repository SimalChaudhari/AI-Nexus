//courses.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseEntity, CourseLevel } from './courses.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { CreateCourseDto, UpdateCourseDto } from './courses.dto';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { CourseFavoriteEntity } from './course-favorite.entity';
import { CourseEnrollmentEntity } from './course-enrollment.entity';
import { CourseGroupEntity } from './course-group.entity';
import { CourseModuleEntity } from './course-module.entity';
import { CourseModuleSectionEntity } from './course-module-section.entity';
import {
  buildPaginatedResponse,
  PaginatedQueryOptions,
  PaginatedResponse,
  normalizePaginatedQuery,
} from '../common/pagination/paginated-list.util';
import { CourseEnrollmentService } from './course-enrollment.service';
import { CategoryEntity } from '../category/categories.entity';
import { CourseOptionEntity, CourseOptionType } from './course-option.entity';
import { ReviewEntity } from '../review/review.entity';

function parseWatchtimeToSeconds(value?: string | null): number {
    const text = String(value || '').trim();
    if (!text) return 0;
    if (/^\d+$/.test(text)) return Number(text) || 0;
    const hms = text.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
    if (hms) {
        const h = Number(hms[1]);
        const m = Number(hms[2]);
        const s = Number(hms[3]);
        if ([h, m, s].some((n) => Number.isNaN(n)) || m > 59 || s > 59) return 0;
        return h * 3600 + m * 60 + s;
    }
    const ms = text.match(/^(\d+):(\d{1,2})$/);
    if (ms) {
        const m = Number(ms[1]);
        const s = Number(ms[2]);
        if ([m, s].some((n) => Number.isNaN(n)) || s > 59) return 0;
        return m * 60 + s;
    }
    return 0;
}

function resolveSectionDurationSeconds(durationTime?: string | null, watchtime?: string | null): number {
    const fromDuration = parseWatchtimeToSeconds(durationTime);
    if (fromDuration > 0) return fromDuration;
    return parseWatchtimeToSeconds(watchtime);
}

function formatCourseDurationLabel(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    if (safe <= 0) return '';
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
}

/** Multipart / plain body may send booleans as strings. */
function coerceBoolean(value: unknown, defaultValue = false): boolean {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return defaultValue;
}

/** Normalize string array fields from DTO (multipart may send JSON string). */
function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

type GetCoursesOptions = PaginatedQueryOptions & {
  userId?: string;
  freeOrPaid?: boolean;
  isFavorite?: boolean;
  isEnrolled?: boolean;
  usePagination?: boolean;
  group?: string;
  recommendedCourseIds?: string[];
  courseIds?: string[];
  categoryId?: string;
  excludeBundles?: boolean;
};

type GroupedCoursesQuery = {
  userId?: string;
  group?: string;
  search?: string;
  freeOrPaid?: boolean;
  isFavorite?: boolean;
  isEnrolled?: boolean;
  defaultPage?: number;
  defaultLimit?: number;
  recommendedCourseIds?: string[];
};

function mapGroupToLevel(group?: string): CourseLevel | undefined {
  if (!group) return undefined;
  const normalized = group.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'basic' || normalized === 'beginner') return CourseLevel.Beginner;
  if (normalized === 'intermediate') return CourseLevel.Intermediate;
  if (normalized === 'advance' || normalized === 'advanced') return CourseLevel.Advanced;
  return undefined;
}

function normalizeCourseLevel(level?: string): CourseLevel {
    const normalized = String(level || '').trim().toLowerCase();
    if (normalized === 'intermediate') return CourseLevel.Intermediate;
    if (normalized === 'advanced' || normalized === 'advance') return CourseLevel.Advanced;
    return CourseLevel.Beginner;
}

@Injectable()
export class CourseService {
    constructor(
        @InjectRepository(CourseEntity)
        private courseRepository: Repository<CourseEntity>,
        @InjectRepository(CourseFavoriteEntity)
        private courseFavoriteRepository: Repository<CourseFavoriteEntity>,
        @InjectRepository(CourseEnrollmentEntity)
        private courseEnrollmentRepository: Repository<CourseEnrollmentEntity>,
        @InjectRepository(CourseGroupEntity)
        private courseGroupRepository: Repository<CourseGroupEntity>,
        @InjectRepository(CourseModuleEntity)
        private courseModuleRepository: Repository<CourseModuleEntity>,
        @InjectRepository(CourseModuleSectionEntity)
        private courseModuleSectionRepository: Repository<CourseModuleSectionEntity>,
        @InjectRepository(CategoryEntity)
        private categoryRepository: Repository<CategoryEntity>,
        @InjectRepository(CourseOptionEntity)
        private courseOptionRepository: Repository<CourseOptionEntity>,
        @InjectRepository(ReviewEntity)
        private reviewRepository: Repository<ReviewEntity>,
        private readonly courseEnrollmentService: CourseEnrollmentService,
    ) { }

    private normalizeCourseOptionType(type?: string): CourseOptionType {
        const normalized = String(type || '').trim().toLowerCase();
        if (normalized === 'level' || normalized === 'levels') return CourseOptionType.Level;
        if (normalized === 'role' || normalized === 'roles') return CourseOptionType.Role;
        if (
            normalized === 'ailevel' ||
            normalized === 'ai-level' ||
            normalized === 'ai_level' ||
            normalized === 'ai'
        ) {
            return CourseOptionType.AiLevel;
        }
        if (normalized === 'goal' || normalized === 'goals') return CourseOptionType.Goal;
        if (
            normalized === 'usearea' ||
            normalized === 'use-area' ||
            normalized === 'use_area' ||
            normalized === 'useareas' ||
            normalized === 'use-areas'
        ) {
            return CourseOptionType.UseArea;
        }
        throw new BadRequestException('Invalid option type');
    }

    private async attachCourseCategories(data: any[]): Promise<any[]> {
        if (!Array.isArray(data) || data.length === 0) {
            return data;
        }

        const categoryIds = [...new Set(data.map((course) => course?.categoryId).filter(Boolean))];
        if (categoryIds.length === 0) {
            return data.map((course) => ({ ...course, category: null }));
        }

        const categories = await this.categoryRepository.find({
            where: { id: In(categoryIds) },
            select: ['id', 'title', 'slug', 'status', 'icon', 'image', 'description'],
        });
        const categoryMap = new Map(categories.map((category) => [category.id, category]));

        return data.map((course) => ({
            ...course,
            category: course?.categoryId ? categoryMap.get(course.categoryId) || null : null,
        }));
    }

    private stripCategoryIdFromCourses(data: any[]): any[] {
        if (!Array.isArray(data)) return [];
        return data.map((course) => {
            const { categoryId: _categoryId, ...rest } = course || {};
            return rest;
        });
    }

    private async attachCourseContentCounts(data: any[]): Promise<any[]> {
        if (!Array.isArray(data) || data.length === 0) {
            return data;
        }

        const courseIds = [...new Set(data.map((course) => course?.id).filter(Boolean))];
        if (courseIds.length === 0) {
            return data;
        }

        const [moduleRows, sectionRows, sectionTimingRows] = await Promise.all([
            this.courseModuleRepository
                .createQueryBuilder('module')
                .select('module.courseId', 'courseId')
                .addSelect('COUNT(*)::int', 'count')
                .where('module.courseId IN (:...courseIds)', { courseIds })
                .groupBy('module.courseId')
                .getRawMany<{ courseId: string; count: string | number }>(),
            this.courseModuleSectionRepository
                .createQueryBuilder('section')
                .innerJoin(CourseModuleEntity, 'module', 'module.id = section.moduleId')
                .select('module.courseId', 'courseId')
                .addSelect('COUNT(*)::int', 'count')
                .where('module.courseId IN (:...courseIds)', { courseIds })
                .groupBy('module.courseId')
                .getRawMany<{ courseId: string; count: string | number }>(),
            this.courseModuleSectionRepository
                .createQueryBuilder('section')
                .innerJoin(CourseModuleEntity, 'module', 'module.id = section.moduleId')
                .select('module.courseId', 'courseId')
                .addSelect('section.durationTime', 'durationTime')
                .addSelect('section.watchtime', 'watchtime')
                .where('module.courseId IN (:...courseIds)', { courseIds })
                .getRawMany<{ courseId: string; durationTime: string | null; watchtime: string | null }>(),
        ]);

        const modulesByCourseId = new Map(
            moduleRows.map((row) => [row.courseId, Number(row.count) || 0]),
        );
        const sectionsByCourseId = new Map(
            sectionRows.map((row) => [row.courseId, Number(row.count) || 0]),
        );
        const durationSecondsByCourseId = new Map<string, number>();
        sectionTimingRows.forEach((row) => {
            const courseId = row.courseId;
            if (!courseId) return;
            const sectionSeconds = resolveSectionDurationSeconds(row.durationTime, row.watchtime);
            if (sectionSeconds <= 0) return;
            durationSecondsByCourseId.set(
                courseId,
                (durationSecondsByCourseId.get(courseId) ?? 0) + sectionSeconds,
            );
        });

        return data.map((course) => {
            const modulesCount = modulesByCourseId.get(course.id) ?? 0;
            const sectionsCount = sectionsByCourseId.get(course.id) ?? 0;
            const totalDurationSeconds = durationSecondsByCourseId.get(course.id) ?? 0;
            const totalDuration = formatCourseDurationLabel(totalDurationSeconds);

            return {
                ...course,
                modulesCount,
                sectionsCount,
                totalDurationSeconds,
                totalDuration,
            };
        });
    }

    private async attachReviewStats(data: any[]): Promise<any[]> {
        if (!Array.isArray(data) || data.length === 0) {
            return data;
        }

        const courseIds = [...new Set(data.map((course) => course?.id).filter(Boolean))];
        if (courseIds.length === 0) {
            return data;
        }

        const reviewRows = await this.reviewRepository
            .createQueryBuilder('review')
            .select('review.courseId', 'courseId')
            .addSelect('COUNT(*)::int', 'reviewCount')
            .addSelect('AVG(review.rating)::float', 'averageRating')
            .where('review.courseId IN (:...courseIds)', { courseIds })
            .andWhere('review.isCourse = :isCourse', { isCourse: true })
            .groupBy('review.courseId')
            .getRawMany<{ courseId: string; reviewCount: string | number; averageRating: string | number }>();

        const statsByCourseId = new Map(
            reviewRows.map((row) => {
                const reviewCount = Number(row.reviewCount) || 0;
                const averageRating = Math.min(
                    5,
                    Math.max(0, Number(row.averageRating) || 0),
                );
                return [row.courseId, { averageRating, reviewCount }];
            }),
        );

        return data.map((course) => {
            const stats = statsByCourseId.get(course.id) || { averageRating: 0, reviewCount: 0 };
            return {
                ...course,
                reviewStats: stats,
            };
        });
    }

    async getAll(options: GetCoursesOptions & { usePagination: true }): Promise<PaginatedResponse<any>>;
    async getAll(options?: GetCoursesOptions): Promise<any[]>;
    async getAll(options: GetCoursesOptions = {}): Promise<any[] | PaginatedResponse<any>> {
        const normalizedQuery = normalizePaginatedQuery(options, 12, 100);
        const userId = options.userId;
        const favoriteFilter = options.isFavorite;
        const enrolledFilter = options.isEnrolled;
        const usePagination = options.usePagination === true;
        const courseIdsFilter = Array.isArray(options.courseIds)
            ? [...new Set(options.courseIds.filter(Boolean))]
            : undefined;

        if (courseIdsFilter && courseIdsFilter.length === 0) {
            return usePagination
                ? buildPaginatedResponse(
                    [],
                    normalizedQuery.page,
                    normalizedQuery.limit,
                    0,
                    normalizedQuery.hasSearch ? normalizedQuery.search : null,
                    undefined,
                )
                : [];
        }

        if (!userId && (favoriteFilter === true || enrolledFilter === true)) {
            return usePagination
                ? buildPaginatedResponse(
                    [],
                    normalizedQuery.page,
                    normalizedQuery.limit,
                    0,
                    normalizedQuery.hasSearch ? normalizedQuery.search : null,
                    undefined,
                )
                : [];
        }

        const baseQuery = this.courseRepository.createQueryBuilder('course');
        if (courseIdsFilter && courseIdsFilter.length > 0) {
            baseQuery.andWhere('course.id IN (:...courseIds)', { courseIds: courseIdsFilter });
        }

        if (normalizedQuery.hasSearch) {
            baseQuery.andWhere('(course.title ILIKE :search OR course.description ILIKE :search)', {
                search: `%${normalizedQuery.search}%`,
            });
        }

        if (typeof options.freeOrPaid === 'boolean') {
            baseQuery.andWhere('course.freeOrPaid = :freeOrPaid', { freeOrPaid: options.freeOrPaid });
        }

        const categoryId = String(options.categoryId || '').trim();
        if (/^[0-9a-f-]{36}$/i.test(categoryId)) {
            baseQuery.andWhere('course.categoryId = :categoryId', { categoryId });
        }

        if (options.excludeBundles === true) {
            baseQuery.andWhere('course.isBundle = false');
        }

        const levelFilter = mapGroupToLevel(options.group);
        if (levelFilter) {
            baseQuery.andWhere('course.level = :level', { level: levelFilter });
        }

        if (userId) {
            baseQuery.leftJoin(
                'course_favorites',
                'courseFavorite',
                'courseFavorite.courseId = course.id AND courseFavorite.userId = :userId',
                { userId },
            );
            baseQuery.leftJoin(
                'course_enrollments',
                'courseEnrollment',
                'courseEnrollment.courseId = course.id AND courseEnrollment.userId = :userId',
                { userId },
            );
        }

        if (favoriteFilter === true) {
            baseQuery.andWhere('courseFavorite.id IS NOT NULL');
        } else if (favoriteFilter === false && userId) {
            baseQuery.andWhere('courseFavorite.id IS NULL');
        }

        const bundleChildIdsSql = `SELECT (jsonb_array_elements_text(bc."bundleCourseIds"))::uuid
            FROM courses bc
            INNER JOIN course_enrollments be ON be."courseId" = bc.id AND be."userId" = :userId
            WHERE bc."isBundle" = true AND bc."bundleCourseIds" IS NOT NULL`;

        if (enrolledFilter === true && userId) {
            baseQuery.andWhere(
                new Brackets((qb) => {
                    qb.where('courseEnrollment.id IS NOT NULL').orWhere(
                        `course.id IN (${bundleChildIdsSql})`,
                    );
                }),
            );
        } else if (enrolledFilter === false && userId) {
            baseQuery.andWhere(
                new Brackets((qb) => {
                    qb.where('courseEnrollment.id IS NULL').andWhere(
                        `course.id NOT IN (${bundleChildIdsSql})`,
                    );
                }),
            );
        }

        const totalItems = usePagination ? await baseQuery.clone().getCount() : 0;
        const courseQuery = baseQuery.clone();
        const recommendedCourseIds = Array.isArray(options.recommendedCourseIds)
            ? [...new Set(options.recommendedCourseIds.filter(Boolean))]
            : [];
        if (userId) {
            courseQuery.addSelect(
                `CASE
                    WHEN courseEnrollment.id IS NOT NULL
                      OR course.id IN (${bundleChildIdsSql})
                    THEN 0 ELSE 1
                 END`,
                'purchase_priority',
            );
            courseQuery.orderBy('purchase_priority', 'ASC');
        }

        if (recommendedCourseIds.length > 0) {
            courseQuery
                .addSelect(
                    'CASE WHEN course.id = ANY(:recommendedCourseIds) THEN 0 ELSE 1 END',
                    'persona_priority',
                )
                .addSelect(
                    'COALESCE(array_position(:recommendedCourseIds::uuid[], course.id), 2147483647)',
                    'persona_order',
                )
                .addOrderBy('persona_priority', 'ASC')
                .addOrderBy('persona_order', 'ASC')
                .addOrderBy('course.createdAt', 'DESC')
                .setParameter('recommendedCourseIds', recommendedCourseIds);
        } else {
            courseQuery.addOrderBy('course.createdAt', 'DESC');
        }
        const courses = usePagination
            ? await courseQuery
                .skip((normalizedQuery.page - 1) * normalizedQuery.limit)
                .take(normalizedQuery.limit)
                .getMany()
            : await courseQuery.getMany();

        const courseIds = courses.map((course) => course.id);
        const recommendedSet = new Set(recommendedCourseIds);
        let favoriteIds = new Set<string>();
        let effectiveEnrolledIds = new Set<string>();

        let directEnrolledOnPage = new Set<string>();
        if (userId && courseIds.length > 0) {
            const favoriteRows = await this.courseFavoriteRepository.find({
                where: { userId, courseId: In(courseIds) },
                select: ['courseId'],
            });
            favoriteIds = new Set(favoriteRows.map((favorite) => favorite.courseId));
            effectiveEnrolledIds = await this.courseEnrollmentService.getEffectiveEnrolledCourseIdSet(userId);
            const directRows = await this.courseEnrollmentRepository.find({
                where: { userId, courseId: In(courseIds) },
                select: ['courseId'],
            });
            directEnrolledOnPage = new Set(directRows.map((r) => r.courseId));
        }

        const mappedData = courses.map((course) => {
            const effective = userId ? effectiveEnrolledIds.has(course.id) : false;
            const directOnPage = userId ? directEnrolledOnPage.has(course.id) : false;
            return {
                ...course,
                isFavorite: userId ? favoriteIds.has(course.id) : false,
                isEnrolled: effective,
                accessViaBundle: userId ? effective && !directOnPage : false,
                isRecommended: recommendedSet.has(course.id),
            };
        });
        const withCategories = await this.attachCourseCategories(mappedData);
        const withCounts = await this.attachCourseContentCounts(withCategories);
        const withReviewStats = await this.attachReviewStats(withCounts);
        const data = this.stripCategoryIdFromCourses(withReviewStats);

        if (!usePagination) {
            return data;
        }

        return buildPaginatedResponse(
            data,
            normalizedQuery.page,
            normalizedQuery.limit,
            totalItems,
            normalizedQuery.hasSearch ? normalizedQuery.search : null,
            undefined,
        );
    }

    async getGroupedCourses(query: GroupedCoursesQuery) {
        const defaultPage = query.defaultPage ?? 1;
        const defaultLimit = query.defaultLimit ?? 12;
        const normalizedRequestedGroup = String(query.group || '').trim().toLowerCase();
        const allCategories = await this.categoryRepository.find({
            select: ['id', 'title', 'slug', 'status', 'createdAt'],
            order: { createdAt: 'ASC' },
        });
        const activeCategories = allCategories.filter(
            (category) => String(category.status || '').toLowerCase() === 'active',
        );
        const selectedCategories = normalizedRequestedGroup
            ? activeCategories.filter((category) => {
                const slug = String(category.slug || '').trim().toLowerCase();
                const title = String(category.title || '').trim().toLowerCase();
                return (
                    slug === normalizedRequestedGroup ||
                    title === normalizedRequestedGroup ||
                    category.id === query.group
                );
            })
            : activeCategories;

        return Promise.all(
            selectedCategories.map(async (category) => {
                const courseIdRows = await this.courseRepository.find({
                    where: { categoryId: category.id },
                    select: ['id'],
                });
                const courseIds = courseIdRows.map((row) => row.id).filter(Boolean);
                const result =
                    courseIds.length > 0
                        ? ((await this.getAll({
                            userId: query.userId,
                            usePagination: true,
                            page: defaultPage,
                            limit: defaultLimit,
                            search: query.search,
                            freeOrPaid: query.freeOrPaid,
                            isFavorite: query.isFavorite,
                            isEnrolled: query.isEnrolled,
                            recommendedCourseIds: query.recommendedCourseIds,
                            courseIds,
                        })) as PaginatedResponse<any>)
                        : buildPaginatedResponse([], defaultPage, defaultLimit, 0, query.search || null, undefined);

                return {
                    groupId: `category_${category.id}`,
                    groupName: category.title,
                    groupKey: category.slug || category.id,
                    pagination: {
                        page: result.pagination.page,
                        limit: result.pagination.limit,
                        totalItems: result.pagination.totalItems,
                        totalPages: result.pagination.totalPages,
                        hasNextPage: result.pagination.hasNextPage,
                        hasPrevPage: result.pagination.hasPreviousPage,
                    },
                    items: result.data,
                };
            }),
        );
    }

    async getRecommendedCourses(query: {
        userId?: string;
        recommendedCourseIds: string[];
        page?: number;
        limit?: number;
        search?: string;
        freeOrPaid?: boolean;
        isFavorite?: boolean;
        isEnrolled?: boolean;
    }) {
        const ids = Array.isArray(query.recommendedCourseIds)
            ? [...new Set(query.recommendedCourseIds.filter(Boolean))]
            : [];
        if (ids.length === 0) {
            return buildPaginatedResponse([], query.page || 1, query.limit || 5, 0, query.search || null, undefined);
        }

        return this.getAll({
            userId: query.userId,
            usePagination: true,
            page: query.page || 1,
            limit: query.limit || 5,
            search: query.search,
            freeOrPaid: query.freeOrPaid,
            isFavorite: query.isFavorite,
            isEnrolled: query.isEnrolled,
            courseIds: ids,
            recommendedCourseIds: ids,
        }) as Promise<PaginatedResponse<any>>;
    }

    async getCourseGroups(activeOnly = true) {
        const where = activeOnly ? { isActive: true } : {};
        return this.courseGroupRepository.find({
            where,
            order: { createdAt: 'ASC' },
        });
    }

    async getCourseFormOptions() {
        const options = await this.courseOptionRepository.find({
            where: { isActive: true },
            order: { createdAt: 'ASC' },
        });
        const mapByType = (type: CourseOptionType) =>
            options
                .filter((item) => item.type === type)
                .map((item) => ({ id: item.id, label: item.label }));

        return {
            levels: mapByType(CourseOptionType.Level),
            roles: mapByType(CourseOptionType.Role),
            aiLevels: mapByType(CourseOptionType.AiLevel),
            goals: mapByType(CourseOptionType.Goal),
            useAreas: mapByType(CourseOptionType.UseArea),
        };
    }

    async getCourseOptions(type: string) {
        const normalizedType = this.normalizeCourseOptionType(type);
        const rows = await this.courseOptionRepository.find({
            where: { type: normalizedType, isActive: true },
            order: { createdAt: 'ASC' },
        });
        return rows.map((row) => ({ id: row.id, type: row.type, label: row.label }));
    }

    async createCourseOption(type: string, label: string) {
        const normalizedType = this.normalizeCourseOptionType(type);
        const normalizedLabel = String(label || '').trim();
        if (!normalizedLabel) {
            throw new BadRequestException('Label is required');
        }
        const existing = await this.courseOptionRepository
            .createQueryBuilder('option')
            .where('option.type = :type', { type: normalizedType })
            .andWhere('LOWER(option.label) = LOWER(:label)', { label: normalizedLabel })
            .getOne();
        if (existing) {
            if (!existing.isActive) {
                existing.isActive = true;
                await this.courseOptionRepository.save(existing);
            }
            return existing;
        }

        const created = this.courseOptionRepository.create({
            type: normalizedType,
            label: normalizedLabel,
            isActive: true,
        });
        return this.courseOptionRepository.save(created);
    }

    async updateCourseOption(id: string, label: string) {
        const normalizedLabel = String(label || '').trim();
        if (!normalizedLabel) {
            throw new BadRequestException('Label is required');
        }
        const option = await this.courseOptionRepository.findOne({ where: { id } });
        if (!option) {
            throw new NotFoundException('Option not found');
        }

        const duplicate = await this.courseOptionRepository
            .createQueryBuilder('option')
            .where('option.type = :type', { type: option.type })
            .andWhere('LOWER(option.label) = LOWER(:label)', { label: normalizedLabel })
            .andWhere('option.id != :id', { id })
            .getOne();
        if (duplicate) {
            throw new BadRequestException('Option with same label already exists');
        }

        option.label = normalizedLabel;
        return this.courseOptionRepository.save(option);
    }

    async deleteCourseOption(id: string) {
        const option = await this.courseOptionRepository.findOne({ where: { id } });
        if (!option) {
            throw new NotFoundException('Option not found');
        }
        await this.courseOptionRepository.delete({ id });
        return { id };
    }

    async createCourseGroup(name: string) {
        const normalizedName = name.trim();
        const existing = await this.courseGroupRepository.findOne({
            where: { name: normalizedName },
        });
        if (existing) {
            return existing;
        }

        const group = this.courseGroupRepository.create({
            name: normalizedName,
            isActive: true,
        });

        return this.courseGroupRepository.save(group);
    }

    async seedDummyCourses(inputCourses?: Array<Partial<CreateCourseDto>>) {
        type SeedCourseInput = Partial<CreateCourseDto> & {
            categorySlug?: string;
            categoryTitle?: string;
        };
        const seedFilePath = join(process.cwd(), 'src', 'course', 'data', 'dummy-courses.json');
        let fileCourses: SeedCourseInput[] = [];
        if (existsSync(seedFilePath)) {
            try {
                const raw = readFileSync(seedFilePath, 'utf-8');
                const parsed = JSON.parse(raw) as unknown;
                fileCourses = Array.isArray(parsed) ? (parsed as SeedCourseInput[]) : [];
            } catch {
                fileCourses = [];
            }
        }

        const seedSource: SeedCourseInput[] = Array.isArray(inputCourses) && inputCourses.length > 0
            ? (inputCourses as SeedCourseInput[])
            : fileCourses;

        const categories = await this.categoryRepository.find({
            select: ['id', 'title', 'slug'],
        });
        const categoryById = new Map(categories.map((category) => [category.id, category.id]));
        const categoryBySlug = new Map(
            categories
                .filter((category) => category.slug)
                .map((category) => [String(category.slug).trim().toLowerCase(), category.id]),
        );
        const categoryByTitle = new Map(
            categories
                .filter((category) => category.title)
                .map((category) => [String(category.title).trim().toLowerCase(), category.id]),
        );

        const resolveCategoryId = (item: SeedCourseInput): string | null => {
            const explicitId = String(item.categoryId || '').trim();
            if (explicitId && categoryById.has(explicitId)) {
                return explicitId;
            }

            const slugKey = String(item.categorySlug || '').trim().toLowerCase();
            if (slugKey && categoryBySlug.has(slugKey)) {
                return categoryBySlug.get(slugKey) || null;
            }

            const titleKey = String(item.categoryTitle || '').trim().toLowerCase();
            if (titleKey && categoryByTitle.has(titleKey)) {
                return categoryByTitle.get(titleKey) || null;
            }

            const normalizedLevel = String(item.level || '').trim().toLowerCase();
            const fallbackCategoryTitle =
                normalizedLevel === 'intermediate'
                    ? 'ai in accounting workflows'
                    : normalizedLevel === 'advanced' || normalizedLevel === 'advance'
                        ? 'ai builder track'
                        : 'ai foundation';
            if (categoryByTitle.has(fallbackCategoryTitle)) {
                return categoryByTitle.get(fallbackCategoryTitle) || null;
            }

            // Final fallback when categories are named as levels.
            const fallbackLevelTitle =
                normalizedLevel === 'intermediate'
                    ? 'intermediate'
                    : normalizedLevel === 'advanced' || normalizedLevel === 'advance'
                        ? 'advanced'
                        : 'beginner';
            return categoryByTitle.get(fallbackLevelTitle) || null;
        };

        const prepared = seedSource.map((item, index) =>
            this.courseRepository.create({
                title: item.title?.trim() || `Dummy Course ${index + 1}`,
                description:
                    item.description ||
                    `Auto-generated demo course ${index + 1} for testing flows and UI.`,
                freeOrPaid: Boolean(item.freeOrPaid),
                amount: Boolean(item.freeOrPaid) ? Number(item.amount || 0) : 0,
                level: normalizeCourseLevel(item.level),
                categoryId: resolveCategoryId(item),
                roles: Array.isArray(item.roles)
                    ? item.roles.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
                    : [],
                aiLevel: Array.isArray(item.aiLevel)
                    ? item.aiLevel.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
                    : [],
                goals: Array.isArray(item.goals)
                    ? item.goals.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
                    : [],
                useAreas: Array.isArray(item.useAreas)
                    ? item.useAreas.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
                    : [],
                languageIds: Array.isArray(item.languageIds)
                    ? item.languageIds.filter((x): x is string => typeof x === 'string')
                    : [],
                marketData: item.marketData,
            }),
        );

        const created = await this.courseRepository.save(prepared);

        return {
            createdCount: created.length,
            courses: created,
        };
    }

    async getById(id: string): Promise<any> {
        const course = await this.courseRepository.findOne({ where: { id } });
        if (!course) {
            throw new NotFoundException("Course not found");
        }
        let category: CategoryEntity | null = null;
        if (course.categoryId) {
            category = await this.categoryRepository.findOne({
                where: { id: course.categoryId },
                select: ['id', 'title', 'slug', 'status', 'icon', 'image', 'description'],
            });
        }
        return {
            ...course,
            category: category || null,
        };
    }

    async findRelatedCourses(courseId: string, level?: string, limit = 4): Promise<CourseEntity[]> {
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 12) : 4;
        const normalizedLevel = String(level || '').trim().toLowerCase();

        const sameLevel = await this.courseRepository
            .createQueryBuilder('course')
            .where('course.id != :courseId', { courseId })
            .andWhere('LOWER(course.level::text) = :level', { level: normalizedLevel || '__none__' })
            .orderBy('course.createdAt', 'DESC')
            .take(safeLimit)
            .getMany();

        if (sameLevel.length >= safeLimit) {
            return sameLevel.slice(0, safeLimit);
        }

        const excludeIds = [courseId, ...sameLevel.map((c) => c.id)];
        const rest = await this.courseRepository
            .createQueryBuilder('course')
            .where('course.id NOT IN (:...excludeIds)', { excludeIds })
            .orderBy('course.createdAt', 'DESC')
            .take(safeLimit - sameLevel.length)
            .getMany();

        return [...sameLevel, ...rest];
    }

    /** Card/list fields for related courses on the course details page. */
    async enrichCoursesForCards(
        courses: CourseEntity[],
        userId?: string,
        recommendedCourseIds: string[] = [],
    ): Promise<any[]> {
        if (!Array.isArray(courses) || courses.length === 0) {
            return [];
        }

        const recommendedSet = new Set(
            (Array.isArray(recommendedCourseIds) ? recommendedCourseIds : []).filter(Boolean),
        );
        let rows: any[] = courses.map((course) => ({ ...course }));
        rows = await this.attachCourseContentCounts(rows);
        rows = await this.attachReviewStats(rows);

        const courseIds = rows.map((row) => row.id).filter(Boolean);
        let favoriteSet = new Set<string>();
        let enrolledSet = new Set<string>();
        const accessViaBundleById = new Map<string, boolean>();

        if (userId && courseIds.length > 0) {
            enrolledSet = await this.courseEnrollmentService.getEffectiveEnrolledCourseIdSet(userId);
            const favoriteRows = await this.courseFavoriteRepository.find({
                where: { userId, courseId: In(courseIds) },
                select: ['courseId'],
            });
            favoriteSet = new Set(favoriteRows.map((row) => row.courseId));
            const breakdowns = await Promise.all(
                courseIds.map((courseId) =>
                    this.courseEnrollmentService
                        .getEnrollmentBreakdown(userId, courseId)
                        .then((breakdown) => ({ courseId, accessViaBundle: breakdown.accessViaBundle })),
                ),
            );
            breakdowns.forEach(({ courseId, accessViaBundle }) => {
                accessViaBundleById.set(courseId, accessViaBundle);
            });
        }

        return rows.map((row) => ({
            id: row.id,
            title: row.title,
            image: row.image,
            level: row.level,
            freeOrPaid: row.freeOrPaid,
            amount: row.amount,
            isBundle: row.isBundle ?? false,
            bundleCourseIds: Array.isArray(row.bundleCourseIds) ? row.bundleCourseIds : [],
            isRecommended: recommendedSet.has(row.id),
            modulesCount: row.modulesCount ?? 0,
            sectionsCount: row.sectionsCount ?? 0,
            totalDurationSeconds: row.totalDurationSeconds ?? 0,
            totalDuration: row.totalDuration ?? '',
            reviewStats: row.reviewStats ?? { averageRating: 0, reviewCount: 0 },
            ...(userId
                ? {
                      isFavorite: favoriteSet.has(row.id),
                      isEnrolled: enrolledSet.has(row.id),
                      accessViaBundle: accessViaBundleById.get(row.id) ?? false,
                  }
                : {}),
        }));
    }

    /** Returns which of the given ids exist. Used e.g. for checkout validation. */
    async findExistingIds(ids: string[]): Promise<{ existing: string[]; missing: string[] }> {
        const unique = [...new Set(ids)].filter(Boolean);
        if (unique.length === 0) return { existing: [], missing: [] };
        const courses = await this.courseRepository.find({
            where: { id: In(unique) },
            select: ['id'],
        });
        const existing = courses.map((c) => c.id);
        const missing = unique.filter((id) => !existing.includes(id));
        return { existing, missing };
    }

    /** Deduplicate, drop self-reference, ensure all IDs exist. */
    private async normalizeAndValidateBundleIds(
        ids: string[],
        excludeCourseId?: string,
    ): Promise<string[]> {
        const unique = [...new Set(ids.map((x) => String(x).trim()).filter(Boolean))].filter(
            (id) => !excludeCourseId || id !== excludeCourseId,
        );
        if (unique.length === 0) {
            return [];
        }
        const { missing } = await this.findExistingIds(unique);
        if (missing.length > 0) {
            throw new BadRequestException(`Invalid bundle course id(s): ${missing.join(', ')}`);
        }
        return unique;
    }

    async create(createCourseDto: CreateCourseDto): Promise<{ message: string; course: CourseEntity }> {
        const normalizedTitle = String(createCourseDto.title || '').trim();
        if (!normalizedTitle) {
            throw new BadRequestException('Course title is required');
        }

        const courseData: Partial<CourseEntity> = {
            title: normalizedTitle,
            freeOrPaid: createCourseDto.freeOrPaid ?? false,
            level: normalizeCourseLevel(createCourseDto.level),
            amount: createCourseDto.freeOrPaid && createCourseDto.amount ? createCourseDto.amount : 0,
        };
        courseData.categoryId = createCourseDto.categoryId?.trim() || null;

        if (createCourseDto.description !== undefined) {
            courseData.description = createCourseDto.description;
        }

        if (createCourseDto.image !== undefined) {
            courseData.image = createCourseDto.image;
        }

        if (createCourseDto.languageIds !== undefined) {
            courseData.languageIds = normalizeStringArray(createCourseDto.languageIds);
        }
        if (createCourseDto.roles !== undefined) {
            courseData.roles = normalizeStringArray(createCourseDto.roles);
        }
        if (createCourseDto.aiLevel !== undefined) {
            courseData.aiLevel = normalizeStringArray(createCourseDto.aiLevel);
        }
        if (createCourseDto.goals !== undefined) {
            courseData.goals = normalizeStringArray(createCourseDto.goals);
        }
        if (createCourseDto.useAreas !== undefined) {
            courseData.useAreas = normalizeStringArray(createCourseDto.useAreas);
        }
        if (createCourseDto.speakerIds !== undefined) {
            courseData.speakerIds = normalizeStringArray(createCourseDto.speakerIds);
        }
        if (createCourseDto.marketData !== undefined) {
            courseData.marketData = createCourseDto.marketData;
        }

        const isBundle = coerceBoolean(createCourseDto.isBundle, false);
        courseData.isBundle = isBundle;
        if (isBundle) {
            const raw = normalizeStringArray(createCourseDto.bundleCourseIds);
            courseData.bundleCourseIds = await this.normalizeAndValidateBundleIds(raw);
        } else {
            courseData.bundleCourseIds = null;
        }

        const course = this.courseRepository.create(courseData);

        await this.courseRepository.save(course);
        return {
            message: 'Course created successfully',
            course: course,
        };
    }

    async update(id: string, updateCourseDto: UpdateCourseDto): Promise<{ message: string; course: CourseEntity }> {
        const course = await this.courseRepository.findOne({ where: { id } });
        if (!course) {
            throw new NotFoundException('Course not found');
        }

        // Delete old file if a NEW image is being uploaded (not when clearing)
        if (updateCourseDto.image !== undefined && updateCourseDto.image && course.image) {
            // Only delete if it's a file path (not base64 or full URL)
            if (!course.image.startsWith('data:') && !course.image.startsWith('http')) {
                const oldFilePath = join(process.cwd(), course.image);
                if (existsSync(oldFilePath)) {
                    try {
                        await unlink(oldFilePath);
                    } catch (error) {
                        console.error('Error deleting old course image:', error);
                    }
                }
            }
        }

        // Update fields if provided
        if (updateCourseDto.title !== undefined) {
            course.title = updateCourseDto.title;
        }
        if (updateCourseDto.description !== undefined) {
            course.description = updateCourseDto.description;
        }
        if (updateCourseDto.image !== undefined) {
            // Empty string means clear the image (set DB column to null), otherwise set the new image URL
            course.image  = updateCourseDto.image === '' ? null : updateCourseDto.image;
        }
        if (updateCourseDto.freeOrPaid !== undefined) {
            course.freeOrPaid = updateCourseDto.freeOrPaid;
            // If switching to free, set amount to 0
            if (!updateCourseDto.freeOrPaid) {
                course.amount = 0;
            }
        }
        if (updateCourseDto.amount !== undefined) {
            course.amount = updateCourseDto.freeOrPaid ? updateCourseDto.amount : 0;
        }
        if (updateCourseDto.level !== undefined) {
            course.level = normalizeCourseLevel(updateCourseDto.level);
        }
        if (updateCourseDto.categoryId !== undefined) {
            course.categoryId = updateCourseDto.categoryId?.trim() || null;
        }
        if (updateCourseDto.languageIds !== undefined) {
            course.languageIds = normalizeStringArray(updateCourseDto.languageIds);
        }
        if (updateCourseDto.roles !== undefined) {
            course.roles = normalizeStringArray(updateCourseDto.roles);
        }
        if (updateCourseDto.aiLevel !== undefined) {
            course.aiLevel = normalizeStringArray(updateCourseDto.aiLevel);
        }
        if (updateCourseDto.goals !== undefined) {
            course.goals = normalizeStringArray(updateCourseDto.goals);
        }
        if (updateCourseDto.useAreas !== undefined) {
            course.useAreas = normalizeStringArray(updateCourseDto.useAreas);
        }
        if (updateCourseDto.speakerIds !== undefined) {
            course.speakerIds = normalizeStringArray(updateCourseDto.speakerIds);
        }
        if (updateCourseDto.marketData !== undefined) {
            course.marketData = updateCourseDto.marketData;
        }

        const isBundleTouched = updateCourseDto.isBundle !== undefined;
        const bundleIdsTouched = updateCourseDto.bundleCourseIds !== undefined;
        if (isBundleTouched || bundleIdsTouched) {
            const nextIsBundle = isBundleTouched
                ? coerceBoolean(updateCourseDto.isBundle, false)
                : course.isBundle;
            course.isBundle = nextIsBundle;
            if (!nextIsBundle) {
                course.bundleCourseIds = null;
            } else {
                const raw = bundleIdsTouched
                    ? normalizeStringArray(updateCourseDto.bundleCourseIds)
                    : [...(course.bundleCourseIds || [])];
                course.bundleCourseIds = await this.normalizeAndValidateBundleIds(raw, id);
            }
        }

        await this.courseRepository.save(course);
        return {
            message: 'Course updated successfully',
            course: course,
        };
    }

    async delete(id: string): Promise<{ message: string }> {
        const course = await this.courseRepository.findOne({ where: { id } });
        if (!course) {
            throw new NotFoundException('Course not found');
        }

        // Delete associated image file
        if (course.image) {
            // Only delete if it's a file path (not base64 or full URL)
            if (!course.image.startsWith('data:') && !course.image.startsWith('http')) {
                const imagePath = join(process.cwd(), course.image);
                if (existsSync(imagePath)) {
                    try {
                        await unlink(imagePath);
                    } catch (error) {
                        console.error('Error deleting course image:', error);
                    }
                }
            }
        }

        await this.courseRepository.remove(course);
        return { message: 'Course deleted successfully' };
    }
}

