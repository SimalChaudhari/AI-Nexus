import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { IntlAuthService } from '../intl-auth/intl-auth.service';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { Roles } from '../jwt/roles.decorator';
import { RolesGuard } from '../jwt/roles.guard';
import { SessionGuard } from '../jwt/session.guard';
import { UserRole } from '../user/users.entity';
import {
  IntlConfirmPaymentDto,
  IntlCreateCheckoutDto,
  IntlValidatePromoDto,
  UpdateIntlMembershipSettingsDto,
} from './intl-payment.dto';
import { IntlPaymentService } from './intl-payment.service';

@ApiTags('International Payments')
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

  /** Admin: SGD FX rates for converting default prices in promo country popup. */
  @Get('fx-rates')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Admin: latest SGD FX rates' })
  async fxRates(@Res() res: Response) {
    const rates = await this.intlPaymentService.getFxRatesFromSgd();
    return res.status(HttpStatus.OK).json({ data: rates || { SGD: 1 } });
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
  /** Admin: International membership base + promo amounts (SGD). */
  @Get('membership-settings')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get international membership promo & pricing settings' })
  async getMembershipSettings(@Res() res: Response) {
    const data = await this.intlPaymentService.getMembershipSettings();
    return res.status(HttpStatus.OK).json({ data });
  }

  /** Admin: Update International membership base + promo amounts (SGD). */
  @Put('membership-settings')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update international membership promo & pricing settings' })
  async updateMembershipSettings(
    @Body() body: UpdateIntlMembershipSettingsDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.intlPaymentService.updateMembershipSettings(body || {});
      return res.status(HttpStatus.OK).json({
        message: 'International membership settings updated successfully',
        data,
      });
    } catch (error: any) {
      const status =
        typeof error?.getStatus === 'function'
          ? error.getStatus()
          : error?.status || error?.statusCode || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        message: error?.message || 'Could not update membership settings',
      });
    }
  }

  /** Same as /affiliate/validate for codes, with international FX pricing. */
  @Post('validate-promo')
  @ApiOperation({
    summary: 'Validate affiliate/voucher code and return international membership pricing',
  })
  async validatePromo(@Body() body: IntlValidatePromoDto, @Res() res: Response) {
    try {
      const result = await this.intlPaymentService.validatePromoCode(body || {});
      return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
      const status =
        typeof error?.getStatus === 'function'
          ? error.getStatus()
          : error?.status || error?.statusCode || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        message: error?.message || 'Could not validate promo code',
        valid: false,
        discountApplied: false,
      });
    }
  }

  /** Dynamic pricing + currency for a country of residence (SGD amounts converted). */
  @Get('pricing')
  async pricing(
    @Query('countryOfResidence') countryOfResidence: string,
    @Query('promoApplied') promoApplied: string,
    @Query('membershipType') membershipType: string,
    @Query('promoCode') promoCode: string,
    @Res() res: Response,
  ) {
    const country = String(countryOfResidence || '').trim();
    if (!country) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'countryOfResidence is required',
      });
    }
    const promo = String(promoApplied || '').toLowerCase() === 'true' || promoApplied === '1';
    const pricing = await this.intlPaymentService.getPricing(
      country,
      promo,
      membershipType,
      String(promoCode || '').trim() || null,
    );
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
