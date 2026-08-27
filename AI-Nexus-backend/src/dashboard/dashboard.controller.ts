import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { SessionGuard } from '../jwt/session.guard';
import { UserRole } from '../user/users.entity';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth('bearer')
@Controller('dashboard')
@UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard summary statistics' })
  async getStats() {
    return this.dashboardService.getStats();
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
