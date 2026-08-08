import {
  Body,
  Controller,
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
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';

import { IntlAuthService } from '../intl-auth/intl-auth.service';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { Roles } from '../jwt/roles.decorator';
import { RolesGuard } from '../jwt/roles.guard';
import { SessionGuard } from '../jwt/session.guard';
import { UserRole } from '../user/users.entity';
import { IntlConfirmPaymentDto, IntlCreateCheckoutDto } from './intl-payment.dto';
import { IntlPaymentService } from './intl-payment.service';

@Controller('intl-payments')
export class IntlPaymentController {
  constructor(
    private readonly intlPaymentService: IntlPaymentService,
    private readonly intlAuthService: IntlAuthService,
  ) {}

  /** Full country list for registration (code, label, phone, currency). */
  @Get('countries')
  async countries(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      countries: this.intlPaymentService.listCountries(),
    });
  }

  /** Signed-in user's membership payment details (for profile). */
  @Get('me')
  async me(@Res() res: Response, @Headers('authorization') authorization?: string) {
    const token = this.extractBearer(authorization);
    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }
    const { id } = this.intlAuthService.verifyAccessToken(token);
    const result = await this.intlPaymentService.getMyPayments(id);
    return res.status(HttpStatus.OK).json(result);
  }

  /** Admin: payments for one international user. */
  @Get('users/:userId')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Admin: list payments for an international user' })
  async userPayments(@Res() res: Response, @Param('userId') userId: string) {
    const result = await this.intlPaymentService.getMyPayments(userId, 50);
    return res.status(HttpStatus.OK).json(result);
  }

  /** Dynamic pricing + currency for a country of residence (SGD 365 converted). */
  @Get('pricing')
  async pricing(
    @Query('countryOfResidence') countryOfResidence: string,
    @Query('promoApplied') promoApplied: string,
    @Res() res: Response,
  ) {
    const country = String(countryOfResidence || '').trim();
    if (!country) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'countryOfResidence is required',
      });
    }
    const promo = String(promoApplied || '').toLowerCase() === 'true' || promoApplied === '1';
    const pricing = await this.intlPaymentService.getPricing(country, promo);
    return res.status(HttpStatus.OK).json(pricing);
  }

  /** Create WooshPay checkout for international membership (currency from country). */
  @Post('create-checkout')
  async createCheckout(@Body() body: IntlCreateCheckoutDto, @Res() res: Response) {
    try {
      const result = await this.intlPaymentService.createCheckout(body);
      return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
      const status =
        typeof error?.getStatus === 'function'
          ? error.getStatus()
          : error?.status || error?.statusCode || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        message: error?.message || 'Could not create checkout session',
      });
    }
  }

  /** Confirm WooshPay payment and activate international_users account. */
  @Post('confirm')
  async confirm(@Body() body: IntlConfirmPaymentDto, @Res() res: Response) {
    try {
      const result = await this.intlPaymentService.confirmPayment(body);
      return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
      const status =
        typeof error?.getStatus === 'function'
          ? error.getStatus()
          : error?.status || error?.statusCode || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        message: error?.message || 'Could not confirm payment',
      });
    }
  }

  private extractBearer(authorization?: string) {
    const value = String(authorization || '').trim();
    if (!value.toLowerCase().startsWith('bearer ')) return '';
    return value.slice(7).trim();
  }
}
