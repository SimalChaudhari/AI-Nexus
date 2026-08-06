import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';

import {
  InternationalUserEntity,
  InternationalUserPaymentStatus,
  InternationalUserStatus,
} from '../intl-auth/international-user.entity';
import { IntlAuthService } from '../intl-auth/intl-auth.service';
import { WooshPayService } from '../payment/wooshpay.service';
import { IntlConfirmPaymentDto, IntlCreateCheckoutDto } from './intl-payment.dto';
import {
  InternationalPaymentEntity,
  InternationalPaymentStatus,
} from './international-payment.entity';
import { resolveIntlMembershipPricing } from './intl-pricing';
import { listIntlCountries } from './intl-currency';
import { IntlFxService } from './intl-fx.service';

const INTL_DRAFT_JWT_TYP = 'intl_draft';

function generateShortId(): string {
  return crypto.randomBytes(12).toString('base64url');
}

@Injectable()
export class IntlPaymentService {
  constructor(
    @InjectRepository(InternationalPaymentEntity)
    private readonly paymentRepository: Repository<InternationalPaymentEntity>,
    @InjectRepository(InternationalUserEntity)
    private readonly userRepository: Repository<InternationalUserEntity>,
    private readonly wooshPayService: WooshPayService,
    private readonly intlAuthService: IntlAuthService,
    private readonly jwtService: JwtService,
    private readonly intlFxService: IntlFxService,
  ) {}

  listCountries() {
    return listIntlCountries();
  }

  async getPricing(countryOfResidence: string, promoApplied = false) {
    const pricing = await resolveIntlMembershipPricing(this.intlFxService, {
      countryOfResidence,
      promoApplied,
    });
    return {
      countryCode: pricing.countryCode,
      countryOfResidence: pricing.countryOfResidence,
      currency: pricing.currency,
      baseAmountSgd: pricing.baseAmountSgd,
      baseAmount: pricing.baseAmount,
      exchangeRate: pricing.exchangeRate,
      promoApplied: pricing.promoApplied,
      totalAmount: pricing.totalAmount,
      voucherDiscountAmount: pricing.voucherDiscountAmount,
    };
  }

  async createCheckout(dto: IntlCreateCheckoutDto) {
    if (!dto.paymentConsent) {
      throw new BadRequestException('Please confirm the payable amount to continue.');
    }

    const draftUserId = String(dto.draftUserId || '').trim();
    const user = await this.userRepository.findOne({ where: { id: draftUserId } });
    if (!user) {
      throw new NotFoundException('Registration draft not found');
    }

    if (user.status === InternationalUserStatus.Banned) {
      throw new BadRequestException('This account cannot complete payment.');
    }

    if (user.status === InternationalUserStatus.Active && user.paymentStatus === InternationalUserPaymentStatus.Paid) {
      throw new BadRequestException('This account is already paid and active.');
    }

    this.assertDraftToken(user.id, dto.signupAccessToken);

    const promoCode = String(dto.promoCode || user.promoCode || '').trim().toUpperCase() || null;
    const promoApplied = Boolean(promoCode && promoCode.length >= 4);

    const pricing = await resolveIntlMembershipPricing(this.intlFxService, {
      countryOfResidence: user.countryOfResidence || '',
      promoApplied,
    });

    if (!pricing.countryCode) {
      throw new BadRequestException('A valid country of residence is required for payment.');
    }

    user.countryCode = pricing.countryCode;
    user.currency = pricing.currency;
    user.promoCode = promoCode;
    user.paymentStatus = InternationalUserPaymentStatus.Pending;
    user.status = InternationalUserStatus.PendingPayment;
    await this.userRepository.save(user);

    const clientReferenceId = generateShortId();
    const payment = this.paymentRepository.create({
      userId: user.id,
      clientReferenceId,
      status: InternationalPaymentStatus.Pending,
      amount: pricing.totalAmount,
      currency: pricing.currency,
      countryCode: pricing.countryCode,
      countryOfResidence: pricing.countryOfResidence || user.countryOfResidence,
      promoCode,
      promoApplied,
      applyGst: false,
      gstAmount: 0,
      items: [
        {
          id: 'intl-membership',
          name: pricing.itemName,
          price: pricing.totalAmount,
          quantity: 1,
        },
      ],
      eventType: 'intl-membership-signup',
    });
    await this.paymentRepository.save(payment);

    const successUrl = String(dto.successUrl).trim();
    const cancelUrl = String(dto.cancelUrl).trim();
    const finalSuccessUrl = `${successUrl}${successUrl.includes('?') ? '&' : '?'}ref=${clientReferenceId}`;
    const finalCancelUrl = `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}payment=canceled&ref=${clientReferenceId}`;

    const customerName = [user.firstname, user.lastname].filter(Boolean).join(' ') || undefined;

    try {
      const session = await this.wooshPayService.createCheckoutSession({
        line_items: [
          {
            price_data: {
              currency: pricing.currency,
              unit_amount: pricing.totalAmountCents,
              product_data: {
                name: pricing.itemName,
                description: 'International membership',
              },
            },
            quantity: 1,
          },
        ],
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        client_reference_id: clientReferenceId,
        ...(user.email && { customer_email: user.email }),
        ...((customerName || user.email) && {
          payment_intent_data: {
            billing_details: {
              ...(customerName && { name: customerName }),
              ...(user.email && { email: user.email }),
            },
          },
        }),
        payment_method_types: ['card'],
      });

      payment.wooshpaySessionId = session.id;
      await this.paymentRepository.save(payment);

      return {
        url: session.url,
        sessionId: session.id,
        refId: clientReferenceId,
        currency: pricing.currency,
        amount: pricing.totalAmount,
        countryCode: pricing.countryCode,
      };
    } catch (error: any) {
      payment.status = InternationalPaymentStatus.Failed;
      payment.failureReason = String(error?.message || 'Checkout failed').slice(0, 500);
      await this.paymentRepository.save(payment);
      user.paymentStatus = InternationalUserPaymentStatus.Failed;
      await this.userRepository.save(user);
      throw new BadRequestException(
        error?.message || 'Could not start WooshPay checkout. Please try again.',
      );
    }
  }

  async confirmPayment(dto: IntlConfirmPaymentDto) {
    const refId = String(dto.ref || '').trim();
    if (!refId) {
      throw new BadRequestException('ref is required');
    }

    const payment = await this.paymentRepository.findOne({
      where: { clientReferenceId: refId },
    });
    if (!payment) {
      throw new NotFoundException('Payment reference not found');
    }

    if (payment.status === InternationalPaymentStatus.Paid) {
      const user = await this.userRepository.findOne({ where: { id: payment.userId } });
      if (!user) throw new NotFoundException('User not found');
      return this.buildConfirmResponse(user, payment);
    }

    const sessionLookupId = String(dto.sessionId || payment.wooshpaySessionId || '').trim();
    if (!sessionLookupId) {
      throw new BadRequestException('Payment session id is required.');
    }

    const session = await this.wooshPayService.getSession(sessionLookupId);
    const paymentStatus = String(session?.payment_status || '').toLowerCase();
    const sessionStatus = String(session?.status || '').toLowerCase();
    const paid =
      paymentStatus === 'paid'
      || paymentStatus === 'complete'
      || sessionStatus === 'complete'
      || sessionStatus === 'paid';
    const failed =
      paymentStatus === 'unpaid' && (sessionStatus === 'expired' || sessionStatus === 'canceled');

    if (failed) {
      payment.status = InternationalPaymentStatus.Failed;
      payment.failureReason = 'Checkout was canceled or expired';
      await this.paymentRepository.save(payment);
      throw new ConflictException('Payment was not completed successfully.');
    }

    if (!paid) {
      throw new ConflictException('Payment is still being processed. Please wait a moment and try again.');
    }

    const user = await this.userRepository.findOne({ where: { id: payment.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    payment.status = InternationalPaymentStatus.Paid;
    payment.wooshpaySessionId = session.id || payment.wooshpaySessionId;
    payment.wooshpayPaymentIntentId =
      (typeof session.payment_intent === 'string' ? session.payment_intent : null)
      || payment.wooshpayPaymentIntentId;
    payment.paidAt = new Date();
    payment.failureReason = null;
    await this.paymentRepository.save(payment);

    user.status = InternationalUserStatus.Active;
    user.paymentStatus = InternationalUserPaymentStatus.Paid;
    user.currency = payment.currency;
    user.countryCode = payment.countryCode;
    await this.userRepository.save(user);

    return this.buildConfirmResponse(user, payment);
  }

  signDraftAccessToken(userId: string) {
    return this.intlAuthService.signDraftAccessToken(userId);
  }

  private assertDraftToken(userId: string, token?: string) {
    const raw = String(token || '').trim();
    if (!raw) {
      throw new BadRequestException('signupAccessToken is required');
    }
    try {
      const payload = this.jwtService.verify(raw) as { sub?: string; typ?: string };
      if (payload?.typ !== INTL_DRAFT_JWT_TYP || payload?.sub !== userId) {
        throw new BadRequestException('Invalid signup access token');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid or expired signup access token');
    }
  }

  private buildConfirmResponse(user: InternationalUserEntity, payment: InternationalPaymentEntity) {
    const auth = this.intlAuthService.issueSessionForUser(user, 'Payment confirmed. Account activated.');
    return {
      message: auth.message,
      accessToken: auth.accessToken,
      user: auth.user,
      payment: {
        refId: payment.clientReferenceId,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        countryCode: payment.countryCode,
      },
    };
  }
}
