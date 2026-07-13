import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CorporateService } from './corporate.service';

/**
 * Corporate HR portal APIs.
 * Public for now (no login/SSO yet). Later: guard + Corporate role only.
 */
@ApiTags('Corporate')
@Controller('corporate')
export class CorporateController {
  constructor(private readonly corporateService: CorporateService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Corporate dashboard overview (public for now)' })
  @ApiQuery({ name: 'companyCode', required: false })
  async getOverview(@Query('companyCode') companyCode?: string) {
    const data = await this.corporateService.getOverview(companyCode);
    return { data };
  }

  @Get('learners')
  @ApiOperation({ summary: 'Corporate learner progress list (public for now)' })
  @ApiQuery({ name: 'companyCode', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLearners(
    @Query('companyCode') companyCode?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.corporateService.getLearners({
      companyCode,
      q,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('certificates')
  @ApiOperation({ summary: 'Corporate certificate readiness (public for now)' })
  @ApiQuery({ name: 'companyCode', required: false })
  async getCertificates(@Query('companyCode') companyCode?: string) {
    const data = await this.corporateService.getCertificates(companyCode);
    return { data };
  }
}
