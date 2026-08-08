import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { Roles } from '../jwt/roles.decorator';
import { RolesGuard } from '../jwt/roles.guard';
import { SessionGuard } from '../jwt/session.guard';
import { UserRole } from '../user/users.entity';
import { IntlLoginDto, IntlRegisterDto } from './intl-auth.dto';
import { IntlAuthService } from './intl-auth.service';

@ApiTags('International Auth')
@Controller('intl-auth')
export class IntlAuthController {
  constructor(private readonly intlAuthService: IntlAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register an international user (local auth)' })
  @ApiBody({ type: IntlRegisterDto })
  async register(@Res() response: Response, @Body() dto: IntlRegisterDto) {
    const result = await this.intlAuthService.register(dto);
    return response.status(HttpStatus.OK).json(result);
  }

  @Post('login')
  @ApiOperation({ summary: 'Sign in an international user (local auth)' })
  @ApiBody({ type: IntlLoginDto })
  async login(@Res() response: Response, @Body() dto: IntlLoginDto) {
    const result = await this.intlAuthService.login(dto);
    return response.status(HttpStatus.OK).json(result);
  }

  @Get('me')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Current international user profile' })
  async me(@Res() response: Response, @Headers('authorization') authorization?: string) {
    const token = this.extractBearer(authorization);
    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }
    const { id } = this.intlAuthService.verifyAccessToken(token);
    const user = await this.intlAuthService.me(id);
    return response.status(HttpStatus.OK).json({ user });
  }

  @Get('users')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Admin: list international site users' })
  async listUsers(
    @Res() response: Response,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string
  ) {
    const result = await this.intlAuthService.listUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      status,
      paymentStatus,
    });
    return response.status(HttpStatus.OK).json({
      length: result.data.length,
      data: result.data,
      pagination: result.pagination,
    });
  }

  @Get('users/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Admin: get one international user' })
  async getUser(@Res() response: Response, @Param('id') id: string) {
    const user = await this.intlAuthService.getUserById(id);
    return response.status(HttpStatus.OK).json({ user });
  }

  @Delete('users/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Admin: delete an international user' })
  async deleteUser(@Res() response: Response, @Param('id') id: string) {
    const result = await this.intlAuthService.deleteUser(id);
    return response.status(HttpStatus.OK).json(result);
  }

  private extractBearer(authorization?: string) {
    const value = String(authorization || '').trim();
    if (!value.toLowerCase().startsWith('bearer ')) return '';
    return value.slice(7).trim();
  }
}
