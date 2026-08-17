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
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../user/users.entity';
import { Response } from 'express';
import { SkillService, SkillPaginatedListResult } from './skills.service';
import { CreateSkillDto, UpdateSkillDto } from './skills.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationService } from '../common/pagination/pagination.service';

const DEFAULT_SKILLS_PAGE = 1;
const DEFAULT_SKILLS_LIMIT = 10;

@ApiTags('Skills')
@Controller('skills')
export class SkillController {
  constructor(
    private readonly skillService: SkillService,
    private readonly paginationService: PaginationService,
  ) {}

  private async listSkills(
    response: Response,
    options: {
      page?: string;
      limit?: string;
      search?: string;
      includeInactive?: boolean;
    },
  ) {
    const hasPagination = Boolean(options.page || options.limit || options.search);
    if (hasPagination) {
      const result = await this.skillService.getAll({
        usePagination: true,
        page: this.paginationService.parsePositiveInteger(options.page, DEFAULT_SKILLS_PAGE),
        limit: this.paginationService.parsePositiveInteger(options.limit, DEFAULT_SKILLS_LIMIT),
        search: options.search?.trim() || undefined,
        includeInactive: Boolean(options.includeInactive),
      });
      const paginated = result as SkillPaginatedListResult;
      return response.status(HttpStatus.OK).json({
        length: paginated.data.length,
        data: paginated.data,
        pagination: paginated.pagination,
      });
    }

    const skills = (await this.skillService.getAll({
      includeInactive: Boolean(options.includeInactive),
    })) as SkillPaginatedListResult['data'];
    return response.status(HttpStatus.OK).json({
      length: skills.length,
      data: skills,
    });
  }

  private async resolveSkill(id: string, includeInactive: boolean) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(id)
      ? this.skillService.getById(id, { includeInactive })
      : this.skillService.getByName(id, { includeInactive });
  }

  @Get()
  @ApiOperation({ summary: 'List published skills' })
  async getAllSkills(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Res() response?: Response,
  ) {
    return this.listSkills(response!, { page, limit, search, includeInactive: false });
  }

  @Get('admin')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List all skills including hidden (admin)' })
  async getAdminSkills(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Res() response?: Response,
  ) {
    return this.listSkills(response!, { page, limit, search, includeInactive: true });
  }

  @Get('admin/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get skill by id or name including hidden (admin)' })
  async getAdminSkillById(@Param('id') id: string, @Res() response: Response) {
    const skill = await this.resolveSkill(id, true);
    return response.status(HttpStatus.OK).json({ data: skill });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a published skill by id or name' })
  async getSkillById(@Param('id') id: string, @Res() response: Response) {
    const skill = await this.resolveSkill(id, false);
    return response.status(HttpStatus.OK).json({ data: skill });
  }

  @Post()
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a skill' })
  @ApiBody({ type: CreateSkillDto })
  async createSkill(@Body() createSkillDto: CreateSkillDto, @Res() response: Response) {
    const result = await this.skillService.create(createSkillDto);
    return response.status(HttpStatus.CREATED).json(result);
  }

  @Put('update/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update a skill' })
  @ApiBody({ type: UpdateSkillDto })
  async updateSkill(
    @Param('id') id: string,
    @Body() updateSkillDto: UpdateSkillDto,
    @Res() response: Response,
  ) {
    const result = await this.skillService.update(id, updateSkillDto);
    return response.status(HttpStatus.OK).json(result);
  }

  @Delete('delete/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a skill' })
  async deleteSkill(@Param('id') id: string, @Res() response: Response) {
    const result = await this.skillService.delete(id);
    return response.status(HttpStatus.OK).json(result);
  }
}
