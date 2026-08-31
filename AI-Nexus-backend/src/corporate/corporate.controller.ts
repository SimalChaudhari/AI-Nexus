import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  Body,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { largeUploadDiskStorage } from '../common/multer-disk.util';
import { Request, Response } from 'express';

import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { SessionGuard } from '../jwt/session.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { UserRole } from '../user/users.entity';
import { CorporateService } from './corporate.service';
import {
  CorporateStaffBulkEnrolDto,
  CorporateStaffLearnerDto,
} from './corporate-enrol.dto';
import { CorporateForeignQuotationDto } from './corporate-foreign-quotation.dto';

type AuthedRequest = Request & {
  user?: { id?: string; role?: string; companyCode?: string | null };
};

const zipFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowedExt = /\.zip$/i.test(file.originalname || '');
  const allowedMime =
    /^(application\/zip|application\/x-zip-compressed|application\/octet-stream)$/i.test(
      file.mimetype || '',
    ) || !file.mimetype;
  if (!allowedExt || !allowedMime) {
    cb(new Error('Only .zip files are allowed') as any, false);
    return;
  }
  cb(null, true);
};

const csvOrExcelFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const name = String(file.originalname || '');
  const allowedExt = /\.(csv|xlsx|xls)$/i.test(name);
  const mime = String(file.mimetype || '');
  const allowedMime =
    !mime
    || /^(text\/csv|text\/plain|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/octet-stream)$/i.test(
      mime,
    );
  if (!allowedExt || !allowedMime) {
    cb(new Error('Only .csv, .xlsx or .xls files are allowed') as any, false);
    return;
  }
  cb(null, true);
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

  @Get('profile')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({
    summary: 'Corporate HR profile (Salesforce userinfoforcorporate + local account)',
  })
  async getProfile(@Req() req: AuthedRequest) {
    const data = await this.corporateService.getHrProfile(req.user?.id);
    return { data };
  }

  @Get('overview')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Corporate dashboard overview' })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  async getOverview(@Req() req: AuthedRequest, @Query('companyCode') companyCode?: string) {
    const data = await this.corporateService.getOverview(this.resolveCompanyCode(req, companyCode));
    const role = String(req.user?.role || '').toLowerCase();
    // Corporate users may view QR + seat stats only — hide expiry / admin fields.
    if (role === 'corporate' && data?.enrollmentInvite) {
      const { qrValidTill: _qrValidTill, qrExpired: _qrExpired, signupPath: _signupPath, ...invite } =
        data.enrollmentInvite;
      return { data: { ...data, enrollmentInvite: invite } };
    }
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

  @Post('staff-enrol')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({
    summary: 'Enrol a single staff learner (createblukuserfornexus + password + local user)',
  })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  @ApiBody({ type: CorporateStaffLearnerDto })
  async enrolStaff(
    @Req() req: AuthedRequest,
    @Body() body: CorporateStaffLearnerDto,
    @Query('companyCode') companyCode?: string,
  ) {
    const data = await this.corporateService.enrolStaff({
      actorUserId: req.user?.id,
      companyCode: this.resolveCompanyCode(req, companyCode),
      learner: body,
    });
    return { data };
  }

  @Post('staff-enrol/bulk')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Enrol staff learners in bulk (JSON array)' })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  @ApiBody({ type: CorporateStaffBulkEnrolDto })
  async enrolStaffBulk(
    @Req() req: AuthedRequest,
    @Body() body: CorporateStaffBulkEnrolDto,
    @Query('companyCode') companyCode?: string,
  ) {
    const data = await this.corporateService.enrolStaffBulk({
      actorUserId: req.user?.id,
      companyCode: this.resolveCompanyCode(req, companyCode),
      learners: body.learners,
      isAuthorisedSubmit: body.isAuthorisedSubmit,
    });
    return { data };
  }

  @Post('staff-enrol/bulk-csv/validate')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({
    summary:
      'Validate bulk staff CSV/Excel before enrolment (columns, emails, duplicates, citizenship, local+SF)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        progressJobId: {
          type: 'string',
          description: 'Optional client job id for live progress polling',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: csvOrExcelFileFilter,
    }),
  )
  async validateStaffBulkCsv(
    @Req() req: AuthedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('progressJobId') progressJobId?: string,
    @Query('companyCode') companyCode?: string,
  ) {
    const jobId = String(progressJobId || '').trim();
    if (jobId) {
      this.corporateService.startStaffEnrolProgressJob({
        jobId,
        actorUserId: req.user?.id,
        phase: 'validate',
        label: 'Starting validation…',
      });
    }
    const data = await this.corporateService.validateStaffEnrolmentCsv({
      actorUserId: req.user?.id,
      companyCode: this.resolveCompanyCode(req, companyCode),
      file,
      progressJobId: jobId || null,
    });
    return { data };
  }

  @Post('staff-enrol/bulk-csv')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Enrol staff learners from CSV/Excel (createblukuserfornexus)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        excludeRows: {
          type: 'string',
          description: 'Comma-separated sheet row numbers to skip (header = row 1)',
        },
        progressJobId: {
          type: 'string',
          description: 'Optional client job id for live progress polling',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: csvOrExcelFileFilter,
    }),
  )
  async enrolStaffBulkCsv(
    @Req() req: AuthedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('excludeRows') excludeRows?: string,
    @Body('progressJobId') progressJobId?: string,
    @Query('companyCode') companyCode?: string,
  ) {
    const jobId = String(progressJobId || '').trim();
    if (jobId) {
      this.corporateService.startStaffEnrolProgressJob({
        jobId,
        actorUserId: req.user?.id,
        phase: 'enrol',
        label: 'Starting enrolment…',
      });
    }
    const data = await this.corporateService.enrolStaffBulkFromCsv({
      actorUserId: req.user?.id,
      companyCode: this.resolveCompanyCode(req, companyCode),
      file,
      excludeRows,
      progressJobId: jobId || null,
    });
    return { data };
  }

  @Get('staff-enrol/bulk-csv/progress/:jobId')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({
    summary: 'Poll live progress for a CSV validate / enrol job (client-supplied jobId)',
  })
  async getStaffBulkCsvProgress(
    @Req() req: AuthedRequest,
    @Param('jobId') jobId: string,
  ) {
    const data = this.corporateService.getStaffEnrolProgress({
      jobId,
      actorUserId: req.user?.id,
    });
    return { data };
  }

  @Get('staff-enrol/batches')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'List corporate staff enrolment batch results (track page)' })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'q', required: false, description: 'Search file name, message, source, id' })
  async listStaffEnrolBatches(
    @Req() req: AuthedRequest,
    @Query('companyCode') companyCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.corporateService.listStaffEnrolBatches({
      actorUserId: req.user?.id,
      companyCode: this.resolveCompanyCode(req, companyCode),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
    });
  }

  @Get('staff-enrol/batches/:batchId')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Get one corporate staff enrolment batch with row-level track' })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'q', required: false, description: 'Search name, email, reason' })
  @ApiQuery({ name: 'status', required: false, description: 'all | passed | skipped' })
  async getStaffEnrolBatch(
    @Req() req: AuthedRequest,
    @Param('batchId') batchId: string,
    @Query('companyCode') companyCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.corporateService.getStaffEnrolBatch({
      actorUserId: req.user?.id,
      companyCode: this.resolveCompanyCode(req, companyCode),
      batchId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      status,
    });
    return { data };
  }

  @Post('foreign-quotation-request')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({
    summary: 'Request a quotation for foreign non-member corporate learners',
  })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  @ApiBody({ type: CorporateForeignQuotationDto })
  async submitForeignQuotationRequest(
    @Req() req: AuthedRequest,
    @Body() body: CorporateForeignQuotationDto,
    @Query('companyCode') companyCode?: string,
  ) {
    const data = await this.corporateService.submitForeignQuotationRequest({
      actorUserId: req.user?.id,
      companyCode: this.resolveCompanyCode(req, companyCode),
      body,
    });
    return { data };
  }

  @Post('bulk-enrolment/upload')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'Upload one or more bulk enrolment ZIP files' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['files'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: largeUploadDiskStorage('bulk-enrolment-zip'),
      limits: { fileSize: 100 * 1024 * 1024 },
      fileFilter: zipFileFilter,
    }),
  )
  async uploadBulkEnrolmentZip(
    @Req() req: AuthedRequest,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('companyCode') companyCode?: string,
  ) {
    return this.corporateService.uploadBulkEnrolmentZips({
      companyCode: this.resolveCompanyCode(req, companyCode),
      uploadedByUserId: req.user?.id,
      files,
    });
  }

  @Get('bulk-enrolment/my-uploads')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({ summary: 'List bulk enrolment ZIP files uploaded by the current user' })
  @ApiQuery({ name: 'companyCode', required: false, description: 'Admin override only' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listMyBulkEnrolmentUploads(
    @Req() req: AuthedRequest,
    @Query('companyCode') companyCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.corporateService.listBulkEnrolmentUploads({
      companyCode: this.resolveCompanyCode(req, companyCode),
      uploadedByUserId: req.user?.id,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('bulk-enrolment/uploads')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'List bulk enrolment ZIP uploads (Admin only)' })
  @ApiQuery({ name: 'companyCode', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listBulkEnrolmentUploads(
    @Req() req: AuthedRequest,
    @Query('companyCode') companyCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.corporateService.listBulkEnrolmentUploads({
      companyCode: this.resolveCompanyCode(req, companyCode),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('bulk-enrolment/uploads/:uploadId/download')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({
    summary: 'Download a bulk enrolment ZIP (owner can download own file; Admin can download any)',
  })
  async downloadBulkEnrolmentZip(
    @Req() req: AuthedRequest,
    @Res() res: Response,
    @Param('uploadId') uploadId: string,
  ) {
    const { filename, buffer, mimeType } = await this.corporateService.downloadBulkEnrolmentZip({
      uploadId,
      requesterUserId: req.user?.id,
      requesterRole: req.user?.role,
    });
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  }

  @Delete('bulk-enrolment/uploads/:uploadId')
  @Roles(UserRole.Corporate, UserRole.Admin)
  @ApiOperation({
    summary: 'Delete a bulk enrolment ZIP (owner can delete own file; Admin can delete any)',
  })
  async deleteBulkEnrolmentZip(
    @Req() req: AuthedRequest,
    @Param('uploadId') uploadId: string,
  ) {
    return this.corporateService.deleteBulkEnrolmentZip({
      uploadId,
      requesterUserId: req.user?.id,
      requesterRole: req.user?.role,
    });
  }
}
