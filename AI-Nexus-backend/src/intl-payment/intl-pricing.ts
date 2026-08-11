import { resolveCountryCode, resolveCurrencyForCountry } from './intl-currency';
import type { IntlFxService } from './intl-fx.service';

/** Fallback membership fee in SGD when DB settings are missing. */
export const INTL_MEMBERSHIP_BASE_SGD = 365;
export const INTL_MEMBERSHIP_VOUCHER_SGD = 100;

export type IntlMembershipPricing = {
  countryCode: string;
  countryOfResidence: string;
  currency: string;
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

export async function resolveIntlMembershipPricing(
  fx: IntlFxService,
  options: {
    countryOfResidence: string;
    promoApplied?: boolean;
    baseAmountSgd?: number;
    voucherDiscountAmountSgd?: number;
  },
): Promise<IntlMembershipPricing> {
  const countryOfResidence = String(options.countryOfResidence || '').trim();
  const countryCode = resolveCountryCode(countryOfResidence);
  const currency = resolveCurrencyForCountry(countryOfResidence);
  const promoApplied = Boolean(options.promoApplied);

  const baseSgdRaw = Number(options.baseAmountSgd);
  const voucherSgdRaw = Number(options.voucherDiscountAmountSgd);
  const baseAmountSgd =
    Number.isFinite(baseSgdRaw) && baseSgdRaw > 0 ? baseSgdRaw : INTL_MEMBERSHIP_BASE_SGD;
  const voucherAmountSgd =
    Number.isFinite(voucherSgdRaw) && voucherSgdRaw > 0
      ? voucherSgdRaw
      : INTL_MEMBERSHIP_VOUCHER_SGD;

  const convertedBase = await fx.convertFromSgd(baseAmountSgd, currency);
  const convertedVoucher = await fx.convertFromSgd(voucherAmountSgd, currency);

  const total = promoApplied ? convertedVoucher : convertedBase;

  return {
    countryCode,
    countryOfResidence,
    currency: total.currency,
    baseAmountSgd,
    baseAmount: convertedBase.amount,
    exchangeRate: convertedBase.rate,
    promoApplied,
    totalAmount: total.amount,
    totalAmountCents: total.amountCents,
    voucherDiscountAmount: convertedVoucher.amount,
    itemName: promoApplied
      ? 'AI Nexus International membership (promo)'
      : 'AI Nexus International membership',
    itemDescription: promoApplied
      ? 'International AI Fluency membership with promotional rate. Full catalogue access after payment.'
      : 'International AI Fluency membership. Full catalogue access after payment succeeds.',
  };
}
