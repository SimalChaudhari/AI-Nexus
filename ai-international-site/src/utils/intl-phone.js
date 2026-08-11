import { COUNTRIES } from 'src/assets/data/countries';

/** Default national (local) digit limits when country-specific rule is unknown. */
const DEFAULT_LIMITS = { min: 7, max: 15 };

/**
 * National mobile/local number length by ISO country code.
 * Values are typical mobile lengths (without dial code).
 */
const NATIONAL_PHONE_LIMITS = {
  IN: { min: 10, max: 10 },
  SG: { min: 8, max: 8 },
  MY: { min: 9, max: 10 },
  ID: { min: 9, max: 12 },
  TH: { min: 9, max: 9 },
  VN: { min: 9, max: 10 },
  PH: { min: 10, max: 10 },
  CN: { min: 11, max: 11 },
  HK: { min: 8, max: 8 },
  TW: { min: 9, max: 10 },
  JP: { min: 10, max: 11 },
  KR: { min: 9, max: 11 },
  AU: { min: 9, max: 9 },
  NZ: { min: 8, max: 10 },
  US: { min: 10, max: 10 },
  CA: { min: 10, max: 10 },
  GB: { min: 10, max: 10 },
  IE: { min: 9, max: 10 },
  DE: { min: 10, max: 12 },
  FR: { min: 9, max: 9 },
  IT: { min: 9, max: 10 },
  ES: { min: 9, max: 9 },
  NL: { min: 9, max: 9 },
  BE: { min: 8, max: 9 },
  CH: { min: 9, max: 9 },
  SE: { min: 9, max: 10 },
  NO: { min: 8, max: 8 },
  DK: { min: 8, max: 8 },
  FI: { min: 9, max: 10 },
  PL: { min: 9, max: 9 },
  PT: { min: 9, max: 9 },
  AE: { min: 9, max: 9 },
  SA: { min: 9, max: 9 },
  QA: { min: 8, max: 8 },
  KW: { min: 8, max: 8 },
  BH: { min: 8, max: 8 },
  OM: { min: 8, max: 8 },
  ZA: { min: 9, max: 9 },
  NG: { min: 10, max: 11 },
  KE: { min: 9, max: 10 },
  EG: { min: 10, max: 10 },
  BR: { min: 10, max: 11 },
  MX: { min: 10, max: 10 },
  AR: { min: 10, max: 10 },
  CL: { min: 9, max: 9 },
  CO: { min: 10, max: 10 },
  PK: { min: 10, max: 10 },
  BD: { min: 10, max: 10 },
  LK: { min: 9, max: 10 },
  NP: { min: 10, max: 10 },
  MM: { min: 8, max: 10 },
  KH: { min: 8, max: 9 },
  LA: { min: 8, max: 10 },
};

export function resolveCountryByIsoOrLabel(countryOfResidence) {
  const raw = String(countryOfResidence || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return (
    COUNTRIES.find((c) => c.label.toLowerCase() === lower) ||
    COUNTRIES.find((c) => c.code.toLowerCase() === lower) ||
    null
  );
}

export function formatDialDisplay(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  return raw.startsWith('+') ? raw : `+${raw}`;
}

export function getNationalPhoneLimitsForCountry(countryOfResidence) {
  const country = resolveCountryByIsoOrLabel(countryOfResidence);
  if (!country?.code) {
    return {
      ...DEFAULT_LIMITS,
      dialDisplay: '',
      countryLabel: '',
      iso: '',
      hint: 'Enter local number without country code',
    };
  }

  const limits = NATIONAL_PHONE_LIMITS[country.code] || DEFAULT_LIMITS;
  const dialDisplay = formatDialDisplay(country.phone);
  const same = limits.min === limits.max;
  return {
    min: limits.min,
    max: limits.max,
    dialDisplay,
    countryLabel: country.label,
    iso: country.code,
    hint: same
      ? `${limits.max} digits for ${country.label} (without ${dialDisplay})`
      : `${limits.min}–${limits.max} digits for ${country.label} (without ${dialDisplay})`,
  };
}

export function sanitizeNationalPhoneNumber(value, countryOfResidence) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const { max } = getNationalPhoneLimitsForCountry(countryOfResidence);
  return digits.slice(0, max);
}

export function isValidNationalPhoneNumber(value, countryOfResidence) {
  const raw = String(value || '').trim();
  if (!raw) return true; // optional field
  if (/[^\d\s+()-]/.test(raw)) return false;

  const digits = sanitizeNationalPhoneNumber(raw, countryOfResidence);
  const { min, max } = getNationalPhoneLimitsForCountry(countryOfResidence);
  return digits.length >= min && digits.length <= max;
}
