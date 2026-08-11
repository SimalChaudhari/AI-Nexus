import { resolveCountryCode, resolveCurrencyForCountry } from './intl-currency';
import type { IntlFxService } from './intl-fx.service';

/** Fallback membership fee in SGD when DB settings are missing. */
export const INTL_MEMBERSHIP_BASE_SGD = 365;
export const INTL_MEMBERSHIP_STUDENT_SGD = 150;
export const INTL_MEMBERSHIP_VOUCHER_SGD = 100;

export type IntlMembershipPlan = 'student' | 'full';

export type IntlMembershipPricing = {
  countryCode: string;
  countryOfResidence: string;
  currency: string;
  membershipType: IntlMembershipPlan;
  baseAmountSgd: number;
  baseAmount: number;
  exchangeRate: number;
  promoApplied: boolean;
  totalAmount: number;
  totalAmountCents: number;
  voucherDiscountAmount: number;
  itemName: string;
  itemDescription: string;
};

export function normalizeIntlMembershipType(value: unknown): IntlMembershipPlan {
  const raw = String(value || '').trim().toLowerCase();
  return raw === 'student' ? 'student' : 'full';
}

export async function resolveIntlMembershipPricing(
  fx: IntlFxService,
  options: {
    countryOfResidence: string;
    promoApplied?: boolean;
    membershipType?: string;
    baseAmountSgd?: number;
    studentAmountSgd?: number;
    voucherDiscountAmountSgd?: number;
  },
): Promise<IntlMembershipPricing> {
  const countryOfResidence = String(options.countryOfResidence || '').trim();
  const countryCode = resolveCountryCode(countryOfResidence);
  const currency = resolveCurrencyForCountry(countryOfResidence);
  const promoApplied = Boolean(options.promoApplied);
  const membershipType = normalizeIntlMembershipType(options.membershipType);

  const baseSgdRaw = Number(options.baseAmountSgd);
  const studentSgdRaw = Number(options.studentAmountSgd);
  const voucherSgdRaw = Number(options.voucherDiscountAmountSgd);
  const fullAmountSgd =
    Number.isFinite(baseSgdRaw) && baseSgdRaw > 0 ? baseSgdRaw : INTL_MEMBERSHIP_BASE_SGD;
  const studentAmountSgd =
    Number.isFinite(studentSgdRaw) && studentSgdRaw > 0
      ? studentSgdRaw
      : INTL_MEMBERSHIP_STUDENT_SGD;
  const voucherAmountSgd =
    Number.isFinite(voucherSgdRaw) && voucherSgdRaw > 0
      ? voucherSgdRaw
      : INTL_MEMBERSHIP_VOUCHER_SGD;

  const planAmountSgd = membershipType === 'student' ? studentAmountSgd : fullAmountSgd;

  const convertedBase = await fx.convertFromSgd(planAmountSgd, currency);
  const convertedVoucher = await fx.convertFromSgd(voucherAmountSgd, currency);

  const total = promoApplied ? convertedVoucher : convertedBase;
  const planLabel = membershipType === 'student' ? 'Student' : 'Full / Role';

  return {
    countryCode,
    countryOfResidence,
    currency: total.currency,
    membershipType,
    baseAmountSgd: planAmountSgd,
    baseAmount: convertedBase.amount,
    exchangeRate: convertedBase.rate,
    promoApplied,
    totalAmount: total.amount,
    totalAmountCents: total.amountCents,
    voucherDiscountAmount: convertedVoucher.amount,
    itemName: promoApplied
      ? `AI Nexus International membership — ${planLabel} (promo)`
      : `AI Nexus International membership — ${planLabel}`,
    itemDescription: promoApplied
      ? `${planLabel} international AI Fluency membership with promotional rate.`
      : `${planLabel} international AI Fluency membership. Access unlocks after payment succeeds.`,
  };
}
