import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { SessionGuard } from '../jwt/session.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { UserRole } from '../user/users.entity';
import { PaginationService } from '../common/pagination/pagination.service';
import {
  UpdateCompanyEnrollmentInviteDto,
  UpsertCompanyEnrollmentInviteDto,
  ValidateCompanyEnrollmentDto,
} from './company-enrollment.dto';
import { CompanyEnrollmentService } from './company-enrollment.service';

@ApiTags('Company Enrollment')
@Controller('company-enrollment')
export class CompanyEnrollmentController {
  constructor(
    private readonly companyEnrollmentService: CompanyEnrollmentService,
    private readonly paginationService: PaginationService,
  ) {}

  @Get('mine')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Corporate)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get or auto-create enrollment QR invite for caller company' })
  async getMine(
    @Req() req: { user?: { role?: string; companyCode?: string | null } },
    @Query('companyCode') companyCodeQuery: string | undefined,
    @Res() res: Response,
  ) {
    const role = String(req.user?.role || '').toLowerCase();
    const fromJwt = String(req.user?.companyCode || '').trim();
    const fromQuery = String(companyCodeQuery || '').trim();
    const companyCode = role === 'corporate' ? fromJwt : fromQuery || fromJwt;
    if (!companyCode) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Company code is required.',
      });
    }
    const invite = await this.companyEnrollmentService.ensureInviteForCompanyCode({
      companyCode,
    });
    if (!invite) {
      return res.status(HttpStatus.OK).json({ data: null });
    }
    // Corporate: view-only payload (no expiry).
    if (role === 'corporate') {
      const { qrValidTill: _qrValidTill, qrExpired: _qrExpired, signupPath: _signupPath, ...safe } =
        invite;
      return res.status(HttpStatus.OK).json({ data: safe });
    }
    return res.status(HttpStatus.OK).json({ data: invite });
  }

  @Put('mine')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update enrollment limit / QR expiry for a company (admin only)' })
  @ApiBody({ type: UpdateCompanyEnrollmentInviteDto })
  async updateMine(
    @Req() req: { user?: { role?: string; companyCode?: string | null } },
    @Query('companyCode') companyCodeQuery: string | undefined,
    @Body() body: UpdateCompanyEnrollmentInviteDto,
    @Res() res: Response,
  ) {
    const fromJwt = String(req.user?.companyCode || '').trim();
    const fromQuery = String(companyCodeQuery || '').trim();
    const companyCode = fromQuery || fromJwt;
    if (!companyCode) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Company code is required.',
      });
    }

    const existing = await this.companyEnrollmentService.ensureInviteForCompanyCode({
      companyCode,
    });
    if (!existing) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Could not create enrollment invite for this company code.',
      });
    }

    const data = await this.companyEnrollmentService.updateInvite(existing.id, {
      maxEnrollment: body.maxEnrollment,
      qrValidTill: body.qrValidTill,
      label: body.label,
      isActive: body.isActive,
      companyCode: body.companyCode,
    });
    return res.status(HttpStatus.OK).json({
      message: 'Company enrollment invite updated.',
      data,
    });
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate company code / QR for enrollment (public)' })
  @ApiBody({ type: ValidateCompanyEnrollmentDto })
  async validate(@Body() body: ValidateCompanyEnrollmentDto, @Res() res: Response) {
    const data = await this.companyEnrollmentService.validateForEnrollment(body);
    return res.status(HttpStatus.OK).json(data);
  }

  @Get()
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List company enrollment invites (admin, paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false, description: 'Search company code or company name' })
  async list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('search') search: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.companyEnrollmentService.listInvites({
      page: this.paginationService.parsePositiveInteger(page, 1),
      limit: this.paginationService.parsePositiveInteger(limit, 10),
      search: search?.trim() || undefined,
    });
    return res.status(HttpStatus.OK).json(result);
  }

  @Get(':id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get company enrollment invite / dashboard stats (admin)' })
  async getOne(@Param('id') id: string, @Res() res: Response) {
    const data = await this.companyEnrollmentService.getInviteById(id);
    return res.status(HttpStatus.OK).json({ data });
  }

  @Post()
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create company enrollment invite with QR settings (admin)' })
  @ApiBody({ type: UpsertCompanyEnrollmentInviteDto })
  async create(@Body() body: UpsertCompanyEnrollmentInviteDto, @Res() res: Response) {
    const data = await this.companyEnrollmentService.createInvite(body);
    return res.status(HttpStatus.CREATED).json({
      message: 'Company enrollment invite created.',
      data,
    });
  }

  @Put(':id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update company enrollment invite (admin)' })
  @ApiBody({ type: UpdateCompanyEnrollmentInviteDto })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCompanyEnrollmentInviteDto,
    @Res() res: Response,
  ) {
    const data = await this.companyEnrollmentService.updateInvite(id, body);
    return res.status(HttpStatus.OK).json({
      message: 'Company enrollment invite updated.',
      data,
    });
  }

  @Delete(':id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete company enrollment invite (admin)' })
  async remove(@Param('id') id: string, @Res() res: Response) {
    const data = await this.companyEnrollmentService.deleteInvite(id);
    return res.status(HttpStatus.OK).json({
      message: 'Company enrollment invite deleted.',
      data,
    });
  }
}
