import { resolveCountryCode, resolveCurrencyForCountry } from './intl-currency';

/** Currencies charged in major units (no cents), matching WooshPay/Stripe. */
const ZERO_DECIMAL = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

/** Asian countries — admin can set an exact membership price per country. */
export const PROMO_PRICING_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', currency: 'AFN' },
  { code: 'AM', name: 'Armenia', currency: 'AMD' },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT' },
  { code: 'BT', name: 'Bhutan', currency: 'BTN' },
  { code: 'BN', name: 'Brunei', currency: 'BND' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'CY', name: 'Cyprus', currency: 'EUR' },
  { code: 'GE', name: 'Georgia', currency: 'GEL' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'IR', name: 'Iran', currency: 'IRR' },
  { code: 'IQ', name: 'Iraq', currency: 'IQD' },
  { code: 'IL', name: 'Israel', currency: 'ILS' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'JO', name: 'Jordan', currency: 'JOD' },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD' },
  { code: 'KG', name: 'Kyrgyzstan', currency: 'KGS' },
  { code: 'LA', name: 'Laos', currency: 'LAK' },
  { code: 'LB', name: 'Lebanon', currency: 'LBP' },
  { code: 'MO', name: 'Macau', currency: 'MOP' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'MV', name: 'Maldives', currency: 'MVR' },
  { code: 'MN', name: 'Mongolia', currency: 'MNT' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK' },
  { code: 'NP', name: 'Nepal', currency: 'NPR' },
  { code: 'KP', name: 'North Korea', currency: 'KPW' },
  { code: 'OM', name: 'Oman', currency: 'OMR' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR' },
  { code: 'PS', name: 'Palestine', currency: 'EGP' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'QA', name: 'Qatar', currency: 'QAR' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'KR', name: 'South Korea', currency: 'KRW' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR' },
  { code: 'SY', name: 'Syria', currency: 'SYP' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD' },
  { code: 'TJ', name: 'Tajikistan', currency: 'TJS' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'TL', name: 'Timor-Leste', currency: 'USD' },
  { code: 'TR', name: 'Turkey', currency: 'TRY' },
  { code: 'TM', name: 'Turkmenistan', currency: 'TMT' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'YE', name: 'Yemen', currency: 'YER' },
] as const;

export type PromoPricingCountryCode = (typeof PROMO_PRICING_COUNTRIES)[number]['code'];

export type PromoAmountsByCountry = Record<string, number>;

export type CountryPricingEntry = {
  basePrice: number | null;
  discountPrice: number | null;
  active: boolean;
  promoCode: string | null;
};

export type CountryPricingMap = Record<string, CountryPricingEntry>;

export type ResolvedCountryPromo = {
  countryCode: string;
  currency: string;
  amount: number;
  amountCents: number;
};

function toExactAmount(value: unknown): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Number.isInteger(amount) ? amount : Number(amount.toFixed(2));
}

export function toPayableAmountCents(amount: number, currency: string): number {
  const code = String(currency || '').trim().toUpperCase();
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (ZERO_DECIMAL.has(code)) return Math.round(value);
  return Math.round(value * 100);
}

export function fromPayableAmountCents(amountCents: number, currency: string): number {
  const code = String(currency || '').trim().toUpperCase();
  const cents = Number(amountCents);
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  if (ZERO_DECIMAL.has(code)) return Math.round(cents);
  return Number((cents / 100).toFixed(2));
}

export function sanitizePromoAmountsByCountry(input: unknown): PromoAmountsByCountry {
  const allowed = new Set<string>(PROMO_PRICING_COUNTRIES.map((row) => row.code));
  const out: PromoAmountsByCountry = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;

  for (const [rawCode, rawAmount] of Object.entries(input as Record<string, unknown>)) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!allowed.has(code)) continue;
    const amount = toExactAmount(rawAmount);
    if (amount == null) continue;
    out[code] = amount;
  }
  return out;
}

export function sanitizeCountryPricing(input: unknown): CountryPricingMap {
  const allowed = new Set<string>(PROMO_PRICING_COUNTRIES.map((row) => row.code));
  const out: CountryPricingMap = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;

  for (const [rawCode, rawRow] of Object.entries(input as Record<string, unknown>)) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!allowed.has(code) || !rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
      continue;
    }
    const row = rawRow as Record<string, unknown>;
    const promoCode = String(row.promoCode || '').trim().toUpperCase();
    out[code] = {
      basePrice: toExactAmount(row.basePrice),
      discountPrice: toExactAmount(row.discountPrice),
      active: row.active === false ? false : true,
      promoCode: /^[A-Z0-9_-]{2,64}$/.test(promoCode) ? promoCode : null,
    };
  }
  return out;
}

export function promoAmountsFromCountryPricing(map: CountryPricingMap): PromoAmountsByCountry {
  const out: PromoAmountsByCountry = {};
  for (const [code, row] of Object.entries(map || {})) {
    const amount = Number(row?.discountPrice);
    if (Number.isFinite(amount) && amount > 0) out[code] = amount;
  }
  return out;
}

export function listCountryPricing(
  map?: CountryPricingMap | null,
  promoAmounts?: PromoAmountsByCountry | null,
) {
  const pricing = map && typeof map === 'object' ? map : {};
  const amounts = promoAmounts && typeof promoAmounts === 'object' ? promoAmounts : {};
  return PROMO_PRICING_COUNTRIES.map((row) => {
    const item = pricing[row.code];
    const discountFromPromo = toExactAmount(amounts[row.code]);
    return {
      code: row.code,
      name: row.name,
      currency: row.currency,
      basePrice: toExactAmount(item?.basePrice),
      discountPrice: toExactAmount(item?.discountPrice) ?? discountFromPromo,
      active: item ? item.active !== false : true,
      promoCode: item?.promoCode || null,
    };
  });
}

export function listPromoCountriesWithAmounts(map?: PromoAmountsByCountry | null) {
  const amounts = map && typeof map === 'object' ? map : {};
  return PROMO_PRICING_COUNTRIES.map((row) => ({
    code: row.code,
    name: row.name,
    currency: row.currency,
    amount: Number(amounts[row.code]) > 0 ? Number(amounts[row.code]) : null,
  }));
}

export function resolveCountryPricing(
  map: CountryPricingMap | null | undefined,
  countryOfResidenceOrCode?: string | null,
) {
  const countryCode = resolveCountryCode(String(countryOfResidenceOrCode || ''));
  if (!countryCode) return null;
  const row = map?.[countryCode];
  if (!row || row.active === false) return null;
  const currency = resolveCurrencyForCountry(countryCode);
  const basePrice = toExactAmount(row.basePrice);
  const discountPrice = toExactAmount(row.discountPrice);
  if (basePrice == null && discountPrice == null) return null;
  return {
    countryCode,
    currency,
    basePrice,
    discountPrice,
    promoCode: row.promoCode || null,
    baseAmountCents: basePrice != null ? toPayableAmountCents(basePrice, currency) : 0,
    discountAmountCents: discountPrice != null ? toPayableAmountCents(discountPrice, currency) : 0,
  };
}

export function countriesAssignedToPromo(
  map: CountryPricingMap | null | undefined,
  promoCode?: string | null,
): string[] {
  const code = String(promoCode || '').trim().toUpperCase();
  if (!code || !map || typeof map !== 'object') return [];
  return Object.entries(map)
    .filter(([, row]) => {
      if (!row || row.active === false) return false;
      if (String(row.promoCode || '').trim().toUpperCase() !== code) return false;
      return toExactAmount(row.discountPrice) != null;
    })
    .map(([countryCode]) => String(countryCode || '').trim().toUpperCase())
    .filter(Boolean);
}

export function resolveCountryPromoAmount(
  map: PromoAmountsByCountry | null | undefined,
  countryOfResidenceOrCode?: string | null,
): ResolvedCountryPromo | null {
  const countryCode = resolveCountryCode(String(countryOfResidenceOrCode || ''));
  if (!countryCode) return null;
  const amount = Number(map?.[countryCode]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const currency = resolveCurrencyForCountry(countryCode);
  return {
    countryCode,
    currency,
    amount,
    amountCents: toPayableAmountCents(amount, currency),
  };
}
