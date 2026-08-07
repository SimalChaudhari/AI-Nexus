import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

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

  private extractBearer(authorization?: string) {
    const value = String(authorization || '').trim();
    if (!value.toLowerCase().startsWith('bearer ')) return '';
    return value.slice(7).trim();
  }
}
