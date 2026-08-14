import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PaymentReferenceService } from '../payment/payment-reference.service';
import { PaymentService } from '../payment/payment.service';
import { PaymentSource } from '../payment/payment.entity';
import { WooshPayService } from '../payment/wooshpay.service';
import { OrderService } from '../order/order.service';
import {
  AffiliateSignupCheckoutDto,
  ConfirmAffiliatePaymentDto,
  EnsureVoucherCodeDto,
  TrackAffiliateClickDto,
  UpdateVoucherCodeDto,
  UpsertVoucherCodeDto,
  ValidateAffiliateCodeDto,
} from './affiliate.dto';
import { AffiliateService } from './affiliate.service';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { SessionGuard } from '../jwt/session.guard';
import { RolesGuard } from '../jwt/roles.guard';
import { Roles } from '../jwt/roles.decorator';
import { UserRole } from '../user/users.entity';

@ApiTags('Affiliate')
@Controller('affiliate')
export class AffiliateController {
  constructor(
    private readonly affiliateService: AffiliateService,
    private readonly wooshPayService: WooshPayService,
    private readonly paymentReferenceService: PaymentReferenceService,
    private readonly paymentService: PaymentService,
    private readonly orderService: OrderService,
  ) {}

  private validateRedirectUrl(value: string, label: 'successUrl' | 'cancelUrl'): string | null {
    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return `${label} must use http or https.`;
      }
      return null;
    } catch {
      return `${label} must be a valid URL.`;
    }
  }

  private isPaymentMarkedAsPaid(paymentStatus?: string, status?: string): boolean {
    return paymentStatus === 'paid' || status === 'complete';
  }

  private isPaymentMarkedAsFailed(paymentStatus?: string, status?: string): boolean {
    return (
      paymentStatus === 'failed'
      || paymentStatus === 'canceled'
      || status === 'expired'
      || status === 'canceled'
    );
  }

  private getFriendlyPaymentErrorMessage(error: unknown, fallback: string): string {
    const message = String((error as Error | undefined)?.message || fallback || '').trim();
    const lowerMessage = message.toLowerCase();

    if (!message) return fallback;

    if (
      lowerMessage.includes('wooshpay api 401')
      || lowerMessage.includes('invalid api key')
      || lowerMessage.includes('unauthorized')
      || lowerMessage.includes('payment_secret_key')
    ) {
      return 'Payment service is not configured correctly right now. Please contact the administrator.';
    }

    if (
      lowerMessage.includes('wooshpay api 5')
      || lowerMessage.includes('temporarily unavailable')
      || lowerMessage.includes('failed to fetch')
    ) {
      return 'Payment service is temporarily unavailable. Please try again in a few minutes.';
    }

    return message;
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate affiliate and/or voucher code and calculate payable price' })
  @ApiBody({ type: ValidateAffiliateCodeDto })
  async validate(@Body() body: ValidateAffiliateCodeDto, @Res() res: Response) {
    const pricing = await this.affiliateService.calculatePricing(body);
    return res.status(HttpStatus.OK).json({
      message: pricing.discountApplied
        ? 'Discount applied. Payable amount is the promotional price.'
        : 'No valid affiliate or voucher code. Original price applies.',
      ...pricing,
    });
  }

  @Post('ensure-voucher')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create or reactivate any promo voucher code (admin)' })
  @ApiBody({ type: EnsureVoucherCodeDto })
  async ensureVoucher(@Body() body: EnsureVoucherCodeDto, @Res() res: Response) {
    const result = await this.affiliateService.ensureVoucherCode(body?.code, body?.site);
    return res.status(HttpStatus.OK).json({
      message: result.created
        ? 'Promo code created. It will use the configured promo payable amount on signup.'
        : result.reactivated
          ? 'Promo code reactivated.'
          : 'Promo code is ready.',
      ...result,
    });
  }

  @Get('vouchers')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List promo voucher codes for a site (payment | international)' })
  async listVouchers(@Query('site') site: string, @Res() res: Response) {
    const data = await this.affiliateService.listVoucherCodes(site);
    return res.status(HttpStatus.OK).json({ data });
  }

  @Post('vouchers')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a promo voucher code (admin)' })
  @ApiBody({ type: UpsertVoucherCodeDto })
  async createVoucher(@Body() body: UpsertVoucherCodeDto, @Res() res: Response) {
    const data = await this.affiliateService.createVoucherCode(body || {});
    return res.status(HttpStatus.CREATED).json({
      message: 'Promo code created.',
      data,
    });
  }

  @Put('vouchers/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update a promo voucher code (admin)' })
  @ApiBody({ type: UpdateVoucherCodeDto })
  async updateVoucher(
    @Param('id') id: string,
    @Body() body: UpdateVoucherCodeDto,
    @Res() res: Response,
  ) {
    const data = await this.affiliateService.updateVoucherCode(id, body || {});
    return res.status(HttpStatus.OK).json({
      message: 'Promo code updated.',
      data,
    });
  }

  @Delete('vouchers/:id')
  @UseGuards(SessionGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a promo voucher code (admin)' })
  async deleteVoucher(@Param('id') id: string, @Res() res: Response) {
    const data = await this.affiliateService.deleteVoucherCode(id);
    return res.status(HttpStatus.OK).json({
      message: 'Promo code deleted.',
      data,
    });
  }

  @Post('track-click')
  @ApiOperation({ summary: 'Track affiliate link click' })
  @ApiBody({ type: TrackAffiliateClickDto })
  async trackClick(
    @Body() body: TrackAffiliateClickDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.affiliateService.trackClick({
      affiliateCode: body.affiliateCode,
      landingPath: body.landingPath,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(HttpStatus.OK).json({
      message: result.tracked ? 'Affiliate click tracked.' : 'Affiliate code was not tracked.',
      ...result,
    });
  }

  @Post('signup-checkout')
  @ApiOperation({ summary: 'Create affiliate signup draft and WooshPay checkout session' })
  @ApiBody({ type: AffiliateSignupCheckoutDto })
  async signupCheckout(@Body() body: AffiliateSignupCheckoutDto, @Res() res: Response) {
    const successUrl = String(body.successUrl || '').trim();
    const cancelUrl = String(body.cancelUrl || '').trim();

    const successUrlError = this.validateRedirectUrl(successUrl, 'successUrl');
    if (successUrlError) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: successUrlError });
    }
    const cancelUrlError = this.validateRedirectUrl(cancelUrl, 'cancelUrl');
    if (cancelUrlError) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: cancelUrlError });
    }

    try {
      const { draftUser, sale, pricing } = await this.affiliateService.createSignupDraftAndSale(body);
      const purpose = 'affiliate-signup';
      const payableAmount = Number(pricing.payableAmount);
      const currency = pricing.currency;
      const totalAmountCents = Math.round(payableAmount * 100);

      const { id: refId } = await this.paymentReferenceService.create({
        userId: draftUser.id,
        courseIds: [purpose],
        items: [
          {
            id: purpose,
            name: pricing.itemName,
            price: payableAmount,
            quantity: 1,
          },
        ],
      });

      await this.affiliateService.attachPaymentRef(sale.id, refId);

      const finalSuccessUrl = `${successUrl}${successUrl.includes('?') ? '&' : '?'}ref=${refId}`;
      const finalCancelUrl =
        `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}payment=canceled&ref=${refId}`;

      const session = await this.wooshPayService.createCheckoutSession({
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: totalAmountCents,
              product_data: {
                name: pricing.itemName,
                description: 'Affiliate signup payment',
              },
            },
            quantity: 1,
          },
        ],
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        client_reference_id: refId,
        ...(draftUser.email && { customer_email: draftUser.email }),
        payment_method_types: this.wooshPayService.getCheckoutPaymentMethodTypes(),
      });

      await this.paymentReferenceService.setSessionId(refId, session.id);
      await this.paymentService.recordPending({
        userId: draftUser.id,
        clientReferenceId: refId,
        courseIds: [purpose],
        items: [
          {
            id: purpose,
            name: pricing.itemName,
            price: payableAmount,
            quantity: 1,
          },
        ],
        amount: payableAmount,
        currency,
        wooshpaySessionId: session.id,
        eventType: purpose,
      });

      return res.status(HttpStatus.OK).json({
        message: 'Checkout session created.',
        url: session.url,
        sessionId: session.id,
        refId,
        draftUserId: draftUser.id,
        pricing: {
          originalAmount: pricing.originalAmount,
          payableAmount: pricing.payableAmount,
          currency: pricing.currency,
          discountApplied: pricing.discountApplied,
          affiliateCode: sale.affiliateCode,
          voucherCode: sale.voucherCode,
        },
      });
    } catch (error) {
      const message = this.getFriendlyPaymentErrorMessage(
        error,
        (error as Error)?.message || 'Could not start affiliate signup payment.',
      );
      const status = BadRequestLike(error)
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({ message });
    }
  }

  @Post('confirm-payment')
  @ApiOperation({ summary: 'Confirm affiliate signup payment and create the user account' })
  @ApiBody({ type: ConfirmAffiliatePaymentDto })
  async confirmPayment(@Body() body: ConfirmAffiliatePaymentDto, @Res() res: Response) {
    const refId = String(body.ref || '').trim();
    const sessionId = String(body.sessionId || '').trim();

    if (!refId) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'ref is required' });
    }

    const ref = await this.paymentReferenceService.findById(refId);
    if (!ref) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Payment reference not found' });
    }

    const purpose = ref.courseIds[0] || '';
    if (purpose !== 'affiliate-signup') {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'This payment reference is not for affiliate signup.',
      });
    }

    const sessionLookupId = sessionId || ref.wooshpaySessionId || '';
    if (!sessionLookupId) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Payment session id is required.' });
    }

    try {
      const session = await this.wooshPayService.getSession(sessionLookupId);
      const sessionClientRef = String(session?.client_reference_id || '').trim();

      if (!sessionClientRef || sessionClientRef !== refId) {
        return res.status(HttpStatus.CONFLICT).json({
          message: 'This payment confirmation does not match your signup request.',
        });
      }

      if (this.isPaymentMarkedAsFailed(session?.payment_status, session?.status)) {
        await this.affiliateService.markSaleCanceled(refId);
        return res.status(HttpStatus.CONFLICT).json({
          message: 'Payment was not completed successfully. Please try again from the signup page.',
        });
      }

      if (!this.isPaymentMarkedAsPaid(session?.payment_status, session?.status)) {
        return res.status(HttpStatus.CONFLICT).json({
          message: 'Payment is still being processed. Please wait a moment and try again.',
        });
      }

      const completed = await this.affiliateService.completeSaleAfterPayment(refId);
      const sale = completed.sale;
      const amountInUnits = Number(sale.payableAmount);

      const alreadyOrder = await this.orderService.existsByClientReferenceId(refId);
      let orderId: string | undefined;

      const paymentIntentId =
        typeof session?.payment_intent === 'string'
          ? session.payment_intent
          : String((session?.payment_intent as { id?: string } | undefined)?.id || '').trim() || undefined;

      if (!alreadyOrder) {
        const order = await this.orderService.create({
          userId: completed.user.id,
          courseIds: ['affiliate-signup'],
          items: ref.items ?? undefined,
          totalAmount: amountInUnits,
          currency: (session?.currency || sale.currency || 'SGD').toUpperCase(),
          paymentStatus: session?.payment_status ?? 'paid',
          wooshpaySessionId: session?.id ?? undefined,
          wooshpayPaymentIntentId: paymentIntentId,
          clientReferenceId: refId,
          eventType: 'affiliate-signup',
        });
        orderId = order.id;

        await this.paymentService.recordPaid({
          userId: completed.user.id,
          clientReferenceId: refId,
          orderId: order.id,
          amount: amountInUnits,
          currency: order.currency,
          courseIds: ['affiliate-signup'],
          items: ref.items,
          wooshpaySessionId: session?.id ?? null,
          wooshpayPaymentIntentId: paymentIntentId ?? null,
          eventType: 'affiliate-signup',
          source: PaymentSource.ConfirmPayment,
        });
      }

      return res.status(HttpStatus.OK).json({
        message: completed.alreadyCompleted
          ? 'Affiliate signup payment was already confirmed.'
          : 'Payment confirmed. Your account has been created.',
        userId: completed.user.id,
        email: completed.user.email,
        username: completed.user.username,
        affiliateCode: sale.affiliateCode,
        voucherCode: sale.voucherCode,
        payableAmount: amountInUnits,
        currency: sale.currency,
        orderId,
        alreadyCompleted: completed.alreadyCompleted,
      });
    } catch (error) {
      const message = this.getFriendlyPaymentErrorMessage(
        error,
        (error as Error)?.message || 'Could not confirm affiliate payment.',
      );
      return res.status(HttpStatus.BAD_REQUEST).json({ message });
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Affiliate report: clicks, signups, paid sales' })
  async dashboard(@Query('code') code: string, @Res() res: Response) {
    try {
      const report = await this.affiliateService.getDashboardByCode(code);
      return res.status(HttpStatus.OK).json(report);
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: (error as Error)?.message || 'Could not load affiliate dashboard.',
      });
    }
  }
}

function BadRequestLike(error: unknown): boolean {
  const name = String((error as { name?: string })?.name || '');
  const message = String((error as Error)?.message || '').toLowerCase();
  return (
    name === 'BadRequestException'
    || message.includes('already')
    || message.includes('required')
    || message.includes('invalid')
    || message.includes('taken')
  );
}
