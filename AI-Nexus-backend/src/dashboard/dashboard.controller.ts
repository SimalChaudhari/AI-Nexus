import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { OverallGrowthService, OverallGrowthUserMetric } from './overall-growth.service';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { UserRole } from '../user/users.entity';

@ApiTags('Dashboard')
@ApiBearerAuth('bearer')
@Controller('dashboard')
@UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly overallGrowthService: OverallGrowthService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard summary statistics' })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('overall-growth')
  @ApiOperation({ summary: 'Weekly Metric No. 1 — current totals vs last week' })
  async getOverallGrowth() {
    return this.overallGrowthService.getStats();
  }

  @Get('overall-growth/weekly')
  @ApiOperation({ summary: 'Weekly Metric No. 1 — day/week/month growth from launch' })
  async getOverallGrowthWeekly() {
    return this.overallGrowthService.getWeeklyReport();
  }

  @Get('overall-growth/users-csv')
  @ApiOperation({ summary: 'Weekly Metric No. 1 — download enrolled / badge / champion user CSV' })
  async exportOverallGrowthUsersCsv(
    @Query('metric') metric: string | undefined,
    @Query('fields') fields: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() response: Response,
  ) {
    const allowed: OverallGrowthUserMetric[] = ['all', 'enrolled', 'fluency', 'badge', 'champion'];
    const normalized = allowed.includes(metric as OverallGrowthUserMetric)
      ? (metric as OverallGrowthUserMetric)
      : 'all';
    const { filename, csv } = await this.overallGrowthService.exportUsersCsv({
      metric: normalized,
      fields: String(fields || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      from,
      to,
    });
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return response.status(200).send(csv);
  }

  @Get('company-growth')
  @ApiOperation({
    summary: 'Weekly Metric No. 2 — enrolled companies, week/month growth, badge and champion %',
  })
  async getCompanyGrowth() {
    return this.overallGrowthService.getCompanyGrowthReport();
  }

  @Get('recent-orders')
  @ApiOperation({ summary: 'Get recent orders for dashboard' })
  async getRecentOrders() {
    return this.dashboardService.getRecentOrders(5);
  }

  @Get('top-rated-courses')
  @ApiOperation({ summary: 'Get top rated courses for dashboard' })
  async getTopRatedCourses() {
    return this.dashboardService.getTopRatedCourses(5);
  }
}
