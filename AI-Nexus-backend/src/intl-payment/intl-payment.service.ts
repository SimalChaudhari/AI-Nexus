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
  InternationalMembershipType,
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
  INTL_MEMBERSHIP_STUDENT_SGD,
  INTL_MEMBERSHIP_VOUCHER_SGD,
  normalizeIntlMembershipType,
  resolveIntlMembershipPricing,
} from './intl-pricing';
import { listIntlCountries, resolveCountryCode } from './intl-currency';
import { IntlFxService } from './intl-fx.service';
import {
  countriesAssignedToPromo,
  listCountryPricing,
  listPromoCountriesWithAmounts,
  promoAmountsFromCountryPricing,
  sanitizeCountryPricing,
  sanitizePromoAmountsByCountry,
} from './intl-promo-countries';

const INTL_DRAFT_JWT_TYP = 'intl_draft';

/** Prevent parallel create-checkout for the same draft user (2x session race). */
const intlCheckoutInFlight = new Set<string>();

function generateShortId(): string {
  return crypto.randomBytes(12).toString('base64url');
}

function isGatewayPaid(paymentStatus?: string, status?: string, paymentIntentStatus?: string): boolean {
  const ps = String(paymentStatus || '').toLowerCase();
  const st = String(status || '').toLowerCase();
  const pi = String(paymentIntentStatus || '').toLowerCase();
  // Prefer authoritative payment_status / PaymentIntent. Session status "complete"
  // alone can still be unpaid for async methods — only accept it with paid PI.
  if (ps === 'paid' || ps === 'complete') return true;
  if (pi === 'succeeded' || pi === 'paid' || pi === 'complete') return true;
  if (st === 'paid') return true;
  if (st === 'complete' && (ps === 'paid' || !ps)) return true;
  return false;
}

function paymentIntentIdFromSession(session: any): string {
  const raw = session?.payment_intent;
  if (typeof raw === 'string') return raw.trim();
  if (raw && typeof raw === 'object' && typeof raw.id === 'string') return String(raw.id).trim();
  return '';
}

/** WooshPay session ids look like cs_… / cs_test_…. Reject placeholders / junk. */
function sanitizeWooshpaySessionId(value?: string | null): string {
  const id = String(value || '').trim();
  if (!id) return '';
  if (id.includes('{') || id.includes('}') || /CHECKOUT_SESSION_ID/i.test(id)) return '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return '';
  return id;
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

/** Plan stored on payment line items at checkout — source of truth after pay. */
function membershipTypeFromPayment(
  payment: Pick<InternationalPaymentEntity, 'items' | 'eventType'> | null | undefined,
): InternationalMembershipType | null {
  const raw = payment?.items?.[0]?.membershipType;
  if (raw != null && String(raw).trim() !== '') {
    return normalizeIntlMembershipType(raw) === 'student'
      ? InternationalMembershipType.Student
      : InternationalMembershipType.Full;
  }
  const eventType = String(payment?.eventType || '').toLowerCase();
  if (eventType.includes('student')) return InternationalMembershipType.Student;
  if (eventType.includes('full')) return InternationalMembershipType.Full;
  return null;
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

  async getFxRatesFromSgd() {
    return this.intlFxService.getRatesFromSgd();
  }

  private toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private serializeSettings(row: IntlMembershipSettingsEntity) {
    const baseAmountSgd = this.toNumber(row.baseAmountSgd, INTL_MEMBERSHIP_BASE_SGD);
    const studentAmountSgd = this.toNumber(row.studentAmountSgd, INTL_MEMBERSHIP_STUDENT_SGD);
    const voucherDiscountAmountSgd = this.toNumber(
      row.voucherDiscountAmountSgd,
      INTL_MEMBERSHIP_VOUCHER_SGD,
    );
    const promoAmountsByCountry = sanitizePromoAmountsByCountry(row.promoAmountsByCountry);
    const countryPricing = sanitizeCountryPricing(row.countryPricing);
    const syncedPromoAmounts = {
      ...promoAmountsByCountry,
      ...promoAmountsFromCountryPricing(countryPricing),
    };
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
      studentAmountSgd,
      voucherDiscountAmountSgd,
      promoAmountsByCountry: syncedPromoAmounts,
      countryPricing,
      countryPricingList: listCountryPricing(countryPricing, syncedPromoAmounts),
      promoCountries: listPromoCountriesWithAmounts(syncedPromoAmounts),
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
    try {
      const existing = await this.settingsRepository.find({
        order: { createdAt: 'ASC' },
        take: 1,
      });
      if (existing[0]) return existing[0];
    } catch (error: any) {
      const message = String(error?.message || error || '');
      if (message.includes('does not exist')) {
        await this.settingsRepository.query(
          `ALTER TABLE "intl_membership_settings" ADD COLUMN IF NOT EXISTS "studentAmountSgd" decimal(12,2) NOT NULL DEFAULT 150`,
        );
        await this.settingsRepository.query(
          `ALTER TABLE "intl_membership_settings" ADD COLUMN IF NOT EXISTS "promoAmountsByCountry" jsonb`,
        );
        await this.settingsRepository.query(
          `ALTER TABLE "intl_membership_settings" ADD COLUMN IF NOT EXISTS "countryPricing" jsonb`,
        );
        const existing = await this.settingsRepository.find({
          order: { createdAt: 'ASC' },
          take: 1,
        });
        if (existing[0]) return existing[0];
      } else {
        throw error;
      }
    }

    return this.settingsRepository.save(
      this.settingsRepository.create({
        baseAmountSgd: INTL_MEMBERSHIP_BASE_SGD,
        studentAmountSgd: INTL_MEMBERSHIP_STUDENT_SGD,
        voucherDiscountAmountSgd: INTL_MEMBERSHIP_VOUCHER_SGD,
        referralCode: null,
        referralLinkPath: '/auth/sign-up?ref=',
      }),
    );
  }

  async getMembershipSettings() {
    const row = await this.ensureSettingsRow();
    const data = this.serializeSettings(row);
    let paidOrderCount = 0;
    try {
      paidOrderCount = await this.paymentRepository.count({
        where: { status: InternationalPaymentStatus.Paid },
      });
    } catch {
      paidOrderCount = 0;
    }
    return { ...data, paidOrderCount };
  }

  async updateMembershipSettings(payload: UpdateIntlMembershipSettingsDto) {
    const row = await this.ensureSettingsRow();
    const source = payload && typeof payload === 'object' ? payload : {};

    if (source.baseAmountSgd != null) {
      const next = Number(source.baseAmountSgd);
      if (!Number.isFinite(next) || next <= 0) {
        throw new BadRequestException('Full / Role amount (SGD) must be greater than 0');
      }
      row.baseAmountSgd = Number(next.toFixed(2));
    }

    if (source.studentAmountSgd != null) {
      const next = Number(source.studentAmountSgd);
      if (!Number.isFinite(next) || next <= 0) {
        throw new BadRequestException('Student amount (SGD) must be greater than 0');
      }
      row.studentAmountSgd = Number(next.toFixed(2));
    }

    if (source.voucherDiscountAmountSgd != null) {
      const next = Number(source.voucherDiscountAmountSgd);
      if (!Number.isFinite(next) || next <= 0) {
        throw new BadRequestException('Promo payable amount (SGD) must be greater than 0');
      }
      row.voucherDiscountAmountSgd = Number(next.toFixed(2));
    }

    if (source.promoAmountsByCountry !== undefined) {
      row.promoAmountsByCountry = sanitizePromoAmountsByCountry(source.promoAmountsByCountry);
    }

    if (source.countryPricing !== undefined) {
      const countryPricing = sanitizeCountryPricing(source.countryPricing);
      row.countryPricing = JSON.parse(JSON.stringify(countryPricing));
      row.promoAmountsByCountry = JSON.parse(
        JSON.stringify({
          ...sanitizePromoAmountsByCountry(row.promoAmountsByCountry),
          ...promoAmountsFromCountryPricing(countryPricing),
        }),
      );
    }

    if (source.referralCode !== undefined) {
      const code = String(source.referralCode || '').trim().toUpperCase();
      row.referralCode = /^[A-Z0-9_-]{2,64}$/.test(code) ? code : null;
    }

    if (source.referralLinkPath !== undefined) {
      const pathRaw = String(source.referralLinkPath || '').trim() || '/auth/sign-up?ref=';
      row.referralLinkPath = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;
    }

    await this.settingsRepository.update(
      { id: row.id },
      {
        baseAmountSgd: row.baseAmountSgd,
        studentAmountSgd: row.studentAmountSgd,
        voucherDiscountAmountSgd: row.voucherDiscountAmountSgd,
        promoAmountsByCountry: row.promoAmountsByCountry,
        countryPricing: row.countryPricing,
        referralCode: row.referralCode,
        referralLinkPath: row.referralLinkPath,
      },
    );
    const saved = await this.settingsRepository.findOne({ where: { id: row.id } });
    return this.serializeSettings(saved || row);
  }

  private async getPricingAmounts() {
    const settings = await this.getMembershipSettings();
    return {
      baseAmountSgd: settings.baseAmountSgd,
      studentAmountSgd: settings.studentAmountSgd,
      voucherDiscountAmountSgd: settings.voucherDiscountAmountSgd,
      promoAmountsByCountry: settings.promoAmountsByCountry,
      countryPricing: settings.countryPricing,
    };
  }

  async getPricing(
    countryOfResidence: string,
    promoApplied = false,
    membershipType: string = 'full',
    promoCode?: string | null,
  ) {
    const amounts = await this.getPricingAmounts();
    const plan = normalizeIntlMembershipType(membershipType);
    const pricing = await resolveIntlMembershipPricing(this.intlFxService, {
      countryOfResidence,
      promoApplied,
      membershipType: plan,
      baseAmountSgd: amounts.baseAmountSgd,
      studentAmountSgd: amounts.studentAmountSgd,
      voucherDiscountAmountSgd: amounts.voucherDiscountAmountSgd,
      promoAmountsByCountry: amounts.promoAmountsByCountry,
      countryPricing: amounts.countryPricing,
      promoCode,
    });
    return {
      countryCode: pricing.countryCode,
      countryOfResidence: pricing.countryOfResidence,
      currency: pricing.currency,
      membershipType: pricing.membershipType,
      baseAmountSgd: pricing.baseAmountSgd,
      baseAmount: pricing.baseAmount,
      exchangeRate: pricing.exchangeRate,
      promoApplied: pricing.promoApplied,
      totalAmount: pricing.totalAmount,
      voucherDiscountAmount: pricing.voucherDiscountAmount,
      promoFixed: pricing.promoFixed,
    };
  }

  /** Latest + recent payments for a user (profile / admin). */
  async getMyPayments(userId: string, take = 10) {
    const limit = Math.min(50, Math.max(1, Number(take) || 10));

    // If WooshPay already collected money but return-page confirm never ran, heal here.
    try {
      await this.syncPendingPaymentsForUser(userId);
    } catch (error) {
      console.warn(
        '[IntlPayment] syncPendingPaymentsForUser failed | userId=',
        String(userId).slice(0, 12),
        'error=',
        (error as Error)?.message,
      );
    }

    const rows = await this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    // Heal membershipType from the paid checkout (fixes older rows / pending-reuse bugs).
    try {
      const paid =
        rows.find((row) => row.status === InternationalPaymentStatus.Paid) || null;
      const planFromPayment = membershipTypeFromPayment(paid);
      if (paid || planFromPayment) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user) {
          let dirty = false;
          if (paid && !user.isVerified) {
            user.isVerified = true;
            dirty = true;
          }
          if (planFromPayment && user.membershipType !== planFromPayment) {
            user.membershipType = planFromPayment;
            dirty = true;
          }
          if (dirty) {
            await this.userRepository.save(user);
          }
        }
      }

      // Hide leftover open checkouts after a successful membership pay.
      if (paid) {
        const stalePending = rows.filter(
          (row) =>
            row.id !== paid.id
            && row.status === InternationalPaymentStatus.Pending,
        );
        for (const pending of stalePending) {
          pending.status = InternationalPaymentStatus.Canceled;
          pending.failureReason = pending.failureReason || 'superseded_by_paid_membership';
          await this.paymentRepository.save(pending);
        }
      }
    } catch {
      // Never block payment history if heal fails.
    }

    const refreshed = await this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    const latestPaid = refreshed.find((row) => row.status === InternationalPaymentStatus.Paid);
    if (latestPaid && !String(latestPaid.paymentMethod || '').trim()) {
      const sessionId = sanitizeWooshpaySessionId(latestPaid.wooshpaySessionId);
      if (sessionId) {
        try {
          const session = await this.wooshPayService.getSession(sessionId);
          await this.resolvePaymentMethodLabel(latestPaid, session);
          await this.paymentRepository.save(latestPaid);
        } catch {
          // Keep history even if WooshPay method lookup fails.
        }
      }
    }

    const payments = refreshed.map((payment) => this.toPublicPayment(payment));
    const latest =
      payments.find((p) => p.status === InternationalPaymentStatus.Paid) || payments[0] || null;
    return { latest, payments };
  }

  /**
   * Re-check WooshPay for pending intl rows and activate if gateway already paid.
   * Fixes admin "pending" when money was taken but /confirm never completed.
   */
  async syncPendingPaymentsForUser(userId: string): Promise<number> {
    const pendingRows = await this.paymentRepository.find({
      where: { userId, status: InternationalPaymentStatus.Pending },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    if (!pendingRows.length) return 0;

    let healed = 0;
    for (const payment of pendingRows) {
      const sessionId = sanitizeWooshpaySessionId(payment.wooshpaySessionId);
      if (!sessionId) continue;
      try {
        const session = await this.wooshPayService.getSession(sessionId);
        const paid = await this.isSessionPaid(session);
        if (paid) {
          await this.applyPaidAndActivate(payment, session);
          healed += 1;
          continue;
        }
        if (isGatewayFailedOrClosed(session?.payment_status, session?.status)) {
          payment.status = InternationalPaymentStatus.Canceled;
          payment.failureReason = 'Checkout was canceled or expired';
          await this.paymentRepository.save(payment);
        }
      } catch (error) {
        console.warn(
          '[IntlPayment] sync session failed | ref=',
          String(payment.clientReferenceId).slice(0, 20),
          'error=',
          (error as Error)?.message,
        );
      }
    }
    return healed;
  }

  /**
   * Webhook / external fulfill path. Returns true when clientRef belongs to international_payments.
   */
  async fulfillFromWebhook(
    clientReferenceId: string,
    sessionLike?: {
      id?: string;
      payment_status?: string;
      status?: string;
      payment_intent?: string;
      client_reference_id?: string;
    },
  ): Promise<boolean> {
    const refId = String(clientReferenceId || '').trim();
    if (!refId) return false;

    const payment = await this.paymentRepository.findOne({
      where: { clientReferenceId: refId },
    });
    if (!payment) return false;

    if (payment.status === InternationalPaymentStatus.Paid) {
      return true;
    }

    let session: any = sessionLike || null;
    const sessionId = sanitizeWooshpaySessionId(
      sessionLike?.id || payment.wooshpaySessionId || '',
    );
    if (sessionId) {
      try {
        session = await this.wooshPayService.getSession(sessionId);
      } catch {
        session = sessionLike || session;
      }
    }

    const paid = await this.isSessionPaid(session);
    if (!paid) {
      console.log(
        '[IntlPayment] Webhook skip (not paid yet) | ref=',
        refId.slice(0, 24),
        'payment_status=',
        session?.payment_status,
        'status=',
        session?.status,
      );
      return true; // ref matched intl table; do not fall through to main fulfill
    }

    await this.applyPaidAndActivate(payment, session || {});
    console.log('[IntlPayment] Webhook PAYMENT SUCCESS | ref=', refId.slice(0, 24));
    return true;
  }

  private async isSessionPaid(session: any): Promise<boolean> {
    if (!session) return false;
    const piId = paymentIntentIdFromSession(session);
    let piStatus = '';
    if (piId) {
      try {
        const intent = await this.wooshPayService.getPaymentIntent(piId);
        piStatus = String(intent?.status || '');
      } catch {
        // Session payment_status may still be enough.
      }
    }
    return isGatewayPaid(session?.payment_status, session?.status, piStatus);
  }

  private async resolvePaymentMethodLabel(
    payment: InternationalPaymentEntity,
    session?: Parameters<WooshPayService['resolveCheckoutPaymentMethodLabel']>[0],
  ): Promise<string> {
    const existing = String(payment.paymentMethod || '').trim();
    if (existing) return existing;
    const label = await this.wooshPayService.resolveCheckoutPaymentMethodLabel(session);
    const next = String(label || '').trim() || 'Online payment';
    payment.paymentMethod = next;
    return next;
  }

  /** Mark payment Paid and activate international user (idempotent). */
  private async applyPaidAndActivate(
    payment: InternationalPaymentEntity,
    session: {
      id?: string;
      payment_intent?: string | { id?: string };
      payment_method?: string | Record<string, unknown>;
      payment_method_types?: string[];
      payment_method_details?: Record<string, unknown>;
    },
  ): Promise<InternationalUserEntity> {
    if (payment.status !== InternationalPaymentStatus.Paid) {
      payment.status = InternationalPaymentStatus.Paid;
      payment.wooshpaySessionId =
        sanitizeWooshpaySessionId(session?.id) || payment.wooshpaySessionId;
      payment.wooshpayPaymentIntentId =
        paymentIntentIdFromSession(session) || payment.wooshpayPaymentIntentId;
      payment.paidAt = payment.paidAt || new Date();
      await this.resolvePaymentMethodLabel(payment, session);
      if (payment.failureReason !== 'duplicate_membership_payment_needs_refund') {
        payment.failureReason = null;
      }
      await this.paymentRepository.save(payment);
    } else if (!String(payment.paymentMethod || '').trim()) {
      await this.resolvePaymentMethodLabel(payment, session);
      await this.paymentRepository.save(payment);
    }

    const otherPaid = await this.paymentRepository.findOne({
      where: { userId: payment.userId, status: InternationalPaymentStatus.Paid },
      order: { paidAt: 'DESC', createdAt: 'DESC' },
    });
    if (otherPaid && otherPaid.id !== payment.id) {
      payment.failureReason = 'duplicate_membership_payment_needs_refund';
      await this.paymentRepository.save(payment);
    }

    const user = await this.userRepository.findOne({ where: { id: payment.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const planFromPayment =
      membershipTypeFromPayment(payment)
      || (normalizeIntlMembershipType(user.membershipType) === 'student'
        ? InternationalMembershipType.Student
        : InternationalMembershipType.Full);

    const claimResult = await this.userRepository
      .createQueryBuilder()
      .update(InternationalUserEntity)
      .set({
        status: InternationalUserStatus.Active,
        paymentStatus: InternationalUserPaymentStatus.Paid,
        isVerified: true,
        currency: payment.currency,
        countryCode: payment.countryCode,
        membershipType: planFromPayment,
      })
      .where('id = :id', { id: user.id })
      .andWhere('"paymentStatus" != :paid', { paid: InternationalUserPaymentStatus.Paid })
      .execute();

    // Already paid earlier — still heal plan + mark email verified after successful pay.
    if (!claimResult.affected) {
      await this.userRepository
        .createQueryBuilder()
        .update(InternationalUserEntity)
        .set({
          isVerified: true,
          ...(planFromPayment ? { membershipType: planFromPayment } : {}),
        })
        .where('id = :id', { id: user.id })
        .execute();
    }

    const finalizedUser = await this.userRepository.findOne({ where: { id: user.id } });
    if (!finalizedUser) {
      throw new NotFoundException('User not found');
    }
    return finalizedUser;
  }

  private toPublicPayment(payment: InternationalPaymentEntity) {
    const membershipType = membershipTypeFromPayment(payment);
    return {
      id: payment.id,
      refId: payment.clientReferenceId,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      countryCode: payment.countryCode,
      countryOfResidence: payment.countryOfResidence,
      promoCode: payment.promoCode,
      promoApplied: Boolean(payment.promoApplied),
      applyGst: Boolean(payment.applyGst),
      gstAmount: Number(payment.gstAmount || 0),
      items: Array.isArray(payment.items) ? payment.items : [],
      membershipType: membershipType || null,
      wooshpaySessionId: payment.wooshpaySessionId || null,
      wooshpayPaymentIntentId: payment.wooshpayPaymentIntentId || null,
      paymentMethod: payment.paymentMethod || null,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      eventType: payment.eventType,
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
    let discountApplied = Boolean(affiliatePricing?.discountApplied || affiliatePricing?.valid);
    const appliedCode = discountApplied
      ? String(affiliatePricing?.appliedCode || code).trim().toUpperCase()
      : null;
    const amounts = await this.getPricingAmounts();
    const assignedCountries = countriesAssignedToPromo(amounts.countryPricing, appliedCode);
    const selectedCountry = resolveCountryCode(countryOfResidence);
    if (discountApplied && assignedCountries.length && selectedCountry && !assignedCountries.includes(selectedCountry)) {
      discountApplied = false;
    }
    const voucherMembershipType = discountApplied
      ? (affiliatePricing?.membershipType === 'student' || affiliatePricing?.membershipType === 'full'
        ? affiliatePricing.membershipType
        : 'both')
      : null;
    const locksMembership = voucherMembershipType === 'student' || voucherMembershipType === 'full';
    const membershipType = locksMembership
      ? voucherMembershipType
      : normalizeIntlMembershipType(dto?.membershipType);
    const pricing = await this.getPricing(
      countryOfResidence || 'Singapore',
      discountApplied,
      membershipType,
      discountApplied ? appliedCode : null,
    );

    const message = discountApplied
      ? locksMembership
        ? `Promo code applied. ${membershipType === 'student' ? 'Student' : 'Full / Role'} plan assigned.`
        : 'Promo code applied. Choose Student or Full / Role — this code works for both.'
      : assignedCountries.length && selectedCountry && !assignedCountries.includes(selectedCountry)
        ? 'This code is not valid for the selected country.'
        : affiliatePricing?.affiliateMessage ||
          affiliatePricing?.voucherMessage ||
          'This code is invalid or expired. The standard fee applies.';

    return {
      valid: discountApplied,
      discountApplied,
      appliedCode: discountApplied ? appliedCode : null,
      codeType: affiliatePricing?.codeType || null,
      affiliateCode: affiliatePricing?.affiliateCode || null,
      voucherCode: affiliatePricing?.voucherCode || null,
      affiliateValid: Boolean(affiliatePricing?.affiliateValid),
      voucherValid: Boolean(affiliatePricing?.voucherValid),
      affiliateMessage: affiliatePricing?.affiliateMessage || null,
      voucherMessage: affiliatePricing?.voucherMessage || null,
      message,
      membershipType: pricing.membershipType,
      voucherMembershipType,
      locksMembership,
      currency: pricing.currency,
      originalAmount: pricing.baseAmount,
      payableAmount: pricing.totalAmount,
      baseAmountSgd: pricing.baseAmountSgd,
      voucherDiscountAmount: pricing.voucherDiscountAmount,
      promoFixed: pricing.promoFixed,
      exchangeRate: pricing.exchangeRate,
      countryCode: pricing.countryCode,
      countryOfResidence: pricing.countryOfResidence || countryOfResidence,
    };
  }

  private async resolveIntlCheckoutQuote(
    user: InternationalUserEntity,
    dto: IntlCreateCheckoutDto,
  ) {
    const promoCodeRaw = String(dto.promoCode || user.promoCode || '').trim().toUpperCase() || null;
    let promoCode: string | null = null;
    let promoApplied = false;
    const amounts = await this.getPricingAmounts();
    let membershipType = normalizeIntlMembershipType(
      dto.membershipType || user.membershipType,
    );

    if (promoCodeRaw) {
      const validated = await this.affiliateService.calculatePricing({
        code: promoCodeRaw,
        site: 'international',
      });
      const voucherOk = Boolean(validated?.discountApplied || validated?.valid);
      if (voucherOk) {
        const applied = String(validated?.appliedCode || promoCodeRaw).trim().toUpperCase();
        const assigned = countriesAssignedToPromo(amounts.countryPricing, applied);
        const countryCode = resolveCountryCode(user.countryOfResidence || '');
        if (!assigned.length || (countryCode && assigned.includes(countryCode))) {
          promoApplied = true;
          promoCode = applied;
          if (
            validated?.membershipType === 'student'
            || validated?.membershipType === 'full'
          ) {
            membershipType = validated.membershipType;
          }
        }
      }
    }

    const pricing = await resolveIntlMembershipPricing(this.intlFxService, {
      countryOfResidence: user.countryOfResidence || '',
      promoApplied,
      membershipType,
      baseAmountSgd: amounts.baseAmountSgd,
      studentAmountSgd: amounts.studentAmountSgd,
      voucherDiscountAmountSgd: amounts.voucherDiscountAmountSgd,
      promoAmountsByCountry: amounts.promoAmountsByCountry,
      countryPricing: amounts.countryPricing,
      promoCode,
    });

    return { pricing, promoCode, promoApplied, membershipType };
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

    const quote = await this.resolveIntlCheckoutQuote(user, dto);
    if (!quote.pricing.countryCode) {
      throw new BadRequestException('A valid country of residence is required for payment.');
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
          const pendingSessionId = sanitizeWooshpaySessionId(pendingPayment.wooshpaySessionId);
          if (!pendingSessionId) {
            pendingPayment.status = InternationalPaymentStatus.Canceled;
            pendingPayment.failureReason = 'replaced_by_new_intl_checkout';
            await this.paymentRepository.save(pendingPayment);
          } else {
          const existingSession = await this.wooshPayService.getSession(pendingSessionId);
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
            const pendingPlan = membershipTypeFromPayment(pendingPayment);
            const sameQuote =
              pendingPlan === quote.membershipType
              && String(pendingPayment.currency || '').toUpperCase() ===
                String(quote.pricing.currency || '').toUpperCase()
              && String(pendingPayment.countryCode || '').toUpperCase() ===
                String(quote.pricing.countryCode || '').toUpperCase()
              && Boolean(pendingPayment.promoApplied) === quote.promoApplied
              && Math.abs(Number(pendingPayment.amount) - Number(quote.pricing.totalAmount)) < 0.009;

            if (!sameQuote) {
              try {
                await this.wooshPayService.expireCheckoutSession(pendingSessionId);
              } catch {
                // continue
              }
              pendingPayment.status = InternationalPaymentStatus.Canceled;
              pendingPayment.failureReason = 'replaced_by_new_intl_checkout_quote_change';
              await this.paymentRepository.save(pendingPayment);
            } else {
              user.membershipType =
                quote.membershipType === 'student'
                  ? InternationalMembershipType.Student
                  : InternationalMembershipType.Full;
              await this.userRepository.save(user);

              return {
                url: existingSession.url,
                sessionId: existingSession.id || pendingSessionId,
                refId: pendingPayment.clientReferenceId,
                currency: pendingPayment.currency,
                amount: Number(pendingPayment.amount),
                countryCode: pendingPayment.countryCode,
                paymentMethodTypes: this.wooshPayService.getCheckoutPaymentMethodTypes(),
                reused: true,
                testMode: Boolean(this.wooshPayService.getConfig()?.testMode),
              };
            }
          }

          try {
            await this.wooshPayService.expireCheckoutSession(pendingSessionId);
          } catch {
            // Session may already be expired/closed — continue with a new checkout.
          }
          pendingPayment.status = InternationalPaymentStatus.Canceled;
          pendingPayment.failureReason = 'replaced_by_new_intl_checkout';
          await this.paymentRepository.save(pendingPayment);
          }
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
      const { pricing, promoCode, promoApplied, membershipType } = quote;

      user.countryCode = pricing.countryCode;
      user.currency = pricing.currency;
      user.promoCode = promoCode;
      user.membershipType =
        membershipType === 'student'
          ? InternationalMembershipType.Student
          : InternationalMembershipType.Full;
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
            id: `intl-membership-${membershipType}`,
            name: pricing.itemName,
            price: pricing.totalAmount,
            quantity: 1,
            membershipType,
          },
        ],
        eventType: `intl-membership-signup-${membershipType}`,
      });
      // Save pending row before WooshPay so concurrent requests see the lock.
      await this.paymentRepository.save(payment);

      const successUrl = String(dto.successUrl).trim();
      const cancelUrl = String(dto.cancelUrl).trim();
      // Use ref only — WooshPay may not substitute {CHECKOUT_SESSION_ID} (causes "id is invalid").
      // Confirm looks up session from DB via ref → wooshpaySessionId.
      const finalSuccessUrl = `${successUrl}${successUrl.includes('?') ? '&' : '?'}ref=${clientReferenceId}`;
      const finalCancelUrl = `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}payment=canceled&ref=${clientReferenceId}`;

      try {
        const isTest = Boolean(this.wooshPayService.getConfig()?.testMode);
        const paymentMethodTypes = this.wooshPayService.getCheckoutPaymentMethodTypes();
        const unitCurrency = String(pricing.currency || 'sgd').toLowerCase();

        const session = await this.wooshPayService.createCheckoutSession({
          line_items: [
            {
              price_data: {
                currency: unitCurrency,
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
          payment_method_types: paymentMethodTypes,
          ...(user.email && { customer_email: user.email }),
        });

        payment.wooshpaySessionId = session.id;
        await this.paymentRepository.save(payment);

        return {
          url: session.url,
          sessionId: session.id,
          refId: clientReferenceId,
          currency: payment.currency,
          amount: Number(payment.amount),
          countryCode: pricing.countryCode,
          paymentMethodTypes,
          testMode: isTest,
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

    const sessionLookupId = sanitizeWooshpaySessionId(
      dto.sessionId || payment.wooshpaySessionId || '',
    );
    if (!sessionLookupId) {
      throw new BadRequestException(
        'Payment session id is missing. Please return from checkout again, or start a new payment.',
      );
    }

    const session = await this.wooshPayService.getSession(sessionLookupId);
    const paid = await this.isSessionPaid(session);
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
        paymentIntentIdFromSession(session) || payment.wooshpayPaymentIntentId;
      payment.paidAt = new Date();
      payment.failureReason = 'duplicate_membership_payment_needs_refund';
      await this.resolvePaymentMethodLabel(payment, session);
      await this.paymentRepository.save(payment);
      throw new ConflictException(
        'A membership payment was already completed for this account. If you were charged twice, contact support for a refund.',
      );
    }

    const finalizedUser = await this.applyPaidAndActivate(payment, session);
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
        wooshpaySessionId: payment.wooshpaySessionId || null,
        wooshpayPaymentIntentId: payment.wooshpayPaymentIntentId || null,
        paymentMethod: payment.paymentMethod || 'Online payment',
      },
    };
  }
}
