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
import { AffiliateService } from '../affiliate/affiliate.service';
import { WooshPayService } from '../payment/wooshpay.service';
import {
  IntlConfirmPaymentDto,
  IntlCreateCheckoutDto,
  IntlValidatePromoDto,
  UpdateIntlMembershipSettingsDto,
} from './intl-payment.dto';
import {
  InternationalPaymentEntity,
  InternationalPaymentStatus,
} from './international-payment.entity';
import { IntlMembershipSettingsEntity } from './intl-membership-settings.entity';
import {
  INTL_MEMBERSHIP_BASE_SGD,
  INTL_MEMBERSHIP_VOUCHER_SGD,
  resolveIntlMembershipPricing,
} from './intl-pricing';
import { listIntlCountries } from './intl-currency';
import { IntlFxService } from './intl-fx.service';

const INTL_DRAFT_JWT_TYP = 'intl_draft';

/** WooshPay checkout methods for international membership (Step 4). */
const INTL_CHECKOUT_PAYMENT_METHODS = [
  'card', // Credit Card
  'applepay', // Apple Pay
  'googlepay', // Google Pay
  'alipay', // Alipay
] as const;

/** Prevent parallel create-checkout for the same draft user (2x session race). */
const intlCheckoutInFlight = new Set<string>();

function generateShortId(): string {
  return crypto.randomBytes(12).toString('base64url');
}

function isGatewayPaid(paymentStatus?: string, status?: string): boolean {
  const ps = String(paymentStatus || '').toLowerCase();
  const st = String(status || '').toLowerCase();
  return ps === 'paid' || ps === 'complete' || st === 'complete' || st === 'paid';
}

function isGatewayFailedOrClosed(paymentStatus?: string, status?: string): boolean {
  const ps = String(paymentStatus || '').toLowerCase();
  const st = String(status || '').toLowerCase();
  return (
    ps === 'failed'
    || ps === 'canceled'
    || st === 'expired'
    || st === 'canceled'
  );
}

@Injectable()
export class IntlPaymentService {
  constructor(
    @InjectRepository(InternationalPaymentEntity)
    private readonly paymentRepository: Repository<InternationalPaymentEntity>,
    @InjectRepository(InternationalUserEntity)
    private readonly userRepository: Repository<InternationalUserEntity>,
    @InjectRepository(IntlMembershipSettingsEntity)
    private readonly settingsRepository: Repository<IntlMembershipSettingsEntity>,
    private readonly wooshPayService: WooshPayService,
    private readonly intlAuthService: IntlAuthService,
    private readonly jwtService: JwtService,
    private readonly intlFxService: IntlFxService,
    private readonly affiliateService: AffiliateService,
  ) {}

  listCountries() {
    return listIntlCountries();
  }

  private toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private serializeSettings(row: IntlMembershipSettingsEntity) {
    const baseAmountSgd = this.toNumber(row.baseAmountSgd, INTL_MEMBERSHIP_BASE_SGD);
    const voucherDiscountAmountSgd = this.toNumber(
      row.voucherDiscountAmountSgd,
      INTL_MEMBERSHIP_VOUCHER_SGD,
    );
    const referralCode = String(row.referralCode || '').trim().toUpperCase() || null;
    const referralLinkPath =
      String(row.referralLinkPath || '').trim() || '/auth/sign-up?ref=';
    const websiteBaseUrl = this.getIntlWebsiteBaseUrl();
    const fullReferralLink = referralCode
      ? `${websiteBaseUrl}${referralLinkPath}${referralCode}`
      : '';
    const exampleReferralLink =
      fullReferralLink || `${websiteBaseUrl}${referralLinkPath}INTL100`;

    return {
      id: row.id,
      currency: 'SGD',
      baseAmountSgd,
      voucherDiscountAmountSgd,
      referralCode: referralCode || '',
      referralLinkPath,
      websiteBaseUrl,
      exampleReferralLink,
      fullReferralLink,
      updatedAt: row.updatedAt,
    };
  }

  private getIntlWebsiteBaseUrl(): string {
    const raw = String(
      process.env.INTL_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3003',
    )
      .trim()
      .replace(/\/$/, '');
    return raw || 'http://localhost:3003';
  }

  private async ensureSettingsRow(): Promise<IntlMembershipSettingsEntity> {
    const existing = await this.settingsRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    if (existing[0]) return existing[0];

    return this.settingsRepository.save(
      this.settingsRepository.create({
        baseAmountSgd: INTL_MEMBERSHIP_BASE_SGD,
        voucherDiscountAmountSgd: INTL_MEMBERSHIP_VOUCHER_SGD,
        referralCode: null,
        referralLinkPath: '/auth/sign-up?ref=',
      }),
    );
  }

  async getMembershipSettings() {
    const row = await this.ensureSettingsRow();
    return this.serializeSettings(row);
  }

  async updateMembershipSettings(payload: UpdateIntlMembershipSettingsDto) {
    const row = await this.ensureSettingsRow();
    const source = payload && typeof payload === 'object' ? payload : {};

    if (source.baseAmountSgd != null) {
      const next = Number(source.baseAmountSgd);
      if (!Number.isFinite(next) || next <= 0) {
        throw new BadRequestException('Standard amount (SGD) must be greater than 0');
      }
      row.baseAmountSgd = Number(next.toFixed(2));
    }

    if (source.voucherDiscountAmountSgd != null) {
      const next = Number(source.voucherDiscountAmountSgd);
      if (!Number.isFinite(next) || next <= 0) {
        throw new BadRequestException('Promo payable amount (SGD) must be greater than 0');
      }
      row.voucherDiscountAmountSgd = Number(next.toFixed(2));
    }

    if (source.referralCode !== undefined) {
      const code = String(source.referralCode || '').trim().toUpperCase();
      row.referralCode = /^[A-Z0-9_-]{2,64}$/.test(code) ? code : null;
    }

    if (source.referralLinkPath !== undefined) {
      const pathRaw = String(source.referralLinkPath || '').trim() || '/auth/sign-up?ref=';
      row.referralLinkPath = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;
    }

    const saved = await this.settingsRepository.save(row);
    return this.serializeSettings(saved);
  }

  private async getPricingAmounts() {
    const settings = await this.getMembershipSettings();
    return {
      baseAmountSgd: settings.baseAmountSgd,
      voucherDiscountAmountSgd: settings.voucherDiscountAmountSgd,
    };
  }

  async getPricing(countryOfResidence: string, promoApplied = false) {
    const amounts = await this.getPricingAmounts();
    const pricing = await resolveIntlMembershipPricing(this.intlFxService, {
      countryOfResidence,
      promoApplied,
      baseAmountSgd: amounts.baseAmountSgd,
      voucherDiscountAmountSgd: amounts.voucherDiscountAmountSgd,
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

  /**
   * Same as Payment → /affiliate/validate, but payable amounts come from
   * intl_membership_settings + FX for the selected country.
   */
  async validatePromoCode(dto: IntlValidatePromoDto) {
    const code = String(dto?.code || '').trim().toUpperCase();
    const countryOfResidence = String(dto?.countryOfResidence || '').trim();

    if (!code) {
      throw new BadRequestException('Enter a code to apply.');
    }

    const affiliatePricing = await this.affiliateService.calculatePricing({
      code,
      site: 'international',
    });
    const discountApplied = Boolean(affiliatePricing?.discountApplied || affiliatePricing?.valid);
    const pricing = await this.getPricing(countryOfResidence || 'Singapore', discountApplied);

    const message = discountApplied
      ? 'Promo code applied. Discounted international rate applied below.'
      : affiliatePricing?.affiliateMessage ||
        affiliatePricing?.voucherMessage ||
        'This code is invalid or expired. The standard fee applies.';

    return {
      valid: discountApplied,
      discountApplied,
      appliedCode: discountApplied
        ? String(affiliatePricing?.appliedCode || code).trim().toUpperCase()
        : null,
      codeType: affiliatePricing?.codeType || null,
      affiliateCode: affiliatePricing?.affiliateCode || null,
      voucherCode: affiliatePricing?.voucherCode || null,
      affiliateValid: Boolean(affiliatePricing?.affiliateValid),
      voucherValid: Boolean(affiliatePricing?.voucherValid),
      affiliateMessage: affiliatePricing?.affiliateMessage || null,
      voucherMessage: affiliatePricing?.voucherMessage || null,
      message,
      currency: pricing.currency,
      originalAmount: pricing.baseAmount,
      payableAmount: pricing.totalAmount,
      baseAmountSgd: pricing.baseAmountSgd,
      voucherDiscountAmount: pricing.voucherDiscountAmount,
      exchangeRate: pricing.exchangeRate,
      countryCode: pricing.countryCode,
      countryOfResidence: pricing.countryOfResidence || countryOfResidence,
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

    // Block second charge if a paid payment already exists for this draft.
    const existingPaid = await this.paymentRepository.findOne({
      where: { userId: user.id, status: InternationalPaymentStatus.Paid },
      order: { paidAt: 'DESC', createdAt: 'DESC' },
    });
    if (existingPaid) {
      throw new ConflictException(
        'Membership payment was already completed for this signup. Please sign in.',
      );
    }

    // Reuse or close an open pending checkout so a second WooshPay session cannot be created.
    const pendingPayment = await this.paymentRepository.findOne({
      where: { userId: user.id, status: InternationalPaymentStatus.Pending },
      order: { createdAt: 'DESC' },
    });
    if (pendingPayment) {
      if (!pendingPayment.wooshpaySessionId) {
        const ageMs = Date.now() - new Date(pendingPayment.createdAt).getTime();
        if (Number.isFinite(ageMs) && ageMs < 2 * 60 * 1000) {
          throw new ConflictException(
            'Membership payment is already starting. Please wait a moment and try again.',
          );
        }
        pendingPayment.status = InternationalPaymentStatus.Canceled;
        pendingPayment.failureReason = 'replaced_by_new_intl_checkout';
        await this.paymentRepository.save(pendingPayment);
      } else {
        try {
          const existingSession = await this.wooshPayService.getSession(pendingPayment.wooshpaySessionId);
          if (isGatewayPaid(existingSession?.payment_status, existingSession?.status)) {
            throw new ConflictException(
              'Membership payment was already completed. Please wait while we finish activating your account.',
            );
          }

          const sessionOpen =
            !isGatewayFailedOrClosed(existingSession?.payment_status, existingSession?.status)
            && String(existingSession?.status || '').toLowerCase() !== 'complete'
            && Boolean(existingSession?.url);

          if (sessionOpen && existingSession?.url) {
            return {
              url: existingSession.url,
              sessionId: existingSession.id || pendingPayment.wooshpaySessionId,
              refId: pendingPayment.clientReferenceId,
              currency: pendingPayment.currency,
              amount: Number(pendingPayment.amount),
              countryCode: pendingPayment.countryCode,
              paymentMethodTypes: [...INTL_CHECKOUT_PAYMENT_METHODS],
              reused: true,
            };
          }

          try {
            await this.wooshPayService.expireCheckoutSession(pendingPayment.wooshpaySessionId);
          } catch {
            // Session may already be expired/closed — continue with a new checkout.
          }
          pendingPayment.status = InternationalPaymentStatus.Canceled;
          pendingPayment.failureReason = 'replaced_by_new_intl_checkout';
          await this.paymentRepository.save(pendingPayment);
        } catch (error) {
          if (error instanceof ConflictException || error instanceof BadRequestException) {
            throw error;
          }
          pendingPayment.status = InternationalPaymentStatus.Canceled;
          pendingPayment.failureReason = 'replaced_by_new_intl_checkout';
          await this.paymentRepository.save(pendingPayment);
        }
      }
    }

    if (intlCheckoutInFlight.has(user.id)) {
      throw new ConflictException(
        'Membership payment is already starting. Please wait a moment and try again.',
      );
    }
    intlCheckoutInFlight.add(user.id);

    try {
      const promoCodeRaw = String(dto.promoCode || user.promoCode || '').trim().toUpperCase() || null;
      let promoCode: string | null = null;
      let promoApplied = false;

      if (promoCodeRaw) {
        const validated = await this.affiliateService.calculatePricing({
          code: promoCodeRaw,
          site: 'international',
        });
        promoApplied = Boolean(validated?.discountApplied || validated?.valid);
        promoCode = promoApplied
          ? String(validated?.appliedCode || promoCodeRaw).trim().toUpperCase()
          : null;
      }

      const amounts = await this.getPricingAmounts();

      const pricing = await resolveIntlMembershipPricing(this.intlFxService, {
        countryOfResidence: user.countryOfResidence || '',
        promoApplied,
        baseAmountSgd: amounts.baseAmountSgd,
        voucherDiscountAmountSgd: amounts.voucherDiscountAmountSgd,
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
      // Save pending row before WooshPay so concurrent requests see the lock.
      await this.paymentRepository.save(payment);

      const successUrl = String(dto.successUrl).trim();
      const cancelUrl = String(dto.cancelUrl).trim();
      const finalSuccessUrl = `${successUrl}${successUrl.includes('?') ? '&' : '?'}ref=${clientReferenceId}`;
      const finalCancelUrl = `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}payment=canceled&ref=${clientReferenceId}`;

      try {
        // Step 4: amount + currency + product name/description; methods via WooshPay.
        const session = await this.wooshPayService.createCheckoutSession({
          line_items: [
            {
              price_data: {
                currency: pricing.currency,
                unit_amount: pricing.totalAmountCents,
                product_data: {
                  name: pricing.itemName,
                  description: pricing.itemDescription,
                },
              },
              quantity: 1,
            },
          ],
          success_url: finalSuccessUrl,
          cancel_url: finalCancelUrl,
          client_reference_id: clientReferenceId,
          payment_method_types: [...INTL_CHECKOUT_PAYMENT_METHODS],
          ...(user.email && { customer_email: user.email }),
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
          paymentMethodTypes: [...INTL_CHECKOUT_PAYMENT_METHODS],
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
    } finally {
      intlCheckoutInFlight.delete(user.id);
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
    const paid = isGatewayPaid(session?.payment_status, session?.status);
    const failed =
      String(session?.payment_status || '').toLowerCase() === 'unpaid'
      && isGatewayFailedOrClosed(session?.payment_status, session?.status);

    if (failed) {
      payment.status = InternationalPaymentStatus.Failed;
      payment.failureReason = 'Checkout was canceled or expired';
      await this.paymentRepository.save(payment);
      throw new ConflictException('Payment was not completed successfully.');
    }

    if (!paid) {
      throw new ConflictException('Payment is still being processed. Please wait a moment and try again.');
    }

    // Another paid payment for this user = duplicate charge (record for refund, do not activate twice).
    const otherPaid = await this.paymentRepository.findOne({
      where: { userId: payment.userId, status: InternationalPaymentStatus.Paid },
      order: { paidAt: 'DESC', createdAt: 'DESC' },
    });
    if (otherPaid && otherPaid.id !== payment.id) {
      payment.status = InternationalPaymentStatus.Paid;
      payment.wooshpaySessionId = session.id || payment.wooshpaySessionId;
      payment.wooshpayPaymentIntentId =
        (typeof session.payment_intent === 'string' ? session.payment_intent : null)
        || payment.wooshpayPaymentIntentId;
      payment.paidAt = new Date();
      payment.failureReason = 'duplicate_membership_payment_needs_refund';
      await this.paymentRepository.save(payment);
      throw new ConflictException(
        'A membership payment was already completed for this account. If you were charged twice, contact support for a refund.',
      );
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

    // Atomic activate: only one concurrent confirm can flip the account to Paid/Active.
    const claimResult = await this.userRepository
      .createQueryBuilder()
      .update(InternationalUserEntity)
      .set({
        status: InternationalUserStatus.Active,
        paymentStatus: InternationalUserPaymentStatus.Paid,
        currency: payment.currency,
        countryCode: payment.countryCode,
      })
      .where('id = :id', { id: user.id })
      .andWhere('"paymentStatus" != :paid', { paid: InternationalUserPaymentStatus.Paid })
      .execute();

    const finalizedUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!finalizedUser) {
      throw new NotFoundException('User not found');
    }

    if (!claimResult.affected) {
      // Lost the race — another confirm already activated. Keep this row paid for refund audit.
      payment.failureReason = 'duplicate_membership_payment_needs_refund';
      await this.paymentRepository.save(payment);
      return this.buildConfirmResponse(finalizedUser, payment);
    }

    return this.buildConfirmResponse(finalizedUser, payment);
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
