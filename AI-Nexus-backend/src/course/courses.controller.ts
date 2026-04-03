//courses.controller.ts
import {
    Controller,
    HttpStatus,
    Param,
    Get,
    Post,
    Delete,
    Put,
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
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
import { CourseFavoriteService } from './course-favorite.service';
import { CourseSectionFavoriteService } from './course-section-favorite.service';
import { CourseEnrollmentService } from './course-enrollment.service';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parseBooleanQuery, parsePositiveInteger } from '../common/pagination/paginated-list.util';
import { randomUUID } from 'crypto';

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

const parseOptionalPositiveInteger = (value?: string): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    return parsePositiveInteger(value, 1);
};

@ApiTags('Courses')
@Controller('courses')
export class CourseController {
    constructor(
        private readonly courseService: CourseService,
        private readonly localStorageService: LocalStorageService,
        private readonly courseModuleService: CourseModuleService,
        private readonly courseModuleSectionService: CourseModuleSectionService,
        private readonly courseWatchProgressService: CourseWatchProgressService,
        private readonly courseSectionWatchProgressService: CourseSectionWatchProgressService,
        private readonly courseFavoriteService: CourseFavoriteService,
        private readonly courseSectionFavoriteService: CourseSectionFavoriteService,
        private readonly courseEnrollmentService: CourseEnrollmentService,
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
    async getAllCourses(
        @Req() request: Request,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('group') group?: string,
        @Query('freeOrPaid') freeOrPaid?: string,
        @Query('isFavorite') isFavorite?: string,
        @Query('isEnrolled') isEnrolled?: string,
        @Res() response?: Response,
    ) {
        const hasFilters = Boolean(page || limit || search || group || freeOrPaid || isFavorite || isEnrolled);
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
    @ApiQuery({ name: 'group', required: false, description: 'Optional group: basic | intermediate | advance' })
    @ApiQuery({ name: 'page', required: false, description: 'Default page for all groups', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Default limit for all groups', example: 12 })
    @ApiQuery({ name: 'beginnerPage', required: false, description: 'Page for Beginner group', example: 1 })
    @ApiQuery({ name: 'beginnerLimit', required: false, description: 'Limit for Beginner group', example: 5 })
    @ApiQuery({ name: 'basicPage', required: false, description: 'Deprecated alias for beginnerPage', example: 1 })
    @ApiQuery({ name: 'basicLimit', required: false, description: 'Deprecated alias for beginnerLimit', example: 5 })
    @ApiQuery({ name: 'intermediatePage', required: false, description: 'Page for Intermediate group', example: 1 })
    @ApiQuery({ name: 'intermediateLimit', required: false, description: 'Limit for Intermediate group', example: 5 })
    @ApiQuery({ name: 'advancePage', required: false, description: 'Page for Advance group', example: 1 })
    @ApiQuery({ name: 'advanceLimit', required: false, description: 'Limit for Advance group', example: 5 })
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
        @Query('beginnerPage') beginnerPage?: string,
        @Query('beginnerLimit') beginnerLimit?: string,
        @Query('basicPage') basicPage?: string,
        @Query('basicLimit') basicLimit?: string,
        @Query('intermediatePage') intermediatePage?: string,
        @Query('intermediateLimit') intermediateLimit?: string,
        @Query('advancePage') advancePage?: string,
        @Query('advanceLimit') advanceLimit?: string,
        @Res() response?: Response,
    ) {
        const userId = (request as any).user?.id;
        const groups = await this.courseService.getGroupedCourses({
            userId,
            group,
            search,
            freeOrPaid: parseBooleanQuery(freeOrPaid),
            isFavorite: parseBooleanQuery(isFavorite),
            isEnrolled: parseBooleanQuery(isEnrolled),
            defaultPage: parsePositiveInteger(page, 1),
            defaultLimit: parsePositiveInteger(limit, 12),
            beginnerPage:
                parseOptionalPositiveInteger(beginnerPage) ??
                parseOptionalPositiveInteger(basicPage),
            beginnerLimit:
                parseOptionalPositiveInteger(beginnerLimit) ??
                parseOptionalPositiveInteger(basicLimit),
            basicPage: parseOptionalPositiveInteger(basicPage),
            basicLimit: parseOptionalPositiveInteger(basicLimit),
            intermediatePage: parseOptionalPositiveInteger(intermediatePage),
            intermediateLimit: parseOptionalPositiveInteger(intermediateLimit),
            advancePage: parseOptionalPositiveInteger(advancePage),
            advanceLimit: parseOptionalPositiveInteger(advanceLimit),
        });

        return response!.status(HttpStatus.OK).json({
            success: true,
            message: 'Data fetched successfully',
            data: { groups },
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

        // Base course info (includes sectionProgressBySectionId map for trackable content)
        const course = await this.courseService.getById(courseId);

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

        return response.status(HttpStatus.OK).json({
            data: {
                course,
                enrolled,
                modules: modulesWithSections,
                sectionProgressBySectionId,
            },
            meta: unlockInfo,
        });
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
        const userRole = (request as any).user?.role;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const shouldEnforceSequentialLock = userRole === UserRole.User;
        if (shouldEnforceSequentialLock) {
            const unlock = await this.courseWatchProgressService.getUnlockInfo(userId, courseId);
            if (unlock.isLocked) {
                throw new ForbiddenException({
                    message: 'Complete the previous course first to access section progress.',
                    code: 'COURSE_LOCKED',
                    previousCourseId: unlock.previousCourseId,
                    previousCourseProgress: unlock.previousProgress,
                });
            }
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
        const userRole = (request as any).user?.role;
        if (!userId) {
            return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
        }
        const shouldEnforceSequentialLock = userRole === UserRole.User;
        if (shouldEnforceSequentialLock) {
            const unlock = await this.courseWatchProgressService.getUnlockInfo(userId, courseId);
            if (unlock.isLocked) {
                throw new ForbiddenException({
                    message: 'Complete the previous course first to update section progress.',
                    code: 'COURSE_LOCKED',
                    previousCourseId: unlock.previousCourseId,
                    previousCourseProgress: unlock.previousProgress,
                });
            }
        }
        const progress = await this.courseSectionWatchProgressService.upsertSectionProgress(
            userId,
            courseId,
            sectionId,
            dto,
        );
        return response.status(HttpStatus.OK).json({
            message: 'Section progress updated',
            data: progress,
        });
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
        const course = await this.courseService.getById(id);
        const userId = (request as any).user?.id;
        
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

    @Post('modules/sections/upload-video')
    @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiBearerAuth('bearer')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload single course section video' })
    @UseInterceptors(
        FileInterceptor('video', {
            storage: memoryStorage(),
            limits: { fileSize: SECTION_VIDEO_LIMIT_BYTES }, // 20GB
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
        const url = await this.localStorageService.saveFile(file, 'course-section-video');
        return response.status(HttpStatus.OK).json({ data: { url } });
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

        // If modules (and optional sections) were sent, create them after the course.
        // FormData sends modules as a JSON string; read from body in case DTO doesn't have it.
        let modulesPayload: Array<{ title: string; description?: string; sortOrder?: number; sections?: Array<{ title: string; videoUrl?: string; description?: string; content?: string; watchtime?: string; images?: string[]; attachments?: string[]; sortOrder?: number }> }> = [];
        const raw = createCourseDto.modules ?? (req.body && (req.body as any).modules);
        if (typeof raw === 'string' && raw.trim()) {
            try {
                const parsed = JSON.parse(raw) as unknown;
                modulesPayload = Array.isArray(parsed) ? parsed : [];
            } catch {
                modulesPayload = [];
            }
        } else if (Array.isArray(raw)) {
            modulesPayload = raw;
        }
        if (modulesPayload.length > 0) {
            for (const mod of modulesPayload) {
                try {
                    const createdModule = await this.courseModuleService.create(courseId, {
                        title: mod?.title ?? 'Untitled module',
                        description: mod?.description,
                        sortOrder: mod?.sortOrder,
                    });
                    const sections = mod?.sections;
                    if (Array.isArray(sections) && sections.length > 0) {
                        for (const sec of sections) {
                            try {
                                await this.courseModuleSectionService.create(createdModule.id, {
                                    title: sec?.title ?? 'Untitled section',
                                    videoUrl: sec?.videoUrl,
                                    description: sec?.description,
                                    content: sec?.content,
                                    watchtime: sec?.watchtime,
                                    images: sec?.images,
                                    attachments: sec?.attachments,
                                    sortOrder: sec?.sortOrder,
                                });
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
        const courses = courseFavorites.map((f) => ({ ...f.course, isFavorite: true }));

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

}

