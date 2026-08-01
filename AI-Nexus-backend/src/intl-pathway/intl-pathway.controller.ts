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
import { IntlPathwayService } from './intl-pathway.service';

@ApiTags('International Pathway')
@Controller('intl-pathway')
export class IntlPathwayController {
  constructor(private readonly intlPathwayService: IntlPathwayService) {}

  @Get('planner')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Public planner catalog (modules + roles)' })
  async getPlanner(@Res() response: Response) {
    const data = await this.intlPathwayService.getPlannerCatalog();
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

  @Get('modules')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List pathway modules' })
  async listModules(@Req() request: Request, @Res() response: Response) {
    const isAdmin = request.user?.role === UserRole.Admin;
    const data = isAdmin
      ? await this.intlPathwayService.getModulesAdmin()
      : await this.intlPathwayService.getModulesPublic();
    return response.status(HttpStatus.OK).json({ length: data.length, data });
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
}
