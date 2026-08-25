import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';
import { Roles } from '../jwt/roles.decorator';
import { RolesGuard } from '../jwt/roles.guard';
import { SessionGuard } from '../jwt/session.guard';
import { UserRole } from '../user/users.entity';
import {
  CreateIntlPathwayModuleDto,
  CreateIntlPathwayRoleDto,
  UpdateIntlPathwayModuleDto,
  UpdateIntlPathwayRoleDto,
} from './intl-pathway.dto';
import { IntlJwtAuthGuard } from '../intl-auth/intl-jwt-auth.guard';
import { UpdateIntlPathwayWatchProgressDto } from './intl-pathway-watch-progress.dto';
import { IntlPathwayWatchProgressService } from './intl-pathway-watch-progress.service';
import { IntlPathwayService } from './intl-pathway.service';

@ApiTags('International Pathway')
@Controller('intl-pathway')
export class IntlPathwayController {
  constructor(
    private readonly intlPathwayService: IntlPathwayService,
    private readonly watchProgressService: IntlPathwayWatchProgressService,
  ) {}

  @Get('planner')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Planner catalog (modules + roles). Video URLs only for signed-in international users.',
  })
  async getPlanner(@Req() request: Request, @Res() response: Response) {
    const includeVideoUrls = this.canWatchPathwayVideos(request);
    const data = await this.intlPathwayService.getPlannerCatalog(includeVideoUrls);
    const user = request.user as { typ?: string; sub?: string; id?: string } | undefined;
    // Intl JWT uses `sub`; OptionalJwtAuthGuard assigns the decoded payload as-is.
    const userId =
      user?.typ === 'intl' ? String(user.id || user.sub || '').trim() : '';
    if (userId) {
      (data as { progressByCode?: Record<string, unknown> }).progressByCode =
        await this.watchProgressService.listByUser(userId);
    }
    return response.status(HttpStatus.OK).json({ data });
  }

  @Get('course-tree')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Course → Module → Section tree for international pathway cascade picker',
  })
  async getCourseTree(@Res() response: Response) {
    const data = await this.intlPathwayService.getCourseTree();
    return response.status(HttpStatus.OK).json({ data });
  }

  @Get('course-lessons')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'List course lesson titles with videoUrl for international pathway title picker',
  })
  async listCourseLessons(@Res() response: Response) {
    const data = await this.intlPathwayService.getCourseLessonOptions();
    return response.status(HttpStatus.OK).json({ length: data.length, data });
  }

  @Post('reseed-design')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Delete all pathway modules/roles and reseed from frontend design catalog',
  })
  async reseedFromDesign(@Res() response: Response) {
    const result = await this.intlPathwayService.reseedFromDesign();
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('modules/sync-from-courses')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Sync pathway modules from live Course → Module → Section structure',
  })
  async syncModulesFromCourses(@Res() response: Response) {
    const result = await this.intlPathwayService.syncModulesFromCourses();
    return response.status(HttpStatus.OK).json(result);
  }

  // ---- Modules ----
  // Progress routes MUST be registered before `modules/:id` so Nest does not
  // treat `progress` as an id segment on ambiguous matchers.

  @Get('modules')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List pathway modules' })
  async listModules(@Req() request: Request, @Res() response: Response) {
    const isAdmin = request.user?.role === UserRole.Admin;
    const data = isAdmin
      ? await this.intlPathwayService.getModulesAdmin()
      : await this.intlPathwayService.getModulesPublic();
    const payload = isAdmin
      ? data
      : this.intlPathwayService.sanitizePublicModules(data, this.canWatchPathwayVideos(request));
    return response.status(HttpStatus.OK).json({ length: payload.length, data: payload });
  }

  @Get('modules/:code/progress')
  @UseGuards(IntlJwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get watch progress for one pathway module' })
  async getModuleProgress(
    @Req() request: Request,
    @Param('code') code: string,
    @Res() response: Response,
  ) {
    const userId = String((request.user as { id?: string } | undefined)?.id || '');
    if (!userId) {
      return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Sign in required' });
    }
    const data = await this.watchProgressService.getByModuleCode(userId, code);
    return response.status(HttpStatus.OK).json({ data });
  }

  @Put('modules/:code/progress')
  @UseGuards(IntlJwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiBody({ type: UpdateIntlPathwayWatchProgressDto })
  @ApiOperation({ summary: 'Upsert unique watch-coverage progress for one pathway module' })
  async putModuleProgress(
    @Req() request: Request,
    @Param('code') code: string,
    @Body() body: UpdateIntlPathwayWatchProgressDto,
    @Res() response: Response,
  ) {
    const userId = String((request.user as { id?: string } | undefined)?.id || '');
    if (!userId) {
      return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Sign in required' });
    }
    const data = await this.watchProgressService.upsertByModuleCode(userId, code, body);
    return response.status(HttpStatus.OK).json({ data });
  }

  @Get('modules/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get pathway module by id (admin)' })
  async getModule(@Param('id') id: string, @Res() response: Response) {
    const data = await this.intlPathwayService.getModuleByIdAdmin(id);
    return response.status(HttpStatus.OK).json({ data });
  }

  @Post('modules')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create pathway module' })
  @ApiBody({ type: CreateIntlPathwayModuleDto })
  async createModule(@Body() body: CreateIntlPathwayModuleDto, @Res() response: Response) {
    const result = await this.intlPathwayService.createModule(body);
    return response.status(HttpStatus.CREATED).json(result);
  }

  @Put('modules/update/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update pathway module' })
  @ApiBody({ type: UpdateIntlPathwayModuleDto })
  async updateModule(
    @Param('id') id: string,
    @Body() body: UpdateIntlPathwayModuleDto,
    @Res() response: Response,
  ) {
    const result = await this.intlPathwayService.updateModule(id, body);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('modules/delete/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Soft-delete pathway module' })
  async deleteModule(@Param('id') id: string, @Res() response: Response) {
    const result = await this.intlPathwayService.deleteModule(id);
    return response.status(HttpStatus.OK).json(result);
  }

  // ---- Roles ----

  @Get('roles')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List pathway roles' })
  async listRoles(@Req() request: Request, @Res() response: Response) {
    const isAdmin = request.user?.role === UserRole.Admin;
    const data = isAdmin
      ? await this.intlPathwayService.getRolesAdmin()
      : await this.intlPathwayService.getRolesPublic();
    return response.status(HttpStatus.OK).json({ length: data.length, data });
  }

  @Get('roles/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get pathway role by id (admin)' })
  async getRole(@Param('id') id: string, @Res() response: Response) {
    const data = await this.intlPathwayService.getRoleByIdAdmin(id);
    return response.status(HttpStatus.OK).json({ data });
  }

  @Post('roles')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create pathway role' })
  @ApiBody({ type: CreateIntlPathwayRoleDto })
  async createRole(@Body() body: CreateIntlPathwayRoleDto, @Res() response: Response) {
    const result = await this.intlPathwayService.createRole(body);
    return response.status(HttpStatus.CREATED).json(result);
  }

  @Put('roles/update/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update pathway role' })
  @ApiBody({ type: UpdateIntlPathwayRoleDto })
  async updateRole(
    @Param('id') id: string,
    @Body() body: UpdateIntlPathwayRoleDto,
    @Res() response: Response,
  ) {
    const result = await this.intlPathwayService.updateRole(id, body);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('roles/delete/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Soft-delete pathway role' })
  async deleteRole(@Param('id') id: string, @Res() response: Response) {
    const result = await this.intlPathwayService.deleteRole(id);
    return response.status(HttpStatus.OK).json(result);
  }

  @Get('progress')
  @UseGuards(IntlJwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Watch progress for all pathway modules (current international user)' })
  async listProgress(@Req() request: Request, @Res() response: Response) {
    const userId = String((request.user as { id?: string } | undefined)?.id || '');
    if (!userId) {
      return response.status(HttpStatus.UNAUTHORIZED).json({ message: 'Sign in required' });
    }
    const data = await this.watchProgressService.listByUser(userId);
    return response.status(HttpStatus.OK).json({ data });
  }

  @Get('certificates/my')
  @UseGuards(IntlJwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List international pathway certificates' })
  async myCertificates(@Req() request: Request, @Res() response: Response) {
    const userId = String((request.user as { id?: string } | undefined)?.id || '');
    const data = await this.watchProgressService.listCertificates(userId);
    return response.status(HttpStatus.OK).json({ data });
  }

  @Post('certificates/issue')
  @UseGuards(IntlJwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Issue certificate when all required pathway modules are completed' })
  async issueCertificate(@Req() request: Request, @Res() response: Response) {
    const userId = String((request.user as { id?: string } | undefined)?.id || '');
    const data = await this.watchProgressService.issueCertificate(userId);
    return response.status(HttpStatus.OK).json({ data });
  }

  @Get('certificates/:id/pdf')
  @UseGuards(IntlJwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary:
      'Download pathway certificate PDF (same AI Nexus ISCA COA builder — logos, e-sign, transcript)',
  })
  async downloadCertificatePdf(
    @Req() request: Request,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const userId = String((request.user as { id?: string } | undefined)?.id || '');
    const { filename, buffer } = await this.watchProgressService.getCertificatePdf(userId, id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return response.status(HttpStatus.OK).send(buffer);
  }

  /** Paid international session (`typ: intl`) or LMS admin. Draft signup tokens cannot watch. */
  private canWatchPathwayVideos(request: Request) {
    const user = request.user as { typ?: string; role?: string } | undefined;
    if (!user) return false;
    if (user.typ === 'intl') return true;
    return user.role === UserRole.Admin;
  }
}
