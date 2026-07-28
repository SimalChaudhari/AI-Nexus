//courses.controller.ts
import {
    Controller,
    HttpStatus,
    Param,
    Get,
    Post,
    Delete,
    Put,
    Patch,
    Body,
    Query,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    ForbiddenException,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response, Request } from 'express';
import { UserRole } from '../user/users.entity';
import { CourseService } from './courses.service';
import { CreateCourseDto, SeedDummyCoursesDto, UpdateCourseDto } from './courses.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { LocalStorageService } from '../service/local-storage.service';
import { SpotlightrService } from '../service/spotlightr.service';
import { VideoDurationService } from '../service/video-duration.service';
import { CourseModuleService } from './course-module.service';
import { CreateCourseModuleDto, UpdateCourseModuleDto } from './course-module.dto';
import { CourseModuleSectionService } from './course-module-section.service';
import {
  CreateCourseModuleSectionDto,
  UpdateCourseModuleSectionDto,
} from './course-module-section.dto';
import { CourseWatchProgressService } from './course-watch-progress.service';
import { CourseSectionWatchProgressService } from './course-section-watch-progress.service';
import { UpdateCourseSectionWatchProgressDto } from './course-section-watch-progress.dto';
import { resolveCoursePillarIndex } from './course-program-cpe-summary.util';
import { CourseFavoriteService } from './course-favorite.service';
import { CourseSectionFavoriteService } from './course-section-favorite.service';
import { CourseEnrollmentService } from './course-enrollment.service';
import { CourseQuestionBankService } from './course-question-bank.service';
import {
  CreateCourseQuestionBankDto,
  UpdateCourseQuestionBankDto,
} from './course-question-bank.dto';
import { CheckCourseQuestionBankDto } from './course-question-bank-check.dto';
import {
  CompleteCourseQuestionAttemptDto,
  StartCourseQuestionAttemptDto,
} from './course-question-bank-attempt.dto';
import { ManualVerifyAssignmentSubmissionDto } from './course-assignment-manual-verify.dto';
import { SubmitAssignmentSubmissionDto } from './course-assignment-submit.dto';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parseBooleanQuery, parsePositiveInteger } from '../common/pagination/paginated-list.util';
import { randomUUID } from 'crypto';
import { SpeakerService } from '../speaker/speaker.service';
import { SpeakerEntity } from '../speaker/speaker.entity';
import { LanguageService } from '../language/language.service';
import { ReviewService } from '../review/review.service';
import { CourseCertificateService } from './course-certificate.service';
import { CourseQuizAssessmentProgressService } from './course-quiz-assessment-progress.service';
import { buildCourseOverallProgress } from './course-overall-progress.util';
import { AppSettingsService } from '../app-settings/app-settings.service';
import {
    ASSESSMENT_ADMIN_FILE_EXT,
    LEARNER_SUBMISSION_FILE_EXT,
} from './course-assignment-file.types';
async function orderedSpeakersForCourse(
    speakerService: SpeakerService,
    speakerIds: unknown,
): Promise<SpeakerEntity[]> {
    const ids = Array.isArray(speakerIds)
        ? speakerIds.filter((x): x is string => typeof x === 'string' && String(x).trim().length > 0)
        : [];
    if (ids.length === 0) return [];
    const rows = await speakerService.findByIds(ids);
    const map = new Map(rows.map((s) => [s.id, s]));
    return ids.map((id) => map.get(id)).filter((s): s is SpeakerEntity => Boolean(s));
}

async function orderedLanguagesForCourse(
    languageService: LanguageService,
    languageIds: unknown,
): Promise<Array<{ id: string; name: string }>> {
    const ids = Array.isArray(languageIds)
        ? languageIds.filter((x): x is string => typeof x === 'string' && String(x).trim().length > 0)
        : [];
    if (ids.length === 0) return [];
    const rows = await languageService.findByIds(ids);
    const map = new Map(rows.map((l) => [l.id, l]));
    return ids
        .map((id) => map.get(id))
        .filter(Boolean)
        .map((row) => ({
            id: row!.id,
            name: row!.title || '',
        }));
}

// Helper to normalize absolute URLs to "/uploads/..." paths for LocalStorageService
function toUploadsPath(url?: string | null): string | null {
    if (!url) return null;
    const idx = url.indexOf('/uploads/');
    if (idx === -1) return null;
    return url.slice(idx);
}

const parseEnvPositiveNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const IMAGE_LIMIT_BYTES =
    parseEnvPositiveNumber(process.env.UPLOAD_IMAGE_MAX_MB, 50) * 1024 * 1024;
const SECTION_VIDEO_LIMIT_BYTES =
    parseEnvPositiveNumber(process.env.UPLOAD_SECTION_VIDEO_MAX_GB, 20) * 1024 * 1024 * 1024;

const assessmentAdminFileFilter = (allowedExt: RegExp) =>
    (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
        const name = String(file.originalname || '').toLowerCase();
        cb(null, allowedExt.test(name));
    };

const learnerSubmissionFileFilter = (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
) => {
    const name = String(file.originalname || '').toLowerCase();
    cb(null, LEARNER_SUBMISSION_FILE_EXT.test(name));
};

type AssessmentAdminUploadBody = {
    replace?: boolean | string;
    keepFiles?: string | unknown[];
};

const parseAssessmentAdminUploadOptions = (body: AssessmentAdminUploadBody) => {
    let keepFiles: unknown = body?.keepFiles;
    if (typeof keepFiles === 'string') {
        try {
            keepFiles = JSON.parse(keepFiles);
        } catch {
            keepFiles = [];
        }
    }
    return {
        replace:
            body?.replace === undefined
                ? true
                : body.replace === true || body.replace === 'true' || body.replace === '1',
        keepFiles,
    };
};

const flattenAssessmentAdminUploads = (
    uploaded?: { files?: Express.Multer.File[]; file?: Express.Multer.File[] },
): Express.Multer.File[] => [...(uploaded?.files || []), ...(uploaded?.file || [])];

const saveAssignmentUploadFile = (
    localStorageService: LocalStorageService,
    uploadFile: Express.Multer.File,
    folder: string,
) => {
    const original = String(uploadFile.originalname || 'submission').trim();
    const ext = original.includes('.') ? original.slice(original.lastIndexOf('.')) : '';
    const base = ext ? original.slice(0, -ext.length) : original;
    return localStorageService.saveFile(uploadFile, folder, {
        fileName: `${Date.now()}-${base}`,
    });
};

const parseOptionalPositiveInteger = (value?: string): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    return parsePositiveInteger(value, 1);
};

const isPaidCourseValue = (value: unknown): boolean =>
    value === true || value === 1 || value === 'true' || value === '1';

const toOptionalNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
};

type RawCourseSectionPayload = {
    title?: unknown;
    subtitle?: unknown;
    videoUrl?: unknown;
    description?: unknown;
    content?: unknown;
    watchtime?: unknown;
    durationTime?: unknown;
    completionPercentage?: unknown;
    images?: unknown;
    attachments?: unknown;
    learningMaterials?: unknown;
    sortOrder?: unknown;
};

type RawCourseModulePayload = {
    title?: unknown;
    description?: unknown;
    sortOrder?: unknown;
    sections?: unknown;
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const list = value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0);
    return list.length > 0 ? list : undefined;
};

const parseModulesPayload = (raw: unknown): RawCourseModulePayload[] => {
    const parseJsonSafe = (value: unknown): unknown => {
        if (typeof value !== 'string') return value;
        const text = value.trim();
        if (!text) return undefined;
        try {
            return JSON.parse(text);
        } catch {
            return value;
        }
    };

    const toArray = (value: unknown): RawCourseModulePayload[] => {
        const rawItems = Array.isArray(value)
            ? value
            : value && typeof value === 'object'
                ? Object.values(value as Record<string, unknown>)
                : [];
        return rawItems
            .map((item) => {
                const normalized = parseJsonSafe(item);
                return normalized && typeof normalized === 'object'
                    ? (normalized as RawCourseModulePayload)
                    : undefined;
            })
            .filter((item): item is RawCourseModulePayload => Boolean(item));
    };

    let parsed = parseJsonSafe(raw);
    // Handle double-encoded JSON payloads.
    if (typeof parsed === 'string') {
        parsed = parseJsonSafe(parsed);
    }
    return toArray(parsed);
};

const parseSectionsPayload = (raw: unknown): RawCourseSectionPayload[] => {
    const parseJsonSafe = (value: unknown): unknown => {
        if (typeof value !== 'string') return value;
        const text = value.trim();
        if (!text) return undefined;
        try {
            return JSON.parse(text);
        } catch {
            return value;
        }
    };

    const toArray = (value: unknown): RawCourseSectionPayload[] => {
        const rawItems = Array.isArray(value)
            ? value
            : value && typeof value === 'object'
                ? Object.values(value as Record<string, unknown>)
                : [];
        return rawItems
            .map((item) => {
                const normalized = parseJsonSafe(item);
                return normalized && typeof normalized === 'object'
                    ? (normalized as RawCourseSectionPayload)
                    : undefined;
            })
            .filter((item): item is RawCourseSectionPayload => Boolean(item));
    };

    let parsed = parseJsonSafe(raw);
    if (typeof parsed === 'string') {
        parsed = parseJsonSafe(parsed);
    }
    return toArray(parsed);
};

const countParsedSections = (modules: RawCourseModulePayload[]): number =>
    (Array.isArray(modules) ? modules : []).reduce((acc, mod) => {
        const sections = parseSectionsPayload(mod?.sections);
        return acc + sections.length;
    }, 0);

@ApiTags('Courses')
@Controller('courses')
export class CourseController {
    constructor(
        private readonly courseService: CourseService,
        private readonly localStorageService: LocalStorageService,
        private readonly spotlightrService: SpotlightrService,
        private readonly videoDurationService: VideoDurationService,
        private readonly courseModuleService: CourseModuleService,
        private readonly courseModuleSectionService: CourseModuleSectionService,
        private readonly courseWatchProgressService: CourseWatchProgressService,
        private readonly courseSectionWatchProgressService: CourseSectionWatchProgressService,
        private readonly courseFavoriteService: CourseFavoriteService,
        private readonly courseSectionFavoriteService: CourseSectionFavoriteService,
        private readonly courseEnrollmentService: CourseEnrollmentService,
        private readonly courseQuestionBankService: CourseQuestionBankService,
        private readonly speakerService: SpeakerService,
        private readonly languageService: LanguageService,
        private readonly reviewService: ReviewService,
        private readonly courseCertificateService: CourseCertificateService,
        private readonly courseQuizAssessmentProgressService: CourseQuizAssessmentProgressService,
        private readonly appSettingsService: AppSettingsService,
    ) {}

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'List courses with pagination and optional filters' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 12 })
    @ApiQuery({ name: 'search', required: false, description: 'Search in course title and description' })
    @ApiQuery({ name: 'group', required: false, description: 'Group filter: basic | intermediate | advance' })
    @ApiQuery({ name: 'freeOrPaid', required: false, description: 'Filter paid status: true = paid, false = free', example: false })
    @ApiQuery({ name: 'isFavorite', required: false, description: 'Filter by current user favorite status', example: true })
    @ApiQuery({ name: 'isEnrolled', required: false, description: 'Filter by current user enrolled status', example: true })
    @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category UUID' })
    @ApiQuery({ name: 'excludeBundles', required: false, description: 'When true, exclude bundle courses', example: true })
    async getAllCourses(
        @Req() request: Request,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('group') group?: string,
        @Query('freeOrPaid') freeOrPaid?: string,
        @Query('isFavorite') isFavorite?: string,
        @Query('isEnrolled') isEnrolled?: string,
        @Query('categoryId') categoryId?: string,
        @Query('excludeBundles') excludeBundles?: string,
        @Res() response?: Response,
    ) {
        const hasFilters = Boolean(
            page || limit || search || group || freeOrPaid || isFavorite || isEnrolled || categoryId || excludeBundles
        );
        const userId = (request as any).user?.id;

        if (hasFilters) {
            const result = await this.courseService.getAll({
                userId,
                usePagination: true,
                page: parsePositiveInteger(page, 1),
                limit: parsePositiveInteger(limit, 12),
                search,
                group,
                freeOrPaid: parseBooleanQuery(freeOrPaid),
                isFavorite: parseBooleanQuery(isFavorite),
                isEnrolled: parseBooleanQuery(isEnrolled),
                categoryId: categoryId?.trim() || undefined,
                excludeBundles: parseBooleanQuery(excludeBundles) ?? undefined,
            });

            return response!.status(HttpStatus.OK).json({
                length: result.data.length,
                data: result.data,
                pagination: result.pagination,
            });
        }

        const result = await this.courseService.getAll({ userId });

        return response!.status(HttpStatus.OK).json({
            length: result.length,
            data: result,
        });
    }

    @Get('grouped/list')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'List courses grouped with independent pagination metadata per group' })
    @ApiQuery({ name: 'group', required: false, description: 'Optional group: category slug/title/id or recommended' })
    @ApiQuery({ name: 'page', required: false, description: 'Default page for all groups', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Default limit for all groups', example: 12 })
    @ApiQuery({ name: 'recommendedPage', required: false, description: 'Page for recommended courses', example: 1 })
    @ApiQuery({ name: 'recommendedLimit', required: false, description: 'Limit for recommended courses', example: 5 })
    @ApiQuery({ name: 'search', required: false, description: 'Search in title/description' })
    @ApiQuery({ name: 'freeOrPaid', required: false, description: 'true = paid, false = free' })
    @ApiQuery({ name: 'isFavorite', required: false, description: 'true/false favorite filter' })
    @ApiQuery({ name: 'isEnrolled', required: false, description: 'true/false enrollment filter' })
    async getGroupedCourses(
        @Req() request: Request,
        @Query('group') group?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('freeOrPaid') freeOrPaid?: string,
        @Query('isFavorite') isFavorite?: string,
        @Query('isEnrolled') isEnrolled?: string,
        @Query('recommendedPage') recommendedPage?: string,
        @Query('recommendedLimit') recommendedLimit?: string,
        @Res() response?: Response,
    ) {
        const userId = (request as any).user?.id;
        const requestedGroup = String(group || '').trim().toLowerCase();
        const isRecommendedOnlyRequest = requestedGroup === 'recommended';
        let recommendation: { persona: string | null; courseIds: string[] } = {
            persona: null,
            courseIds: [],
        };
        let recommendedCourseIds: string[] = [];
        if (userId) {
            recommendation = await this.appSettingsService.getRecommendationsForUser(userId);
            recommendedCourseIds = Array.isArray(recommendation?.courseIds) ? recommendation.courseIds : [];
        }
        const recommendedResult = await this.courseService.getRecommendedCourses({
            userId,
            recommendedCourseIds,
            page: parsePositiveInteger(recommendedPage || page, 1),
            limit: parsePositiveInteger(recommendedLimit || limit, 5),
            search,
            freeOrPaid: parseBooleanQuery(freeOrPaid),
            isFavorite: parseBooleanQuery(isFavorite),
            isEnrolled: parseBooleanQuery(isEnrolled),
        });
        const recommendedGroup =
            recommendedCourseIds.length > 0
                ? {
                    groupId: 'group_recommended',
                    groupName: 'Recommended',
                    groupKey: 'recommended',
                    pagination: {
                        page: recommendedResult.pagination.page,
                        limit: recommendedResult.pagination.limit,
                        totalItems: recommendedResult.pagination.totalItems,
                        totalPages: recommendedResult.pagination.totalPages,
                        hasNextPage: recommendedResult.pagination.hasNextPage,
                        hasPrevPage: recommendedResult.pagination.hasPreviousPage,
                    },
                    items: recommendedResult.data,
                }
                : null;

        let groups: any[] = [];
        if (!isRecommendedOnlyRequest) {
            groups = await this.courseService.getGroupedCourses({
                userId,
                group,
                search,
                freeOrPaid: parseBooleanQuery(freeOrPaid),
                isFavorite: parseBooleanQuery(isFavorite),
                isEnrolled: parseBooleanQuery(isEnrolled),
                defaultPage: parsePositiveInteger(page, 1),
                defaultLimit: parsePositiveInteger(limit, 12),
                recommendedCourseIds,
            });
        }

        const groupsWithRecommended = isRecommendedOnlyRequest
            ? (recommendedGroup ? [recommendedGroup] : [])
            : (recommendedGroup
                ? [recommendedGroup, ...groups]
                : groups);

        return response!.status(HttpStatus.OK).json({
            success: true,
            message: 'Data fetched successfully',
            data: {
                groups: groupsWithRecommended,
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: (request.headers['x-request-id'] as string) || randomUUID(),
            },
        });
    }

    @Get('groups')
    @ApiOperation({ summary: 'List active course groups' })
    async getCourseGroups(@Res() response: Response) {
        const groups = await this.courseService.getCourseGroups(true);
        return response.status(HttpStatus.OK).json({
            success: true,
            data: groups,
        });
    }

    @Get('form-options')
    @ApiOperation({ summary: 'Get dynamic options for course form fields' })
    async getCourseFormOptions(@Res() response: Response) {
        const options = await this.courseService.getCourseFormOptions();
        return response.status(HttpStatus.OK).json({
            success: true,
            data: options,
        });
    }

    @Get('options')
    @ApiOperation({ summary: 'Get dynamic options by type (level/role/aiLevel/goal/useArea)' })
    async getCourseOptions(
        @Query('type') type: string,
        @Res() response: Response,
    ) {
        const data = await this.courseService.getCourseOptions(type);
        return response.status(HttpStatus.OK).json({
            success: true,
            data,
        });
    }

    @Post('options')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Create dynamic option (admin)' })
    async createCourseOption(
        @Body() body: { type?: string; label?: string },
        @Res() response: Response,
    ) {
        const created = await this.courseService.createCourseOption(body?.type || '', body?.label || '');
        return response.status(HttpStatus.CREATED).json({
            success: true,
            data: created,
        });
    }

    @Put('options/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update dynamic option label (admin)' })
    async updateCourseOption(
        @Param('id') id: string,
        @Body() body: { label?: string },
        @Res() response: Response,
    ) {
        const updated = await this.courseService.updateCourseOption(id, body?.label || '');
        return response.status(HttpStatus.OK).json({
            success: true,
            data: updated,
        });
    }

    @Delete('options/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete dynamic option (admin)' })
    async deleteCourseOption(
        @Param('id') id: string,
        @Res() response: Response,
    ) {
        const result = await this.courseService.deleteCourseOption(id);
        return response.status(HttpStatus.OK).json({
            success: true,
            data: result,
        });
    }

    @Post('groups')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Create a course group (admin)' })
    async createCourseGroup(
        @Body() body: { name?: string },
        @Res() response: Response,
    ) {
        if (!body?.name || !body.name.trim()) {
            return response.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Group name is required',
            });
        }

        const group = await this.courseService.createCourseGroup(body.name);
        return response.status(HttpStatus.CREATED).json({
            success: true,
            message: 'Group created successfully',
            data: group,
        });
    }

    @Post('seed/dummy')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Seed dummy courses from JSON file or request body (admin)' })
    @ApiBody({ type: SeedDummyCoursesDto, required: false })
    async seedDummyCourses(
        @Body() body: SeedDummyCoursesDto,
        @Res() response: Response,
    ) {
        const result = await this.courseService.seedDummyCourses(body?.courses);
        return response.status(HttpStatus.CREATED).json({
            success: true,
            message: `${result.createdCount} dummy courses created successfully`,
            data: {
                count: result.createdCount,
                courses: result.courses,
            },
        });
    }

    @Post('test/create-dummy-courses')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Test API: create dummy courses only when explicitly triggered (admin)' })
    async createDummyCoursesForTesting(@Res() response: Response) {
        const result = await this.courseService.seedDummyCourses();
        return response.status(HttpStatus.CREATED).json({
            success: true,
            message: `Test seed executed. ${result.createdCount} courses created.`,
            data: {
                count: result.createdCount,
                courses: result.courses,
            },
        });
    }

    @Get(':courseId/modules/with-sections')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Get course modules with nested sections' })
    async getCourseModulesWithSections(
        @Param('courseId') courseId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        let unlockInfo: { isLocked: boolean; previousCourseId: string | null } = {
            isLocked: false,
            previousCourseId: null,
        };
        const userId = (request as any).user?.id;
        const userRole = (request as any).user?.role;
        const shouldEnforceSequentialLock = userRole === UserRole.User;
        if (userId && shouldEnforceSequentialLock) {
            const unlock = await this.courseWatchProgressService.getUnlockInfo(userId, courseId);
            unlockInfo = { isLocked: unlock.isLocked, previousCourseId: unlock.previousCourseId };
        }
        const sectionProgressBySectionId =
            userId
                ? await this.courseSectionWatchProgressService.getAllSectionProgressForCourse(userId, courseId)
                : {};
        const modules = await this.courseModuleService.findByCourseId(courseId);
        const withSections = await Promise.all(
            modules.map(async (mod) => {
                const sections = await this.courseModuleSectionService.findByModuleId(mod.id);
                const sectionsWithProgress = sections.map((section) => ({
                    ...section,
                    sectionProgress: sectionProgressBySectionId[section.id] ?? null,
                }));
                return { ...mod, sections: sectionsWithProgress };
            }),
        );
        return response.status(HttpStatus.OK).json({
            data: withSections,
            meta: unlockInfo,
        });
    }

    @Get(':courseId/content-deletion-guard')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({
        summary:
            'Whether modules, sections, or the course cannot be deleted because certificates were issued',
    })
    async getCourseContentDeletionGuard(
        @Param('courseId') courseId: string,
        @Res() response: Response,
    ) {
        await this.courseService.getById(courseId);
        const guard = await this.courseCertificateService.getCourseContentDeletionGuard(courseId);
        return response.status(HttpStatus.OK).json({ data: guard });
    }

    @Get(':courseId/player-context')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Get full player context for a course (course, enrollment, modules, section progress)' })
    async getCoursePlayerContext(
        @Param('courseId') courseId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        const userRole = (request as any).user?.role;

        const courseRow = await this.courseService.getById(courseId);
        const speakers = await orderedSpeakersForCourse(this.speakerService, courseRow.speakerIds);
        const languages = await orderedLanguagesForCourse(this.languageService, courseRow.languageIds);
        const {
            languageIds: _languageIds,
            speakerIds: _speakerIds,
            categoryId: _categoryId,
            ...courseBase
        } = courseRow as any;
        const course = { ...courseBase, speakers, languages };

        // Enrollment status (only meaningful for authenticated users)
        let enrolled = false;
        if (userId) {
            enrolled = await this.courseEnrollmentService.isEnrolled(userId, courseId);
        }

        // Module + section tree with per-section progress and sequential locking meta
        let unlockInfo: { isLocked: boolean; previousCourseId: string | null } = {
            isLocked: false,
            previousCourseId: null,
        };
        const shouldEnforceSequentialLock = userRole === UserRole.User;
        if (userId && shouldEnforceSequentialLock) {
            const unlock = await this.courseWatchProgressService.getUnlockInfo(userId, courseId);
            unlockInfo = { isLocked: unlock.isLocked, previousCourseId: unlock.previousCourseId };
        }
        const sectionProgressBySectionId =
            userId
                ? await this.courseSectionWatchProgressService.getAllSectionProgressForCourse(userId, courseId)
                : {};
        const modules = await this.courseModuleService.findByCourseId(courseId);
        const modulesWithSections = await Promise.all(
            modules.map(async (mod) => {
                const sections = await this.courseModuleSectionService.findByModuleId(mod.id);
                const sectionsWithProgress = sections.map((section) => ({
                    ...section,
                    sectionProgress: sectionProgressBySectionId[section.id] ?? null,
                }));
                return { ...mod, sections: sectionsWithProgress };
            }),
        );

        let programCpeSummary = null;
        if (userId && courseRow.programId) {
            const pillarIndex = resolveCoursePillarIndex(courseRow);
            if (pillarIndex === 3) {
                const hasEarnedCredential =
                    await this.courseCertificateService.hasDisplayableCredentialForLearner(userId, courseId);
                if (hasEarnedCredential) {
                    programCpeSummary =
                        await this.courseSectionWatchProgressService.getProgramPillarWatchSummary(
                            userId,
                            courseRow.programId,
                        );
                }
            }
        }

        return response.status(HttpStatus.OK).json({
            data: {
                course,
                enrolled,
                modules: modulesWithSections,
            },
            meta: {
                ...unlockInfo,
                programCpeSummary,
            },
        });
    }

    @Get(':courseId/question-bank')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({
      summary: 'List question bank for a course (answers visible only to Admin)',
    })
    async getCourseQuestionBank(
        @Param('courseId') courseId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const role = (request as any).user?.role;
        const userId = (request as any).user?.id;
        const includeAnswers = role === UserRole.Admin;
        const data = await this.courseQuestionBankService.findByCourseId(
            courseId,
            includeAnswers,
            userId,
        );
        return response.status(HttpStatus.OK).json({ data });
    }

    @Post(':courseId/question-bank')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Add a question to the course question bank' })
    @ApiBody({ type: CreateCourseQuestionBankDto })
    async createCourseQuestion(
        @Param('courseId') courseId: string,
        @Body() dto: CreateCourseQuestionBankDto,
        @Res() response: Response,
    ) {
        const row = await this.courseQuestionBankService.create(courseId, dto);
        return response.status(HttpStatus.CREATED).json({
            message: 'Question created successfully',
            data: row,
        });
    }

    @Post(':courseId/question-bank/:questionId/assignment/reference/upload')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload assessment guide file (legacy endpoint)' })
    @UseInterceptors(
        FileFieldsInterceptor([{ name: 'files', maxCount: 20 }, { name: 'file', maxCount: 1 }], {
            storage: memoryStorage(),
            limits: { fileSize: IMAGE_LIMIT_BYTES },
            fileFilter: assessmentAdminFileFilter(ASSESSMENT_ADMIN_FILE_EXT),
        }),
    )
    async uploadAssignmentReferenceFile(
        @Param('courseId') courseId: string,
        @Param('questionId') questionId: string,
        @UploadedFiles() uploaded: { files?: Express.Multer.File[]; file?: Express.Multer.File[] },
        @Body() body: AssessmentAdminUploadBody,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const files = flattenAssessmentAdminUploads(uploaded);
        if (!files.length && body?.replace === undefined) {
            return response.status(HttpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
        }

        const row = await this.courseQuestionBankService.uploadAssessmentAdminFiles(
            courseId,
            questionId,
            files,
            'guide',
            (uploadFile, folder) => saveAssignmentUploadFile(this.localStorageService, uploadFile, folder),
            parseAssessmentAdminUploadOptions(body),
        );

        return response.status(HttpStatus.OK).json({
            message: 'Guide file uploaded',
            data: {
                guideFileUrl: row.guideFileUrl,
                guideFileName: row.guideFileName,
                guideFiles: row.guideFiles,
            },
        });
    }

    @Post(':courseId/question-bank/:questionId/assignment/question/upload')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload assessment question file' })
    @UseInterceptors(
        FileFieldsInterceptor([{ name: 'files', maxCount: 20 }, { name: 'file', maxCount: 1 }], {
            storage: memoryStorage(),
            limits: { fileSize: IMAGE_LIMIT_BYTES },
            fileFilter: assessmentAdminFileFilter(ASSESSMENT_ADMIN_FILE_EXT),
        }),
    )
    async uploadAssessmentQuestionFile(
        @Param('courseId') courseId: string,
        @Param('questionId') questionId: string,
        @UploadedFiles() uploaded: { files?: Express.Multer.File[]; file?: Express.Multer.File[] },
        @Body() body: AssessmentAdminUploadBody,
        @Res() response: Response,
    ) {
        const files = flattenAssessmentAdminUploads(uploaded);
        if (!files.length && body?.replace === undefined) {
            return response.status(HttpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
        }
        const row = await this.courseQuestionBankService.uploadAssessmentAdminFiles(
            courseId,
            questionId,
            files,
            'question',
            (uploadFile, folder) => saveAssignmentUploadFile(this.localStorageService, uploadFile, folder),
            parseAssessmentAdminUploadOptions(body),
        );
        return response.status(HttpStatus.OK).json({
            message: 'Question file uploaded',
            data: {
                questionFileUrl: row.questionFileUrl,
                questionFileName: row.questionFileName,
                questionFiles: row.questionFiles,
            },
        });
    }

    @Post(':courseId/question-bank/:questionId/assignment/answer-sheet/upload')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload official answer sheet for assessment grading' })
    @UseInterceptors(
        FileFieldsInterceptor([{ name: 'files', maxCount: 20 }, { name: 'file', maxCount: 1 }], {
            storage: memoryStorage(),
            limits: { fileSize: IMAGE_LIMIT_BYTES },
            fileFilter: assessmentAdminFileFilter(ASSESSMENT_ADMIN_FILE_EXT),
        }),
    )
    async uploadAssessmentAnswerSheetFile(
        @Param('courseId') courseId: string,
        @Param('questionId') questionId: string,
        @UploadedFiles() uploaded: { files?: Express.Multer.File[]; file?: Express.Multer.File[] },
        @Body() body: AssessmentAdminUploadBody,
        @Res() response: Response,
    ) {
        const files = flattenAssessmentAdminUploads(uploaded);
        if (!files.length && body?.replace === undefined) {
            return response.status(HttpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
        }
        const row = await this.courseQuestionBankService.uploadAssessmentAdminFiles(
            courseId,
            questionId,
            files,
            'answerSheet',
            (uploadFile, folder) => saveAssignmentUploadFile(this.localStorageService, uploadFile, folder),
            parseAssessmentAdminUploadOptions(body),
        );
        return response.status(HttpStatus.OK).json({
            message: 'Answer sheet uploaded',
            data: {
                answerSheetFileUrl: row.answerSheetFileUrl,
                answerSheetFileName: row.answerSheetFileName,
                answerSheetFiles: row.answerSheetFiles,
            },
        });
    }

    @Post(':courseId/question-bank/:questionId/assignment/guide/upload')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload optional assessment guide for learners' })
    @UseInterceptors(
        FileFieldsInterceptor([{ name: 'files', maxCount: 20 }, { name: 'file', maxCount: 1 }], {
            storage: memoryStorage(),
            limits: { fileSize: IMAGE_LIMIT_BYTES },
            fileFilter: assessmentAdminFileFilter(ASSESSMENT_ADMIN_FILE_EXT),
        }),
    )
    async uploadAssessmentGuideFile(
        @Param('courseId') courseId: string,
        @Param('questionId') questionId: string,
        @UploadedFiles() uploaded: { files?: Express.Multer.File[]; file?: Express.Multer.File[] },
        @Body() body: AssessmentAdminUploadBody,
        @Res() response: Response,
    ) {
        const files = flattenAssessmentAdminUploads(uploaded);
        if (!files.length && body?.replace === undefined) {
            return response.status(HttpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
        }
        const row = await this.courseQuestionBankService.uploadAssessmentAdminFiles(
            courseId,
            questionId,
            files,
            'guide',
            (uploadFile, folder) => saveAssignmentUploadFile(this.localStorageService, uploadFile, folder),
            parseAssessmentAdminUploadOptions(body),
        );
        return response.status(HttpStatus.OK).json({
            message: 'Guide file uploaded',
            data: {
                guideFileUrl: row.guideFileUrl,
                guideFileName: row.guideFileName,
                guideFiles: row.guideFiles,
            },
        });
    }

    @Post(':courseId/question-bank/:questionId/check')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Check learner answer (does not expose correct answer in list)' })
    @ApiBody({ type: CheckCourseQuestionBankDto })
    async checkCourseQuestionAnswer(
        @Param('courseId') courseId: string,
        @Param('questionId') questionId: string,
        @Body() dto: CheckCourseQuestionBankDto,
        @Res() response: Response,
    ) {
        const result = await this.courseQuestionBankService.checkAnswer(courseId, questionId, {
            selectedIndex: dto.selectedIndex,
            answer: dto.answer,
        });
        return response.status(HttpStatus.OK).json({ data: result });
    }

    @Get('question-bank/attempts')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Admin report for learner question-bank attempts' })
    async getCourseQuestionAttemptReport(
        @Query('courseId') courseId: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('userId') userId: string,
        @Res() response: Response,
    ) {
        const data = await this.courseQuestionBankService.listAttemptsForAdmin({
            courseId: courseId || undefined,
            page: parseOptionalPositiveInteger(page),
            limit: parseOptionalPositiveInteger(limit),
            userId: userId || undefined,
        });
        return response.status(HttpStatus.OK).json({ data });
    }

    @Post(':courseId/question-bank/attempts')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Start a module question-bank attempt for learner tracking' })
    @ApiBody({ type: StartCourseQuestionAttemptDto })
    async startCourseQuestionAttempt(
        @Param('courseId') courseId: string,
        @Body() dto: StartCourseQuestionAttemptDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const data = await this.courseQuestionBankService.startAttempt(
            userId,
            courseId,
            dto?.moduleId,
        );
        return response.status(HttpStatus.CREATED).json({
            message: 'Attempt started',
            data,
        });
    }

    @Put(':courseId/question-bank/attempts/:attemptId/complete')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Complete question-bank attempt and persist score/details' })
    @ApiBody({ type: CompleteCourseQuestionAttemptDto })
    async completeCourseQuestionAttempt(
        @Param('courseId') courseId: string,
        @Param('attemptId') attemptId: string,
        @Body() dto: CompleteCourseQuestionAttemptDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const data = await this.courseQuestionBankService.completeAttempt(
            userId,
            courseId,
            attemptId,
            Array.isArray(dto?.answers) ? dto.answers : [],
        );
        return response.status(HttpStatus.OK).json({
            message: 'Attempt completed',
            data,
        });
    }

    @Get(':courseId/question-bank/my-quiz-assessment-progress')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Learner quiz and assessment completion progress for a course' })
    async getMyQuizAssessmentProgress(
        @Param('courseId') courseId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const [data, hasEarnedCredential, hasCredentialUnlock] = await Promise.all([
            this.courseQuestionBankService.getLearnerQuizAssessmentProgress(userId, courseId),
            this.courseCertificateService.hasDisplayableCredentialForLearner(userId, courseId),
            this.courseCertificateService.hasCredentialRecordForLearner(userId, courseId),
        ]);
        return response.status(HttpStatus.OK).json({
            data: { ...data, hasEarnedCredential, hasCredentialUnlock },
        });
    }

    @Delete('question-bank/attempts/:attemptId')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete one quiz attempt by attemptId (Admin)' })
    async deleteCourseQuestionAttemptById(
        @Param('attemptId') attemptId: string,
        @Res() response: Response,
    ) {
        const result = await this.courseQuestionBankService.deleteAttemptById(attemptId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Delete('question-bank/attempts')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete all quiz attempts (optionally filtered by courseId/userId) (Admin)' })
    async deleteCourseQuestionAttemptsBulk(
        @Query('courseId') courseId: string,
        @Query('userId') userId: string,
        @Res() response: Response,
    ) {
        const result = await this.courseQuestionBankService.deleteAttemptsBulk({
            courseId: courseId || undefined,
            userId: userId || undefined,
        });
        return response.status(HttpStatus.OK).json(result);
    }

    @Put('question-bank/:questionId')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update a question in the course question bank' })
    @ApiBody({ type: UpdateCourseQuestionBankDto })
    async updateCourseQuestion(
        @Param('questionId') questionId: string,
        @Body() dto: UpdateCourseQuestionBankDto,
        @Res() response: Response,
    ) {
        const row = await this.courseQuestionBankService.update(questionId, dto);
        return response.status(HttpStatus.OK).json({
            message: 'Question updated successfully',
            data: row,
        });
    }

    @Delete('question-bank/:questionId')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete a question from the course question bank' })
    async deleteCourseQuestion(
        @Param('questionId') questionId: string,
        @Res() response: Response,
    ) {
        const result = await this.courseQuestionBankService.delete(questionId);
        return response.status(HttpStatus.OK).json(result);
    }

    @Get(':courseId/question-bank/assignments/submissions')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({
        summary: 'List assignment file submissions (Admin: all learners; User: own files only)',
    })
    async listAssignmentSubmissions(
        @Param('courseId') courseId: string,
        @Query('userId') filterUserId: string,
        @Query('search') search: string,
        @Query('status') status: string,
        @Query('page') pageRaw: string,
        @Query('limit') limitRaw: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const role = (request as any).user?.role;
        const page = pageRaw != null && pageRaw !== '' ? Number(pageRaw) : undefined;
        const limit = limitRaw != null && limitRaw !== '' ? Number(limitRaw) : undefined;
        const result = await this.courseQuestionBankService.listAssignmentSubmissions(
            userId,
            role,
            courseId,
            {
                filterUserId: filterUserId || undefined,
                search: search || undefined,
                status: status || undefined,
                page: Number.isFinite(page) ? page : undefined,
                limit: Number.isFinite(limit) ? limit : undefined,
            },
        );
        return response.status(HttpStatus.OK).json({
            data: result.items,
            pagination: result.pagination,
            stats: result.stats,
            users: result.users,
        });
    }

    @Post(':courseId/question-bank/:questionId/assignment/upload')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload learner assessment submission files (draft — submit separately)' })
    @UseInterceptors(
        FilesInterceptor('files', 20, {
            storage: memoryStorage(),
            limits: { fileSize: IMAGE_LIMIT_BYTES },
            fileFilter: learnerSubmissionFileFilter,
        }),
    )
    async uploadAssignmentSubmission(
        @Param('courseId') courseId: string,
        @Param('questionId') questionId: string,
        @UploadedFiles() files: Express.Multer.File[],
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const uploadFiles = (files || []).filter(Boolean);
        if (!uploadFiles.length) {
            return response.status(HttpStatus.BAD_REQUEST).json({ message: 'No files uploaded' });
        }
        const data = await this.courseQuestionBankService.uploadAssignmentSubmissionFiles(
            userId,
            courseId,
            questionId,
            uploadFiles,
            (uploadFile, folder) => saveAssignmentUploadFile(this.localStorageService, uploadFile, folder),
        );
        return response.status(HttpStatus.OK).json({
            message: 'Files uploaded — click Submit when ready',
            data,
        });
    }

    @Get(':courseId/question-bank/:questionId/assignment/outline')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Get structured assessment question outline for learner' })
    async getAssignmentOutline(
        @Param('courseId') courseId: string,
        @Param('questionId') questionId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const data = await this.courseQuestionBankService.getAssignmentOutlineForLearner(
            userId,
            courseId,
            questionId,
        );
        return response.status(HttpStatus.OK).json({ data });
    }

    @Post(':courseId/question-bank/:questionId/assignment/submit')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Submit assessment for admin review' })
    async submitAssignmentSubmission(
        @Param('courseId') courseId: string,
        @Param('questionId') questionId: string,
        @Body() body: SubmitAssignmentSubmissionDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const data = await this.courseQuestionBankService.submitAssignmentSubmission(
            userId,
            courseId,
            questionId,
            body,
        );
        return response.status(HttpStatus.OK).json({
            message:
                'Assessment submitted successfully. It will be reviewed by an admin.',
            data,
        });
    }

    @Delete(':courseId/question-bank/:questionId/assignment/submission')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({
        summary: 'Delete assignment submission (learner: own file; admin: optional userId query)',
    })
    async deleteAssignmentSubmission(
        @Param('courseId') courseId: string,
        @Param('questionId') questionId: string,
        @Query('userId') targetUserId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const role = (request as any).user?.role;
        const result = await this.courseQuestionBankService.deleteAssignmentSubmission(
            userId,
            role,
            courseId,
            questionId,
            targetUserId || undefined,
            (fileUrl) => this.localStorageService.deleteFileByUrl(fileUrl),
        );
        return response.status(HttpStatus.OK).json(result);
    }

    @Patch(':courseId/question-bank/assignments/submissions/:submissionId/manual-verify')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Admin manually pass/fail an assignment submission' })
    @ApiBody({ type: ManualVerifyAssignmentSubmissionDto })
    async manualVerifyAssignmentSubmission(
        @Param('courseId') courseId: string,
        @Param('submissionId') submissionId: string,
        @Body() dto: ManualVerifyAssignmentSubmissionDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const role = (request as any).user?.role;
        const data = await this.courseQuestionBankService.manualVerifyAssignmentSubmission(
            userId,
            role,
            courseId,
            submissionId,
            dto,
        );
        return response.status(HttpStatus.OK).json({ message: 'Submission verified', data });
    }

    @Post(':courseId/question-bank/assignments/submissions/:submissionId/regrade')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Admin re-run AI grading for a submission' })
    async regradeAssignmentSubmission(
        @Param('courseId') courseId: string,
        @Param('submissionId') submissionId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const role = (request as any).user?.role;
        const data = await this.courseQuestionBankService.regradeAssignmentSubmission(
            role,
            courseId,
            submissionId,
        );
        return response.status(HttpStatus.OK).json({ message: 'Regrading started', data });
    }

    @Get(':courseId/modules/:moduleId/sections')
    @ApiOperation({ summary: 'Get sections for a module' })
    async getModuleSections(
        @Param('moduleId') moduleId: string,
        @Res() response: Response,
    ) {
        const sections = await this.courseModuleSectionService.findByModuleId(moduleId);
        return response.status(HttpStatus.OK).json({ data: sections });
    }

    @Get(':courseId/modules')
    @ApiOperation({ summary: 'Get modules for a course' })
    async getCourseModules(@Param('courseId') courseId: string, @Res() response: Response) {
        const modules = await this.courseModuleService.findByCourseId(courseId);
        return response.status(HttpStatus.OK).json({
            data: modules,
        });
    }

    @Get(':courseId/sections/:sectionId/progress')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Get section-level watch progress and resume position' })
    async getCourseSectionProgress(
        @Param('courseId') courseId: string,
        @Param('sectionId') sectionId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const progress = await this.courseSectionWatchProgressService.getSectionProgress(userId, courseId, sectionId);
        return response.status(HttpStatus.OK).json({ data: progress });
    }

    @Put(':courseId/sections/:sectionId/progress')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update section-level watch progress and resume position (full replace / upsert)' })
    @ApiBody({ type: UpdateCourseSectionWatchProgressDto })
    async updateCourseSectionProgress(
        @Param('courseId') courseId: string,
        @Param('sectionId') sectionId: string,
        @Body() dto: UpdateCourseSectionWatchProgressDto,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const progress = await this.courseSectionWatchProgressService.upsertSectionProgress(
            userId,
            courseId,
            sectionId,
            dto,
        );
        // Auto-issue certificate once all course sections are completed.
        if (progress?.isCompleted) {
            await this.courseCertificateService.issueIfCourseCompleted(userId, courseId);
        }
        return response.status(HttpStatus.OK).json({
            message: 'Section progress updated',
            data: progress,
        });
    }

    @Get('certificates/my')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'List current user course completion certificates' })
    async getMyCertificates(
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        // Backfill certificates for already-completed courses in case a prior progress update missed auto-issue.
        // Isolate failures so one course/program race cannot wipe the whole Digital Badge page.
        const enrolledSet = await this.courseEnrollmentService.getEffectiveEnrolledCourseIdSet(userId);
        const touchedCourseIds = await this.courseSectionWatchProgressService.getUserTouchedCourseIds(userId);
        const candidateCourseIds = [...new Set([...enrolledSet, ...touchedCourseIds])];
        await Promise.all(
            candidateCourseIds.map(async (courseId) => {
                try {
                    await this.courseCertificateService.issueIfCourseCompleted(userId, courseId);
                } catch (error) {
                    console.error(
                        `[certificates/my] backfill failed for user=${userId} course=${courseId}:`,
                        error instanceof Error ? error.message : error,
                    );
                }
            }),
        );
        const certificates = await this.courseCertificateService.getUserCertificates(userId);
        return response.status(HttpStatus.OK).json({ data: certificates });
    }

    @Get('certificates/:certificateId/pdf')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Download official server-generated certificate PDF' })
    async downloadMyCertificatePdf(
        @Param('certificateId') certificateId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const { filename, buffer } = await this.courseCertificateService.getCertificatePdfForUser(
            userId,
            certificateId,
        );
        response.setHeader('Content-Type', 'application/pdf');
        response.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        return response.status(HttpStatus.OK).send(buffer);
    }

    @Get('certificates/:certificateId/linkedin-share')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Build LinkedIn share URL/text for a certificate or digital badge' })
    async getCertificateLinkedInShare(
        @Param('certificateId') certificateId: string,
        @Query('kind') kindRaw: string | undefined,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const kind = String(kindRaw || 'certificate').toLowerCase() === 'badge' ? 'badge' : 'certificate';
        const data = await this.courseCertificateService.getLinkedInShareForUser(
            userId,
            certificateId,
            kind,
        );
        return response.status(HttpStatus.OK).json({ data });
    }

    @Post(':courseId/certificates/issue')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Issue certificate for current user if course is completed' })
    async issueCourseCertificate(
        @Param('courseId') courseId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const result = await this.courseCertificateService.issueIfCourseCompleted(userId, courseId);
        return response.status(HttpStatus.OK).json({ data: result });
    }

    @Get('certificates/admin/list')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Admin: list certificates with filters' })
    async getAdminCertificates(
        @Query('page') page: string | undefined,
        @Query('limit') limit: string | undefined,
        @Query('q') q: string | undefined,
        @Query('userName') userName: string | undefined,
        @Query('courseTitle') courseTitle: string | undefined,
        @Res() response: Response,
    ) {
        const result = await this.courseCertificateService.getAdminCertificates({
            page: parsePositiveInteger(page, 1),
            limit: parsePositiveInteger(limit, 10),
            q,
            userName,
            courseTitle,
        });
        return response.status(HttpStatus.OK).json({
            length: result.data.length,
            data: result.data,
            pagination: result.pagination,
        });
    }

    @Delete('certificates/admin/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Admin: delete a certificate by id' })
    async deleteAdminCertificate(
        @Param('id') id: string,
        @Res() response: Response,
    ) {
        const result = await this.courseCertificateService.deleteCertificateById(id);
        return response.status(HttpStatus.OK).json({ data: result });
    }

    @Post('certificates/admin/:id/block')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Admin: block a certificate (hide from user)' })
    async blockAdminCertificate(
        @Param('id') id: string,
        @Res() response: Response,
    ) {
        const result = await this.courseCertificateService.blockCertificateById(id);
        return response.status(HttpStatus.OK).json({ data: result });
    }

    @Post('certificates/admin/:id/unblock')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Admin: unblock a certificate (visible to user again)' })
    async unblockAdminCertificate(
        @Param('id') id: string,
        @Res() response: Response,
    ) {
        const result = await this.courseCertificateService.unblockCertificateById(id);
        return response.status(HttpStatus.OK).json({ data: result });
    }


    @Post('spotlightr/prepare-playback')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({
        summary: 'Enable Spotlightr forward seek and resolve direct MP4 playback URL when available',
    })
    async prepareSpotlightrPlayback(
        @Body() body: { url?: string },
        @Res() response: Response,
    ) {
        const url = String(body?.url || '').trim();
        if (!url || !/spotlightr\.com\/watch\//i.test(url)) {
            return response.status(HttpStatus.BAD_REQUEST).json({
                message: 'Valid Spotlightr watch URL is required',
            });
        }
        if (
            !this.spotlightrService.isConfigured() ||
            !this.spotlightrService.isPreparePlaybackEnabled() ||
            this.spotlightrService.isApiCircuitOpen()
        ) {
            return response.status(HttpStatus.OK).json({
                data: { directUrl: null, settingsUpdated: false },
            });
        }
        const data = await this.spotlightrService.preparePlaybackForWatchUrl(url);
        return response.status(HttpStatus.OK).json({ data });
    }

    @Get('enrolled/list')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'List current user enrolled course ids' })
    async getEnrolledCourseIds(
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const courseIds = await this.courseEnrollmentService.getEnrolledCourseIds(userId);
        return response.status(HttpStatus.OK).json({ data: { courseIds } });
    }

    @Get('assignments/my-summary')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Assignment submission summary for enrolled courses (current user)' })
    async getMyAssignmentSummary(
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const data = await this.courseQuestionBankService.getMyAssignmentSummary(userId);
        return response.status(HttpStatus.OK).json({ data });
    }

    @Get(':courseId/enrolled')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Check whether current user is enrolled in a course' })
    async getCourseEnrolled(
        @Param('courseId') courseId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const { enrolled, accessViaBundle } = await this.courseEnrollmentService.getEnrollmentBreakdown(
            userId,
            courseId,
        );
        return response.status(HttpStatus.OK).json({ data: { enrolled, accessViaBundle } });
    }

    @Get('progress/my-overview')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({
        summary:
            'Get progress overview for current user in one call (eligible courses + modules + section progress)',
    })
    async getMyProgressOverview(
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }

        const rows = await this.buildProgressOverviewForUser(userId, {
            includeEmpty: false,
            includeQuizAssessment: false,
        });
        return response.status(HttpStatus.OK).json({ data: rows });
    }

    @Get('progress/user/:userId/overview')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({
        summary:
            'Admin: full pillar/module/section progress overview for a learner (read-only tracking)',
    })
    async getUserProgressOverview(
        @Param('userId') userId: string,
        @Res() response: Response,
    ) {
        if (!userId) {
            return response.status(HttpStatus.BAD_REQUEST).json({ message: 'userId is required' });
        }

        const rows = await this.buildProgressOverviewForUser(userId, {
            includeEmpty: true,
            includeQuizAssessment: true,
        });
        return response.status(HttpStatus.OK).json({ data: rows });
    }

    @Post('enroll/bulk')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Enroll current user in multiple courses' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                courseIds: { type: 'array', items: { type: 'string' } },
            },
        },
    })
    async enrollBulk(
        @Body() body: { courseIds?: string[] },
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const courseIds = Array.isArray(body?.courseIds) ? body.courseIds : [];
        await this.courseEnrollmentService.enrollMany(userId, courseIds);
        return response.status(HttpStatus.OK).json({ message: 'Enrolled', data: { count: courseIds.length } });
    }

    @Post(':courseId/enroll')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Enroll current user in a course' })
    async enrollCourse(
        @Param('courseId') courseId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        await this.courseService.getById(courseId); // ensure course exists
        await this.courseEnrollmentService.enroll(userId, courseId);
        return response.status(HttpStatus.OK).json({ message: 'Enrolled', data: { enrolled: true } });
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Get course details by id' })
    async getCourseById(@Param('id') id: string, @Req() request: Request, @Res() response: Response) {
        const courseRow = await this.courseService.getById(id);
        const speakers = await orderedSpeakersForCourse(this.speakerService, courseRow.speakerIds);
        const languages = await orderedLanguagesForCourse(this.languageService, courseRow.languageIds);
        const userId = (request as any).user?.id;
        let recommendedCourseIds: string[] = [];
        if (userId) {
            const recommendation = await this.appSettingsService.getRecommendationsForUser(userId);
            recommendedCourseIds = Array.isArray(recommendation?.courseIds) ? recommendation.courseIds : [];
        }
        const relatedRows = await this.courseService.findRelatedCourses(id, courseRow.level, 4);
        const relatedCourses = await this.courseService.enrichCoursesForCards(
            relatedRows,
            userId,
            recommendedCourseIds,
        );
        const reviews = await this.reviewService.findAll({ courseId: id });
        const reviewCount = reviews.length;
        const ratingTotal = reviews.reduce((acc, row) => acc + Number(row.rating || 0), 0);
        const averageRating = reviewCount > 0 ? Math.min(5, Math.max(0, ratingTotal / reviewCount)) : 0;
        const { languageIds: _languageIds, speakerIds: _speakerIds, ...courseBase } = courseRow as any;
        const course = {
            ...courseBase,
            speakers,
            languages,
            relatedCourses,
            reviewStats: { averageRating, reviewCount },
            reviews,
        };
        // If user is authenticated, include favorite status
        if (userId) {
            const isFavorite = await this.courseFavoriteService.isFavorite(userId, id);
            const { enrolled, accessViaBundle } = await this.courseEnrollmentService.getEnrollmentBreakdown(
                userId,
                id,
            );
            return response.status(HttpStatus.OK).json({
                data: { ...course, isFavorite, isEnrolled: enrolled, accessViaBundle },
            });
        }
        
        // Return course without favorite status for unauthenticated users
        return response.status(HttpStatus.OK).json({
            data: course,
        });
    }

    @Post('modules/sections/upload-learning-materials')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload section learning materials (PDF, Word, Excel, PowerPoint, ZIP, etc.)' })
    @UseInterceptors(
        FilesInterceptor('files', 20, {
            storage: memoryStorage(),
            limits: { fileSize: IMAGE_LIMIT_BYTES },
            fileFilter: (_req, file, cb) => {
                const name = String(file.originalname || '').toLowerCase();
                const allowedExt = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|zip)$/i.test(name);
                const allowedMime =
                    /^application\/(pdf|msword|zip|x-zip-compressed|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-excel|vnd\.ms-powerpoint)$/i.test(
                        file.mimetype,
                    ) ||
                    /^text\/(plain|csv)$/i.test(file.mimetype);
                cb(null, Boolean(allowedExt || allowedMime));
            },
        }),
    )
    async uploadSectionLearningMaterials(
        @UploadedFiles() files: Express.Multer.File[],
        @Res() response: Response,
    ) {
        if (!files?.length) {
            return response.status(HttpStatus.BAD_REQUEST).json({
                message: 'No files uploaded',
            });
        }

        const urls = await Promise.all(
            files.map((file) => {
                const original = String(file.originalname || 'document').trim();
                const ext = original.includes('.') ? original.slice(original.lastIndexOf('.')) : '';
                const base = ext ? original.slice(0, -ext.length) : original;
                return this.localStorageService.saveFile(file, 'course-section-learning', {
                    fileName: `${Date.now()}-${base}`,
                });
            }),
        );
        return response.status(HttpStatus.OK).json({ data: { urls } });
    }

    @Post('modules/sections/upload-images')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload multiple course section images' })
    @UseInterceptors(
        FilesInterceptor('images', 20, {
            storage: memoryStorage(),
            limits: { fileSize: IMAGE_LIMIT_BYTES },
            fileFilter: (_req, file, cb) => {
                const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
                cb(null, allowed);
            },
        }),
    )
    async uploadSectionImages(
        @UploadedFiles() files: Express.Multer.File[],
        @Res() response: Response,
    ) {
        if (!files?.length) {
            return response.status(HttpStatus.BAD_REQUEST).json({
                message: 'No images uploaded',
            });
        }
        const urls = await this.localStorageService.saveFiles(files, 'course-section');
        return response.status(HttpStatus.OK).json({ data: { urls } });
    }

    @Post('modules/sections/detect-video-duration')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Detect duration (seconds) for YouTube, Spotlightr, or direct video URL' })
    async detectSectionVideoDuration(
        @Body() body: { url?: string },
        @Res() response: Response,
    ) {
        const url = String(body?.url || '').trim();
        if (!url) {
            return response.status(HttpStatus.BAD_REQUEST).json({ message: 'Video URL is required' });
        }
        try {
            const seconds = await this.videoDurationService.detectDurationSeconds(url);
            return response.status(HttpStatus.OK).json({ data: { seconds } });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not detect video duration';
            return response.status(HttpStatus.BAD_GATEWAY).json({ message });
        }
    }

    @Post('modules/sections/upload-video')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload single course section video' })
    @UseInterceptors(
        FileInterceptor('video', {
            storage: memoryStorage(),
            limits: { fileSize: SECTION_VIDEO_LIMIT_BYTES },
            fileFilter: (_req, file, cb) => {
                const allowed = /^video\/(mp4|webm|quicktime|x-msvideo|x-matroska)$/i.test(file.mimetype);
                cb(null, allowed);
            },
        }),
    )
    async uploadSectionVideo(
        @UploadedFile() file: Express.Multer.File,
        @Res() response: Response,
    ) {
        if (!file) {
            return response.status(HttpStatus.BAD_REQUEST).json({
                message: 'No video uploaded',
            });
        }
        try {
            const url = this.spotlightrService.isConfigured()
                ? await this.spotlightrService.uploadVideo(file)
                : await this.localStorageService.saveFile(file, 'course-section-video');
            return response.status(HttpStatus.OK).json({ data: { url } });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Video upload failed';
            return response.status(HttpStatus.BAD_GATEWAY).json({ message });
        }
    }

    @Post('modules/sections/upload-files')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload section attachments (PDF only)' })
    @UseInterceptors(
        FilesInterceptor('files', 20, {
            storage: memoryStorage(),
            limits: { fileSize: IMAGE_LIMIT_BYTES },
            fileFilter: (_req, file, cb) => {
                const allowedMime = /^application\/pdf$/i.test(file.mimetype);
                const allowedExt = /\.pdf$/i.test(file.originalname || '');
                cb(null, Boolean(allowedMime || allowedExt));
            },
        }),
    )
    async uploadSectionFiles(
        @UploadedFiles() files: Express.Multer.File[],
        @Res() response: Response,
    ) {
        if (!files?.length) {
            return response.status(HttpStatus.BAD_REQUEST).json({
                message: 'No files uploaded',
            });
        }

        const urls = await this.localStorageService.saveFiles(files, 'course-section-file');
        return response.status(HttpStatus.OK).json({ data: { urls } });
    }

    @Post(':courseId/modules/:moduleId/sections')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Create a course module section' })
    @ApiBody({ type: CreateCourseModuleSectionDto })
    async createModuleSection(
        @Param('moduleId') moduleId: string,
        @Body() dto: CreateCourseModuleSectionDto,
        @Res() response: Response,
    ) {
        const section = await this.courseModuleSectionService.create(moduleId, dto);
        return response.status(HttpStatus.CREATED).json({
            message: 'Section created successfully',
            data: section,
        });
    }

    @Put('modules/sections/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update a course module section' })
    @ApiBody({ type: UpdateCourseModuleSectionDto })
    async updateModuleSection(
        @Param('id') id: string,
        @Body() dto: UpdateCourseModuleSectionDto,
        @Res() response: Response,
    ) {
        const section = await this.courseModuleSectionService.update(id, dto);
        return response.status(HttpStatus.OK).json({
            message: 'Section updated successfully',
            data: section,
        });
    }

    @Delete('modules/sections/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete a course module section' })
    async deleteModuleSection(@Param('id') id: string, @Res() response: Response) {
        const result = await this.courseModuleSectionService.delete(id);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post(':courseId/modules')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Create a course module' })
    @ApiBody({ type: CreateCourseModuleDto })
    async createCourseModule(
        @Param('courseId') courseId: string,
        @Body() dto: CreateCourseModuleDto,
        @Res() response: Response,
    ) {
        const module = await this.courseModuleService.create(courseId, dto);
        return response.status(HttpStatus.CREATED).json({
            message: 'Module created successfully',
            data: module,
        });
    }

    @Put('modules/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Update a course module' })
    @ApiBody({ type: UpdateCourseModuleDto })
    async updateCourseModule(
        @Param('id') id: string,
        @Body() dto: UpdateCourseModuleDto,
        @Res() response: Response,
    ) {
        const module = await this.courseModuleService.update(id, dto);
        return response.status(HttpStatus.OK).json({
            message: 'Module updated successfully',
            data: module,
        });
    }

    @Delete('modules/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete a course module' })
    async deleteCourseModule(@Param('id') id: string, @Res() response: Response) {
        const sections = await this.courseModuleSectionService.findByModuleId(id);
        if (Array.isArray(sections) && sections.length > 0) {
            await Promise.all(
                sections.map(async (section) => {
                    const videoPath = toUploadsPath(section.videoUrl);
                    if (videoPath) {
                        await this.localStorageService.deleteFileByUrl(videoPath).catch(() => undefined);
                    }
                    if (Array.isArray(section.images)) {
                        await Promise.all(
                            section.images.map((url) => {
                                const path = toUploadsPath(url);
                                return path
                                    ? this.localStorageService.deleteFileByUrl(path).catch(() => undefined)
                                    : Promise.resolve();
                            }),
                        );
                    }
                    if (Array.isArray(section.attachments)) {
                        await Promise.all(
                            section.attachments.map((url) => {
                                const path = toUploadsPath(url);
                                return path
                                    ? this.localStorageService.deleteFileByUrl(path).catch(() => undefined)
                                    : Promise.resolve();
                            }),
                        );
                    }
                }),
            );
        }
        const result = await this.courseModuleService.delete(id);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post()
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a course with optional image upload' })
    @ApiBody({ type: CreateCourseDto })
    @UseInterceptors(
        FileInterceptor('image', {
            storage: memoryStorage(),
            limits: { fileSize: IMAGE_LIMIT_BYTES }, // 50MB limit
        })
    )
    async createCourse(
        @Req() req: Request,
        @Body() createCourseDto: CreateCourseDto,
        @Res() response: Response,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [
                    new MaxFileSizeValidator({ maxSize: IMAGE_LIMIT_BYTES }), // 50MB
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
                ],
            })
        )
        file?: Express.Multer.File,
    ) {
        // Upload image to local storage
        if (file) {
            const imageUrl = await this.localStorageService.saveFile(file, 'course');
            createCourseDto.image = imageUrl;
        }

        const result = await this.courseService.create(createCourseDto);
        const courseId = result.course.id;
        let createdModulesCount = 0;
        let createdSectionsCount = 0;

        // If modules (and optional sections) were sent, create them after the course.
        // FormData sends modules as a JSON string; read from body in case DTO doesn't have it.
        const rawBodyModules = req.body && (req.body as any).modules;
        const parsedFromBody = parseModulesPayload(rawBodyModules);
        const parsedFromDto = parseModulesPayload(createCourseDto.modules);
        const bodySectionCount = countParsedSections(parsedFromBody);
        const dtoSectionCount = countParsedSections(parsedFromDto);
        // Prefer the source that actually contains more nested section data.
        const modulesPayload =
            bodySectionCount > dtoSectionCount
                ? parsedFromBody
                : parsedFromDto.length > 0
                    ? parsedFromDto
                    : parsedFromBody;
        if (modulesPayload.length > 0) {
            for (let moduleIndex = 0; moduleIndex < modulesPayload.length; moduleIndex += 1) {
                const mod = modulesPayload[moduleIndex];
                try {
                    const moduleTitle =
                        typeof mod?.title === 'string' && mod.title.trim().length > 0
                            ? mod.title.trim()
                            : `Module ${moduleIndex + 1}`;
                    const createdModule = await this.courseModuleService.create(courseId, {
                        title: moduleTitle,
                        description:
                            typeof mod?.description === 'string' ? mod.description : undefined,
                        sortOrder: toOptionalNumber(mod?.sortOrder),
                    });
                    createdModulesCount += 1;
                    const sections = parseSectionsPayload(mod?.sections);
                    if (Array.isArray(sections) && sections.length > 0) {
                        for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
                            const sec = sections[sectionIndex];
                            try {
                                const sectionTitle =
                                    typeof sec?.title === 'string' && sec.title.trim().length > 0
                                        ? sec.title.trim()
                                        : `Section ${sectionIndex + 1}`;
                                await this.courseModuleSectionService.create(createdModule.id, {
                                    title: sectionTitle,
                                    subtitle:
                                        typeof sec?.subtitle === 'string' ? sec.subtitle : undefined,
                                    videoUrl:
                                        typeof sec?.videoUrl === 'string'
                                            ? sec.videoUrl
                                            : undefined,
                                    description:
                                        typeof sec?.description === 'string'
                                            ? sec.description
                                            : undefined,
                                    content:
                                        typeof sec?.content === 'string' ? sec.content : undefined,
                                    watchtime:
                                        typeof sec?.watchtime === 'string'
                                            ? sec.watchtime
                                            : undefined,
                                    durationTime:
                                        typeof sec?.durationTime === 'string'
                                            ? sec.durationTime
                                            : undefined,
                                    completionPercentage:
                                        typeof sec?.completionPercentage === 'number'
                                            ? sec.completionPercentage
                                            : sec?.completionPercentage != null &&
                                                sec.completionPercentage !== ''
                                              ? Number(sec.completionPercentage)
                                              : undefined,
                                    images: normalizeStringArray(sec?.images),
                                    attachments: normalizeStringArray(sec?.attachments),
                                    learningMaterials: normalizeStringArray(sec?.learningMaterials),
                                    sortOrder: toOptionalNumber(sec?.sortOrder),
                                });
                                createdSectionsCount += 1;
                            } catch (sectionErr) {
                                console.error('Error creating section:', sectionErr);
                            }
                        }
                    }
                } catch (moduleErr) {
                    console.error('Error creating module:', moduleErr);
                }
            }
        }

        return response.status(HttpStatus.CREATED).json({
            message: result.message,
            course: result.course,
            moduleBuild: {
                requestedModules: modulesPayload.length,
                createdModules: createdModulesCount,
                createdSections: createdSectionsCount,
            },
        });
    }

    @Put('update/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update a course and optionally replace its image' })
    @ApiBody({ type: UpdateCourseDto })
    @UseInterceptors(
        FileInterceptor('image', {
            storage: memoryStorage(),
            limits: { fileSize: IMAGE_LIMIT_BYTES }, // 50MB limit
        })
    )
    async updateCourse(
        @Param('id') id: string,
        @Body() updateCourseDto: UpdateCourseDto,
        @Res() response: Response,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [
                    new MaxFileSizeValidator({ maxSize: IMAGE_LIMIT_BYTES }), // 50MB
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
                ],
            })
        )
        file?: Express.Multer.File,
    ) {
        // Get existing course to delete old image if new one is uploaded or deleted
        const existingCourse = await this.courseService.getById(id);

        // Handle image:
        // - file = new upload
        // - empty string in body = delete existing image
        // - image undefined = keep existing image
        if (file) {
            // Delete old local image if it exists
            await this.localStorageService.deleteFileByUrl(existingCourse.image);
            const imageUrl = await this.localStorageService.saveFile(file, 'course');
            updateCourseDto.image = imageUrl;
        } else if (updateCourseDto.image === '') {
            // Explicit deletion requested
            await this.localStorageService.deleteFileByUrl(existingCourse.image);
            // Keep empty string - service will clear DB field
        }

        const result = await this.courseService.update(id, updateCourseDto);
        return response.status(HttpStatus.OK).json({
            message: result.message,
            course: result.course,
        });
    }

    @Delete(':id/image')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete only the course cover image' })
    async deleteCourseImage(@Param('id') id: string, @Res() response: Response) {
        // Get existing course so we can remove its current image file
        const existingCourse = await this.courseService.getById(id);

        // Delete local image file if it exists
        await this.localStorageService.deleteFileByUrl(existingCourse.image);

        // Clear image field in DB
        const dto = new UpdateCourseDto();
        dto.image = '';
        const result = await this.courseService.update(id, dto);

        return response.status(HttpStatus.OK).json({
            message: 'Course image deleted successfully',
            course: result.course,
        });
    }

    @Delete('delete/:id')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Delete a course' })
    async deleteCourse(@Param('id') id: string, @Res() response: Response) {
        // Get course before deleting to access image URL
        const course = await this.courseService.getById(id);
        
        // Delete local image if it exists
        await this.localStorageService.deleteFileByUrl(course.image);

        const result = await this.courseService.delete(id);
        return response.status(HttpStatus.OK).json(result);
    }

    @Post(':id/favorite')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Toggle favorite status for a course' })
    async toggleFavorite(
        @Param('id') courseId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        
        // Verify course exists
        await this.courseService.getById(courseId);
        
        const result = await this.courseFavoriteService.toggleFavorite(userId, courseId);
        return response.status(HttpStatus.OK).json({
            message: result.isFavorite ? 'Course added to favorites' : 'Course removed from favorites',
            data: result,
        });
    }

    @Get(':id/favorite-status')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Get favorite status for a course' })
    async getFavoriteStatus(
        @Param('id') courseId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        
        const isFavorite = await this.courseFavoriteService.isFavorite(userId, courseId);
        return response.status(HttpStatus.OK).json({
            data: { isFavorite },
        });
    }

    @Get('favorites/all')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'List current user favorite courses and sections' })
    async getFavoritesAll(
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }

        const [courseFavorites, favoriteSections] = await Promise.all([
            this.courseFavoriteService.getUserFavorites(userId),
            this.courseSectionFavoriteService.getAllFavoriteSectionsWithDetails(userId),
        ]);
        const courses = await Promise.all(
            courseFavorites.map(async (f) => {
                const breakdown = await this.courseEnrollmentService.getEnrollmentBreakdown(
                    userId,
                    f.courseId,
                );
                return {
                    ...f.course,
                    isFavorite: true,
                    isEnrolled: breakdown.enrolled,
                    accessViaBundle: breakdown.accessViaBundle,
                };
            }),
        );

        return response.status(HttpStatus.OK).json({
            data: {
                courses,
                favoriteSections: favoriteSections.map((s) => ({
                    id: s.sectionId,
                    title: s.sectionTitle,
                    courseId: s.courseId,
                    courseTitle: s.courseTitle,
                    courseImage: s.courseImage,
                    moduleTitle: s.moduleTitle,
                })),
            },
        });
    }

    // Section (Lesson) Favorites
    @Post('sections/:sectionId/favorite')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Toggle favorite status for a course section' })
    async toggleSectionFavorite(
        @Param('sectionId') sectionId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        
        // Verify section exists (foreign key constraint will handle validation)
        
        const result = await this.courseSectionFavoriteService.toggleFavorite(userId, sectionId);
        return response.status(HttpStatus.OK).json({
            message: result.isFavorite ? 'Section added to favorites' : 'Section removed from favorites',
            data: result,
        });
    }

    @Get('sections/:sectionId/favorite-status')
    @UseGuards(SessionGuard, JwtAuthGuard)
    @ApiBearerAuth('bearer')
    @ApiOperation({ summary: 'Get favorite status for a course section' })
    async getSectionFavoriteStatus(
        @Param('sectionId') sectionId: string,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const userId = (request as any).user?.id;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        
        const isFavorite = await this.courseSectionFavoriteService.isFavorite(userId, sectionId);
        return response.status(HttpStatus.OK).json({
            data: { isFavorite },
        });
    }

    /**
     * Shared learner progress tree: courses → modules → sections (+ optional quiz/assessment scopes).
     * Used by learner My Progress and admin User Tracking tab.
     */
    private async buildProgressOverviewForUser(
        userId: string,
        options: { includeEmpty?: boolean; includeQuizAssessment?: boolean } = {},
    ) {
        const includeEmpty = options.includeEmpty === true;
        const includeQuizAssessment = options.includeQuizAssessment === true;

        const allCourses = await this.courseService.getAll({ userId });
        const trackableCourses = (Array.isArray(allCourses) ? allCourses : []).filter((course) => {
            if (!course) return false;
            if (course.isEnrolled || course.accessViaBundle) return true;
            return !isPaidCourseValue(course.freeOrPaid);
        });

        const rows = await Promise.all(
            trackableCourses.map(async (course) => {
                const courseId = String(course.id);
                const sectionProgressBySectionId =
                    await this.courseSectionWatchProgressService.getAllSectionProgressForCourse(
                        userId,
                        courseId,
                    );
                const progressRows = Object.values(sectionProgressBySectionId || {}).filter(
                    Boolean,
                ) as any[];
                const hasMeaningfulProgress = progressRows.some((row) => {
                    const completion = Number(row?.completionPercent ?? row?.currentProgress ?? 0);
                    const watched = Number(row?.watchedSeconds ?? 0);
                    const lastPos = Number(row?.lastPositionSeconds ?? 0);
                    return (
                        row?.isViewed === true ||
                        row?.isWatched === true ||
                        row?.isCompleted === true ||
                        Boolean(row?.lastAccessedAt) ||
                        (Number.isFinite(completion) && completion > 0) ||
                        (Number.isFinite(watched) && watched > 0) ||
                        (Number.isFinite(lastPos) && lastPos > 0)
                    );
                });
                if (!includeEmpty && !hasMeaningfulProgress) {
                    return null;
                }

                const viewedSectionIds = progressRows
                    .filter(
                        (row) =>
                            row?.isWatched === true ||
                            row?.isCompleted === true ||
                            row?.isViewed === true ||
                            Number(row?.completionPercent ?? row?.currentProgress ?? 0) >= 99,
                    )
                    .map((row) => row?.sectionId)
                    .filter((id) => Boolean(id))
                    .map((id) => String(id));
                const latestByTime = progressRows
                    .filter((row) => row?.lastAccessedAt)
                    .sort(
                        (a, b) =>
                            new Date(String(b.lastAccessedAt)).getTime() -
                            new Date(String(a.lastAccessedAt)).getTime(),
                    )[0];
                const latestByProgress = progressRows
                    .filter((row) => row?.completionPercent != null || row?.currentProgress != null)
                    .sort(
                        (a, b) =>
                            Number(b?.completionPercent ?? b?.currentProgress ?? 0) -
                            Number(a?.completionPercent ?? a?.currentProgress ?? 0),
                    )[0];
                const currentSectionId =
                    latestByTime?.sectionId || latestByProgress?.sectionId || null;
                const lastAccessedAt = latestByTime?.lastAccessedAt || null;

                const modules = await this.courseModuleService.findByCourseId(courseId);
                const modulesWithSections = await Promise.all(
                    modules.map(async (mod) => {
                        const sections = await this.courseModuleSectionService.findByModuleId(
                            mod.id,
                        );
                        const sectionsWithProgress = sections.map((section) => ({
                            id: section.id,
                            title: section.title,
                            subtitle: section.subtitle,
                            videoUrl: section.videoUrl,
                            watchtime: section.watchtime,
                            durationTime: section.durationTime,
                            sortOrder: section.sortOrder,
                            sectionProgress: sectionProgressBySectionId[section.id] ?? null,
                        }));
                        return {
                            id: mod.id,
                            title: mod.title,
                            description: mod.description,
                            sortOrder: mod.sortOrder,
                            sections: sectionsWithProgress,
                        };
                    }),
                );

                const quizAssessmentProgress =
                    await this.courseQuizAssessmentProgressService.getLearnerProgress(
                        userId,
                        courseId,
                    );
                const quizCountByModuleId: Record<string, number> = {};
                const assignmentCountByModuleId: Record<string, number> = {};
                let courseEndQuizCount = 0;
                let courseEndAssignmentCount = 0;
                quizAssessmentProgress.scopes.forEach((scope) => {
                    if (scope.moduleId) {
                        if (scope.quizCount > 0) {
                            quizCountByModuleId[scope.moduleId] = scope.quizCount;
                        }
                        if (scope.assignmentCount > 0) {
                            assignmentCountByModuleId[scope.moduleId] = scope.assignmentCount;
                        }
                    } else {
                        courseEndQuizCount = scope.quizCount;
                        courseEndAssignmentCount = scope.assignmentCount;
                    }
                });

                const overallProgress = buildCourseOverallProgress({
                    courseLevel: course.level || null,
                    modules: modulesWithSections.map((mod) => ({
                        id: mod.id,
                        sections: (mod.sections || []).map((section) => ({ id: section.id })),
                    })),
                    sectionProgressBySectionId,
                    quizAssessmentScopes: quizAssessmentProgress.scopes,
                    quizCountByModuleId,
                    assignmentCountByModuleId,
                    courseEndQuizCount,
                    courseEndAssignmentCount,
                });

                const completionPercent = overallProgress.completionPercent;
                const isCompleted = overallProgress.isCompleted;
                const quizAssessmentMet =
                    await this.courseQuizAssessmentProgressService.isCourseQuizAssessmentRequirementsMet(
                        userId,
                        courseId,
                        course.level || null,
                    );
                const level = String(course.level || '').trim().toLowerCase();
                const isCourseEndModel = level === 'beginner' || level === 'advanced';
                // Pillar 1/3: only course-end quiz/assessment (hide module-scoped bank items).
                const displayScopes = isCourseEndModel
                    ? quizAssessmentProgress.scopes.filter((scope) => scope.moduleId == null)
                    : quizAssessmentProgress.scopes;
                const quizAssessmentRequired = displayScopes.some(
                    (scope) => scope.quizCount > 0 || scope.assignmentCount > 0,
                );
                const videosCompleted = modulesWithSections.every((mod) =>
                    (mod.sections || []).every((section) => {
                        const row = sectionProgressBySectionId[section.id];
                        return row?.isCompleted === true || row?.isWatched === true;
                    }),
                );
                const hasEarnedCredential =
                    await this.courseCertificateService.hasDisplayableCredentialForLearner(
                        userId,
                        courseId,
                    );
                const status = isCompleted ? 'completed' : 'in_progress';

                const row: Record<string, unknown> = {
                    course: {
                        id: course.id,
                        title: course.title,
                        image: course.image,
                        level: course.level || null,
                        programId: course.programId || null,
                        programPillarIndex: course.programPillarIndex ?? null,
                        programTitle: course.program?.title || '',
                        freeOrPaid: course.freeOrPaid,
                        isEnrolled: Boolean(course.isEnrolled),
                        accessViaBundle: Boolean(course.accessViaBundle),
                    },
                    modules: modulesWithSections,
                    progress: {
                        completionPercent,
                        isCompleted,
                        status,
                        completedUnits: overallProgress.completedUnits,
                        totalUnits: overallProgress.totalUnits,
                        quizAssessmentCompleted: quizAssessmentMet,
                        quizAssessmentRequired,
                        hasEarnedCredential,
                        videosCompleted,
                        viewedSectionIds,
                        currentSectionId: currentSectionId ? String(currentSectionId) : null,
                        lastAccessedAt,
                    },
                };

                if (includeQuizAssessment) {
                    row.quizAssessment = {
                        ...quizAssessmentProgress,
                        scopes: displayScopes,
                        quizAssessmentCompleted: quizAssessmentMet,
                    };
                }

                return row;
            }),
        );

        return rows.filter(Boolean);
    }

}

