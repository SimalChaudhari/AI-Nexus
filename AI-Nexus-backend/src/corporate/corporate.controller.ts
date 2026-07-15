import { Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { SessionGuard } from '../jwt/session.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { UserRole } from '../user/users.entity';
import { CorporateService } from './corporate.service';

type AuthedRequest = Request & {
  user?: { id?: string; role?: string; companyCode?: string | null };
};

/**
 * Corporate HR portal APIs — Corporate / Admin only.
 * Password login for now; SSO later.
 */
@ApiTags('Corporate')
@ApiBearerAuth('bearer')
@Controller('corporate')
@UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
export class CorporateController {
  constructor(private readonly corporateService: CorporateService) {}

  private resolveCompanyCode(req: AuthedRequest, queryCode?: string): string | undefined {
    const role = String(req.user?.role || '');
    if (role === UserRole.Corporate) {
      return String(req.user?.companyCode || '').trim() || undefined;
    }
    return queryCode;
  }

  @Get('overview')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Corporate dashboard overview' })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  async getOverview(@Req() req: AuthedRequest, @Query('companyCode') companyCode?: string) {
    const data = await this.corporateService.getOverview(this.resolveCompanyCode(req, companyCode));
    return { data };
  }

  @Get('learners/export')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Export corporate learner progress CSV (filtered)' })
  @ApiQuery({ name: 'companyCode', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'status', required: false })
  async exportLearnersCsv(
    @Req() req: AuthedRequest,
    @Res() res: Response,
    @Query('companyCode') companyCode?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    const { filename, csv } = await this.corporateService.exportLearnersCsv({
      companyCode: this.resolveCompanyCode(req, companyCode),
      q,
      status,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  }

  @Get('learners')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Corporate learner progress list' })
  @ApiQuery({ name: 'companyCode', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLearners(
    @Req() req: AuthedRequest,
    @Query('companyCode') companyCode?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.corporateService.getLearners({
      companyCode: this.resolveCompanyCode(req, companyCode),
      q,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('learners/:userId/nudge')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Send learning nudge email to a corporate learner (1-day cooldown)' })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  async nudgeLearner(
    @Req() req: AuthedRequest,
    @Param('userId') userId: string,
    @Query('companyCode') companyCode?: string,
  ) {
    return this.corporateService.nudgeLearner(
      userId,
      this.resolveCompanyCode(req, companyCode),
      req.user?.id,
    );
  }

  @Get('nudge-campaigns/preview')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({
    summary: 'Preview incomplete learners who would receive a nudge campaign email',
  })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  async previewNudgeCampaign(
    @Req() req: AuthedRequest,
    @Query('companyCode') companyCode?: string,
  ) {
    return this.corporateService.previewNudgeCampaign(this.resolveCompanyCode(req, companyCode));
  }

  @Post('nudge-campaigns')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({
    summary:
      'Send the same nudge template to all learners who have not completed the course (logged for audit)',
  })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  async createNudgeCampaign(
    @Req() req: AuthedRequest,
    @Query('companyCode') companyCode?: string,
  ) {
    return this.corporateService.createNudgeCampaign(
      this.resolveCompanyCode(req, companyCode),
      req.user?.id,
    );
  }

  @Get('nudge-campaigns')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'List nudge campaigns for this company' })
  @ApiQuery({ name: 'companyCode', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listNudgeCampaigns(
    @Req() req: AuthedRequest,
    @Query('companyCode') companyCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.corporateService.listNudgeCampaigns({
      companyCode: this.resolveCompanyCode(req, companyCode),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('nudge-email-logs')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({
    summary: 'Audit log of every nudge email sent (proof of delivery attempts)',
  })
  @ApiQuery({ name: 'companyCode', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'q', required: false, description: 'Search name, email, subject, progress' })
  @ApiQuery({ name: 'status', required: false, description: 'sent | failed | skipped' })
  @ApiQuery({ name: 'source', required: false, description: 'single | campaign' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listNudgeEmailLogs(
    @Req() req: AuthedRequest,
    @Query('companyCode') companyCode?: string,
    @Query('campaignId') campaignId?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.corporateService.listNudgeEmailLogs({
      companyCode: this.resolveCompanyCode(req, companyCode),
      campaignId,
      q,
      status,
      source,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('learners/:userId')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Corporate learner progress detail' })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  async getLearner(
    @Req() req: AuthedRequest,
    @Param('userId') userId: string,
    @Query('companyCode') companyCode?: string,
  ) {
    return this.corporateService.getLearner(userId, this.resolveCompanyCode(req, companyCode));
  }

  @Get('certificates')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Corporate certificate readiness' })
  @ApiQuery({ name: 'companyCode', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'availableOnly', required: false })
  async getCertificates(
    @Req() req: AuthedRequest,
    @Query('companyCode') companyCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('availableOnly') availableOnly?: string,
  ) {
    return this.corporateService.getCertificates({
      companyCode: this.resolveCompanyCode(req, companyCode),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      availableOnly: availableOnly === 'true' || availableOnly === '1',
    });
  }

  @Get('certificates/:certificateId/pdf')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Download learner certificate PDF (company scoped)' })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  async downloadCertificatePdf(
    @Req() req: AuthedRequest,
    @Res() res: Response,
    @Param('certificateId') certificateId: string,
    @Query('companyCode') companyCode?: string,
  ) {
    const { filename, buffer } = await this.corporateService.downloadCertificatePdf(
      this.resolveCompanyCode(req, companyCode),
      certificateId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  }
}
