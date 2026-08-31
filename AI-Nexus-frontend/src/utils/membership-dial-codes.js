import { getExampleNumber } from 'libphonenumber-js/min';
import examples from 'libphonenumber-js/mobile/examples';
import { isValidPhoneNumber } from 'react-phone-number-input';

import { countries } from 'src/assets/data';

// ----------------------------------------------------------------------

const DEFAULT_NATIONAL_LIMITS = { min: 4, max: 12 };

/** Normalize dial string for API (digits only, e.g. "65", "1"). */
export function normalizeDialCode(phone) {
  if (phone == null || phone === '') return '';
  return String(phone).replace(/\D/g, '');
}

/** ISO country code (e.g. SG) for a dial code. */
export function getDialCountryIso(dialCode) {
  return findDialOptionByCode(dialCode)?.code || '';
}

/** Min/max national digits and helper hint for the selected dial code. */
export function getNationalPhoneLimits(dialCode) {
  const iso = getDialCountryIso(dialCode);
  if (!iso) {
    return {
      ...DEFAULT_NATIONAL_LIMITS,
      hint: 'Enter local number without country code',
    };
  }

  try {
    const example = getExampleNumber(iso, examples);
    const max = example?.nationalNumber?.length || DEFAULT_NATIONAL_LIMITS.max;
    const min = Math.min(max, Math.max(4, max - 2));
    const countryLabel = findDialOptionByCode(dialCode)?.label || iso;
    return {
      min,
      max,
      hint: `${max} digits for ${countryLabel}`,
    };
  } catch {
    return {
      ...DEFAULT_NATIONAL_LIMITS,
      hint: 'Enter local number without country code',
    };
  }
}

/** Strip non-digits and cap length for the selected country dial code. */
export function sanitizeNationalPhoneNumber(value, dialCode) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';

  const { max } = getNationalPhoneLimits(dialCode);
  return digits.slice(0, max);
}

/** Validate national number against selected dial code (E.164 check). */
export function isValidNationalPhoneNumber(number, dialCode) {
  const digits = sanitizeNationalPhoneNumber(number, dialCode);
  if (!digits) return false;

  const dial = normalizeDialCode(dialCode);
  if (!dial) return digits.length >= DEFAULT_NATIONAL_LIMITS.min;

  try {
    return isValidPhoneNumber(`+${dial}${digits}`);
  } catch {
    const { min, max } = getNationalPhoneLimits(dialCode);
    return digits.length >= min && digits.length <= max;
  }
}

/** Options for phone dial-code picker — same source as signup CountrySelect / PhoneInput. */
export const MEMBERSHIP_DIAL_CODE_OPTIONS = countries
  .filter((c) => c.code && c.phone)
  .map((c) => {
    const dial = normalizeDialCode(c.phone);
    return {
      dial,
      label: c.label,
      code: c.code,
      display: `+${c.phone}`,
    };
  });

export function findDialOptionByCode(dialValue) {
  const normalized = normalizeDialCode(dialValue);
  if (!normalized) return null;
  return (
    MEMBERSHIP_DIAL_CODE_OPTIONS.find((o) => o.dial === normalized) ||
    MEMBERSHIP_DIAL_CODE_OPTIONS.find((o) => o.dial.startsWith(normalized)) ||
    null
  );
}
