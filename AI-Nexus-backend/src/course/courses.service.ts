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
import {
  buildPaginatedResponse,
  PaginatedQueryOptions,
  PaginatedResponse,
  normalizePaginatedQuery,
} from '../common/pagination/paginated-list.util';
import { CourseEnrollmentService } from './course-enrollment.service';

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
};

type GroupKey = 'basic' | 'intermediate' | 'advance';

type GroupedCoursesQuery = {
  userId?: string;
  group?: string;
  search?: string;
  freeOrPaid?: boolean;
  isFavorite?: boolean;
  isEnrolled?: boolean;
  defaultPage?: number;
  defaultLimit?: number;
  beginnerPage?: number;
  beginnerLimit?: number;
  basicPage?: number;
  basicLimit?: number;
  intermediatePage?: number;
  intermediateLimit?: number;
  advancePage?: number;
  advanceLimit?: number;
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

function normalizeGroupKey(group?: string): GroupKey | undefined {
  const normalized = group?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'basic' || normalized === 'beginner') return 'basic';
  if (normalized === 'intermediate') return 'intermediate';
  if (normalized === 'advance' || normalized === 'advanced') return 'advance';
  return undefined;
}

function toGroupName(group: GroupKey): string {
  if (group === 'basic') return 'AI Foundation';
  if (group === 'intermediate') return 'AI in Accounting Workflows';
  return 'AI Builder Track';
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
        private readonly courseEnrollmentService: CourseEnrollmentService,
    ) { }

    async getAll(options: GetCoursesOptions & { usePagination: true }): Promise<PaginatedResponse<any>>;
    async getAll(options?: GetCoursesOptions): Promise<any[]>;
    async getAll(options: GetCoursesOptions = {}): Promise<any[] | PaginatedResponse<any>> {
        const normalizedQuery = normalizePaginatedQuery(options, 12, 100);
        const userId = options.userId;
        const favoriteFilter = options.isFavorite;
        const enrolledFilter = options.isEnrolled;
        const usePagination = options.usePagination === true;

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

        if (normalizedQuery.hasSearch) {
            baseQuery.andWhere('(course.title ILIKE :search OR course.description ILIKE :search)', {
                search: `%${normalizedQuery.search}%`,
            });
        }

        if (typeof options.freeOrPaid === 'boolean') {
            baseQuery.andWhere('course.freeOrPaid = :freeOrPaid', { freeOrPaid: options.freeOrPaid });
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
        const courseQuery = baseQuery.clone().orderBy('course.createdAt', 'DESC');
        const courses = usePagination
            ? await courseQuery
                .skip((normalizedQuery.page - 1) * normalizedQuery.limit)
                .take(normalizedQuery.limit)
                .getMany()
            : await courseQuery.getMany();

        const courseIds = courses.map((course) => course.id);
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

        const data = courses.map((course) => {
            const effective = userId ? effectiveEnrolledIds.has(course.id) : false;
            const directOnPage = userId ? directEnrolledOnPage.has(course.id) : false;
            return {
                ...course,
                isFavorite: userId ? favoriteIds.has(course.id) : false,
                isEnrolled: effective,
                accessViaBundle: userId ? effective && !directOnPage : false,
            };
        });

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
        const selectedGroup = normalizeGroupKey(query.group);
        const groups: GroupKey[] = selectedGroup ? [selectedGroup] : ['basic', 'intermediate', 'advance'];
        const defaultPage = query.defaultPage ?? 1;
        const defaultLimit = query.defaultLimit ?? 12;

        return Promise.all(
            groups.map(async (groupKey, index) => {
                const page =
                    groupKey === 'basic'
                        ? query.beginnerPage ?? query.basicPage ?? defaultPage
                        : groupKey === 'intermediate'
                          ? query.intermediatePage ?? defaultPage
                          : query.advancePage ?? defaultPage;
                const limit =
                    groupKey === 'basic'
                        ? query.beginnerLimit ?? query.basicLimit ?? defaultLimit
                        : groupKey === 'intermediate'
                          ? query.intermediateLimit ?? defaultLimit
                          : query.advanceLimit ?? defaultLimit;

                const result = (await this.getAll({
                    userId: query.userId,
                    usePagination: true,
                    page,
                    limit,
                    group: groupKey,
                    search: query.search,
                    freeOrPaid: query.freeOrPaid,
                    isFavorite: query.isFavorite,
                    isEnrolled: query.isEnrolled,
                })) as PaginatedResponse<any>;

                return {
                    groupId: `group_${index + 1}`,
                    groupName: toGroupName(groupKey),
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

    async getCourseGroups(activeOnly = true) {
        const where = activeOnly ? { isActive: true } : {};
        return this.courseGroupRepository.find({
            where,
            order: { createdAt: 'ASC' },
        });
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
        const seedFilePath = join(process.cwd(), 'src', 'course', 'data', 'dummy-courses.json');
        let fileCourses: Array<Partial<CreateCourseDto>> = [];
        if (existsSync(seedFilePath)) {
            try {
                const raw = readFileSync(seedFilePath, 'utf-8');
                const parsed = JSON.parse(raw) as unknown;
                fileCourses = Array.isArray(parsed) ? (parsed as Array<Partial<CreateCourseDto>>) : [];
            } catch {
                fileCourses = [];
            }
        }

        const seedSource = Array.isArray(inputCourses) && inputCourses.length > 0
            ? inputCourses
            : fileCourses;

        const prepared = seedSource.map((item, index) =>
            this.courseRepository.create({
                title: item.title?.trim() || `Dummy Course ${index + 1}`,
                description:
                    item.description ||
                    `Auto-generated demo course ${index + 1} for testing flows and UI.`,
                freeOrPaid: Boolean(item.freeOrPaid),
                amount: Boolean(item.freeOrPaid) ? Number(item.amount || 0) : 0,
                level: normalizeCourseLevel(item.level),
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

    async getById(id: string): Promise<CourseEntity> {
        const course = await this.courseRepository.findOne({ where: { id } });
        if (!course) {
            throw new NotFoundException("Course not found");
        }
        return course;
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

        if (createCourseDto.description !== undefined) {
            courseData.description = createCourseDto.description;
        }

        if (createCourseDto.image !== undefined) {
            courseData.image = createCourseDto.image;
        }

        if (createCourseDto.languageIds !== undefined) {
            courseData.languageIds = normalizeStringArray(createCourseDto.languageIds);
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
        if (updateCourseDto.languageIds !== undefined) {
            course.languageIds = normalizeStringArray(updateCourseDto.languageIds);
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

