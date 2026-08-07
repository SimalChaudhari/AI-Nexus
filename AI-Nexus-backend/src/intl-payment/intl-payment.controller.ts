import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { IntlConfirmPaymentDto, IntlCreateCheckoutDto } from './intl-payment.dto';
import { IntlPaymentService } from './intl-payment.service';

@Controller('intl-payments')
export class IntlPaymentController {
  constructor(private readonly intlPaymentService: IntlPaymentService) {}

  /** Full country list for registration (code, label, phone, currency). */
  @Get('countries')
  async countries(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      countries: this.intlPaymentService.listCountries(),
    });
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
}
