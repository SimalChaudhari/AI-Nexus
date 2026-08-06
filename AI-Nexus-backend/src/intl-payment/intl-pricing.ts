import { resolveCountryCode, resolveCurrencyForCountry } from './intl-currency';
import type { IntlFxService } from './intl-fx.service';

/** Membership fee is defined in SGD, then converted to the country currency. */
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
};

export async function resolveIntlMembershipPricing(
  fx: IntlFxService,
  options: {
    countryOfResidence: string;
    promoApplied?: boolean;
  },
): Promise<IntlMembershipPricing> {
  const countryOfResidence = String(options.countryOfResidence || '').trim();
  const countryCode = resolveCountryCode(countryOfResidence);
  const currency = resolveCurrencyForCountry(countryOfResidence);
  const promoApplied = Boolean(options.promoApplied);

  const convertedBase = await fx.convertFromSgd(INTL_MEMBERSHIP_BASE_SGD, currency);
  const convertedVoucher = await fx.convertFromSgd(INTL_MEMBERSHIP_VOUCHER_SGD, currency);

  const total = promoApplied ? convertedVoucher : convertedBase;

  return {
    countryCode,
    countryOfResidence,
    currency: total.currency,
    baseAmountSgd: INTL_MEMBERSHIP_BASE_SGD,
    baseAmount: convertedBase.amount,
    exchangeRate: convertedBase.rate,
    promoApplied,
    totalAmount: total.amount,
    totalAmountCents: total.amountCents,
    voucherDiscountAmount: convertedVoucher.amount,
    itemName: promoApplied
      ? 'AI Nexus International membership (promo)'
      : 'AI Nexus International membership',
  };
}
