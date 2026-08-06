import {
  COUNTRY_CURRENCY,
  COUNTRY_LABEL_TO_CODE,
  INTL_COUNTRIES,
} from './intl-countries.data';

export function listIntlCountries() {
  return INTL_COUNTRIES;
}

export function resolveCountryCode(countryOfResidenceOrCode: string): string {
  const raw = String(countryOfResidenceOrCode || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (upper.length === 2 && COUNTRY_CURRENCY[upper]) return upper;
  return COUNTRY_LABEL_TO_CODE[raw.toLowerCase()] || '';
}

export function resolveCurrencyForCountry(countryOfResidenceOrCode: string): string {
  const code = resolveCountryCode(countryOfResidenceOrCode);
  return (code && COUNTRY_CURRENCY[code]) || 'USD';
}

export function isSingaporeCountry(countryOfResidenceOrCode: string): boolean {
  return resolveCountryCode(countryOfResidenceOrCode) === 'SG';
}
