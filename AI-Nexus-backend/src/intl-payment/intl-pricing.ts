import { resolveCountryCode, resolveCurrencyForCountry } from './intl-currency';
import type { IntlFxService } from './intl-fx.service';
import {
  countriesAssignedToPromo,
  resolveCountryPricing,
  resolveCountryPromoAmount,
  resolveCountryPromoPriceForCode,
  type CountryPricingMap,
  type PromoAmountsByCountry,
} from './intl-promo-countries';

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
  promoFixed: boolean;
  itemName: string;
  itemDescription: string;
};

export function normalizeIntlMembershipType(value: unknown): IntlMembershipPlan {
  const raw = String(value || '').trim().toLowerCase();
  return raw === 'student' ? 'student' : 'full';
}

/** Convert a default SGD amount into the selected country's currency when no admin country price exists. */
export async function convertDefaultSgdToCountryCurrency(
  fx: IntlFxService,
  amountSgd: number,
  countryOfResidence?: string | null,
): Promise<{
  amount: number;
  amountCents: number;
  currency: string;
  rate: number;
  converted: boolean;
  countryCode: string;
}> {
  const safeSgd = Number(amountSgd);
  const amount = Number.isFinite(safeSgd) && safeSgd > 0 ? Number(safeSgd.toFixed(2)) : 0;
  const countryCode = resolveCountryCode(String(countryOfResidence || '').trim());
  const localCurrency = countryCode ? resolveCurrencyForCountry(countryCode) : 'SGD';

  if (!countryCode || localCurrency === 'SGD') {
    return {
      amount,
      amountCents: Math.round(amount * 100),
      currency: 'SGD',
      rate: 1,
      converted: false,
      countryCode,
    };
  }

  const converted = await fx.convertFromSgd(amount, localCurrency);
  return {
    amount: converted.amount,
    amountCents: converted.amountCents,
    currency: converted.currency,
    rate: converted.rate,
    converted: converted.currency !== 'SGD',
    countryCode,
  };
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
    promoAmountsByCountry?: PromoAmountsByCountry | null;
    countryPricing?: CountryPricingMap | null;
    promoCode?: string | null;
  },
): Promise<IntlMembershipPricing> {
  const countryOfResidence = String(options.countryOfResidence || '').trim();
  const countryCode = resolveCountryCode(countryOfResidence);
  const localCurrency = resolveCurrencyForCountry(countryOfResidence);
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

  const countryRow = resolveCountryPricing(options.countryPricing, countryOfResidence);
  const countryPromo = resolveCountryPromoAmount(
    options.promoAmountsByCountry,
    countryOfResidence,
  );
  const appliedPromo = String(options.promoCode || '').trim().toUpperCase();
  const assignedCountries = appliedPromo
    ? countriesAssignedToPromo(options.countryPricing, appliedPromo)
    : [];
  const countryEligibleForPromo =
    !appliedPromo
    || assignedCountries.length === 0
    || Boolean(countryCode && assignedCountries.includes(countryCode));
  const promoPriceForCode = appliedPromo
    ? resolveCountryPromoPriceForCode(options.countryPricing, countryOfResidence, appliedPromo)
    : null;

  const planBasePrice =
    membershipType === 'student' ? countryRow?.studentBasePrice : countryRow?.basePrice;
  const planBaseCents =
    membershipType === 'student'
      ? countryRow?.studentBaseAmountCents
      : countryRow?.baseAmountCents;
  const planPromoPrice =
    membershipType === 'student'
      ? promoPriceForCode?.studentDiscountPrice
      : promoPriceForCode?.discountPrice;
  const planPromoCents =
    membershipType === 'student'
      ? promoPriceForCode?.studentDiscountAmountCents
      : promoPriceForCode?.discountAmountCents;

  const exactBase =
    planBasePrice != null
      ? {
          amount: planBasePrice,
          amountCents: planBaseCents || 0,
          currency: countryRow?.currency || localCurrency,
          rate: 1,
        }
      : null;
  const exactPromo =
    countryEligibleForPromo && planPromoPrice != null
      ? {
          amount: planPromoPrice,
          amountCents: planPromoCents || 0,
          currency: promoPriceForCode?.currency || countryRow?.currency || localCurrency,
          rate: 1,
        }
      : countryEligibleForPromo && membershipType !== 'student' && countryPromo
        ? {
            amount: countryPromo.amount,
            amountCents: countryPromo.amountCents,
            currency: countryPromo.currency || localCurrency,
            rate: 1,
          }
        : null;

  let base = exactBase;
  let promo = exactPromo;
  let convertedRate = 1;

  if (!base || !promo) {
    if (!base) {
      const convertedBase = await fx.convertFromSgd(planAmountSgd, localCurrency);
      base = {
        amount: convertedBase.amount,
        amountCents: convertedBase.amountCents,
        currency: convertedBase.currency,
        rate: convertedBase.rate,
      };
      convertedRate = convertedBase.rate;
    }
    if (!promo) {
      const convertedVoucher = await fx.convertFromSgd(voucherAmountSgd, localCurrency);
      promo = {
        amount: convertedVoucher.amount,
        amountCents: convertedVoucher.amountCents,
        currency: convertedVoucher.currency,
        rate: convertedVoucher.rate,
      };
    }
  }

  const roleHasCountryPromo = exactPromo != null;
  const applyPromo =
    promoApplied
    && countryEligibleForPromo
    && (roleHasCountryPromo || assignedCountries.length === 0);
  const payable = applyPromo ? promo : base;
  const planLabel = membershipType === 'student' ? 'Student' : 'Full / Role';

  return {
    countryCode,
    countryOfResidence,
    currency: payable.currency,
    membershipType,
    baseAmountSgd: planAmountSgd,
    baseAmount: base.amount,
    exchangeRate: exactBase ? 1 : convertedRate,
    promoApplied: applyPromo,
    totalAmount: payable.amount,
    totalAmountCents: payable.amountCents,
    voucherDiscountAmount: promo.amount,
    promoFixed: applyPromo ? Boolean(exactPromo) : Boolean(exactBase),
    itemName: applyPromo
      ? `AI Nexus International membership — ${planLabel} (promo)`
      : `AI Nexus International membership — ${planLabel}`,
    itemDescription: applyPromo
      ? `${planLabel} international AI Fluency membership with promotional rate.`
      : `${planLabel} international AI Fluency membership. Access unlocks after payment succeeds.`,
  };
}
