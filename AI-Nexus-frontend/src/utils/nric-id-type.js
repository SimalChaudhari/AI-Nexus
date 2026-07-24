export const SALESFORCE_ID_TYPE_BLUE = 'Blue NRIC';
export const SALESFORCE_ID_TYPE_PINK = 'Pink NRIC';

const NRIC_FIN_USER_MESSAGES = {
  invalidFormat:
    'The NRIC/FIN number format is not valid. It should be one letter (S, T, F, G, or M), followed by 7 digits and a final letter — for example, S1234567A.',
  invalidChecksum:
    'The NRIC/FIN number does not appear to be valid. Please check that it matches your card exactly. If it was read from a photo, go back and verify your NRIC again with a clearer image.',
  idTypeMismatch:
    'The NRIC number and card type do not match. Please go back and verify your NRIC again, or check that Blue/Pink NRIC is selected correctly.',
};

/** Maps technical NRIC/FIN API errors to user-friendly text. */
export function mapNricFinUserErrorMessage(message = '') {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();

  if (!text) {
    return text;
  }

  if (
    lower.includes('checksum')
    || lower.includes('failed checksum validation')
    || lower.includes('invalid singapore nric/fin checksum')
  ) {
    return NRIC_FIN_USER_MESSAGES.invalidChecksum;
  }

  if (
    lower.includes('invalid singapore nric/fin format')
    || (lower.includes('invalid') && lower.includes('format') && lower.includes('nric'))
  ) {
    return NRIC_FIN_USER_MESSAGES.invalidFormat;
  }

  if (lower.includes('does not match') && (lower.includes('id_type') || lower.includes('id type'))) {
    return NRIC_FIN_USER_MESSAGES.idTypeMismatch;
  }

  return text;
}

function normalizeCardColor(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, ' ');
}

function normalizeNationality(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function isSingaporeNationality(value = '') {
  const normalized = normalizeNationality(value);
  if (!normalized) return false;
  return normalized === 'SG' || normalized.includes('SINGAPORE');
}

export function indicatesForeignNationality(value = '') {
  const normalized = normalizeNationality(value);
  if (!normalized) return false;
  return !isSingaporeNationality(normalized);
}

/**
 * Resolve Salesforce id_type from AI-detected card color and nationality.
 * @param {{ cardColor?: string, nationality?: string }} params
 * @returns {string}
 */
export function resolveSalesforceIdTypeFromCardColorOrNationality(params = {}) {
  const cardColor = normalizeCardColor(params.cardColor);
  if (cardColor.includes('pink')) {
    return SALESFORCE_ID_TYPE_PINK;
  }
  if (cardColor.includes('blue')) {
    return SALESFORCE_ID_TYPE_BLUE;
  }

  if (isSingaporeNationality(params.nationality)) {
    return SALESFORCE_ID_TYPE_BLUE;
  }

  if (indicatesForeignNationality(params.nationality)) {
    return SALESFORCE_ID_TYPE_PINK;
  }

  return SALESFORCE_ID_TYPE_BLUE;
}

/** Resolve id_type from AI/user hints — not from NRIC prefix. */
export function resolveSalesforceIdTypeForNricNumber(nricNumber = '', fallback = {}) {
  const explicitIdType = String(fallback.explicitIdType || '').trim();
  if (explicitIdType === SALESFORCE_ID_TYPE_BLUE || explicitIdType === SALESFORCE_ID_TYPE_PINK) {
    return explicitIdType;
  }

  return resolveSalesforceIdTypeFromCardColorOrNationality({
    cardColor: fallback.cardColor,
    nationality: fallback.nationality,
  });
}

/**
 * Resolve Salesforce id_type from verify API payload (AI card color / nationality / idType).
 * @param {Record<string, unknown>} extracted
 */
export function resolveSalesforceIdTypeFromExtracted(extracted = {}) {
  return resolveSalesforceIdTypeForNricNumber(String(extracted.identifier || '').trim(), {
    cardColor: extracted.cardColor || extracted.profile?.cardColor,
    nationality: extracted.nationality || extracted.profile?.nationality,
    explicitIdType: extracted.idType,
  });
}

/**
 * @param {string} idType
 * @returns {boolean}
 */
export function isSalesforceCitizenOrPrIdType(idType = '') {
  const normalized = String(idType || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, ' ');
  return (normalized.includes('blue') && normalized.includes('nric'))
    || (normalized.includes('pink') && normalized.includes('nric'));
}

/**
 * @param {string} idType
 * @returns {string}
 */
export function resolveCitizenshipFromSalesforceIdType(idType = '') {
  const normalized = String(idType || '').trim();
  if (normalized === SALESFORCE_ID_TYPE_BLUE) {
    return 'singaporean';
  }
  if (normalized === SALESFORCE_ID_TYPE_PINK) {
    return 'permanent-resident-singapore';
  }
  return '';
}

/**
 * Splits a Singapore NRIC printed name into Western form fields.
 * NRIC format is `SURNAME GIVEN NAME(S)` e.g. `LIU XIANLONG, EDMUND` → lastName `LIU`, firstName `XIANLONG EDMUND`.
 * @param {string} fullName
 */
function sanitizeSingaporeNricFormNamePart(value = '') {
  return String(value || '')
    .replace(/[,.\-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseSingaporeNricDisplayName(fullName = '') {
  const cleaned = String(fullName || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

  if (!cleaned) {
    return { firstName: '', lastName: '', nameAsPerId: '' };
  }

  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 1) {
    const lastName = toTitleCase(sanitizeSingaporeNricFormNamePart(parts[0]));
    return { firstName: '', lastName, nameAsPerId: parts[0] };
  }

  const lastName = toTitleCase(sanitizeSingaporeNricFormNamePart(parts[0]));
  const givenNamesOnCard = parts
    .slice(1)
    .join(' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
  const firstName = toTitleCase(sanitizeSingaporeNricFormNamePart(givenNamesOnCard));

  return {
    firstName,
    lastName,
    nameAsPerId: `${parts[0]} ${givenNamesOnCard}`.trim(),
  };
}

/**
 * @param {Record<string, unknown>} params
 */
export function buildSalesforceNexusUserPayloadFromSignup({
  salutation = 'Mr.',
  firstName = '',
  lastName = '',
  email = '',
  nameAsPerId = '',
  idType = '',
  idNumber = '',
  company = '',
  jobFunction = '',
  countryOfResidence = '',
  yearsOfExperience = '',
  isPaid = false,
  paidAmount = '',
  paidDate = '',
  paymentProofToken = '',
} = {}) {
  const payload = {
    salutation: String(salutation || 'Mr.').trim(),
    first_name: String(firstName || '').trim(),
    last_name: String(lastName || '').trim(),
    name_as_per_id: String(nameAsPerId || `${firstName} ${lastName}`).trim(),
    email: String(email || '').trim(),
  };

  const resolvedIdType = String(idType || '').trim();
  const resolvedIdNumber = String(idNumber || '').trim();
  if (resolvedIdType && resolvedIdNumber) {
    payload.id_type = resolvedIdType;
    payload.id_number = resolvedIdNumber;
  }

  const resolvedCompany = String(company || '').trim();
  if (resolvedCompany) {
    payload.company = resolvedCompany;
  }

  const resolvedJobFunction = String(jobFunction || '').trim();
  if (resolvedJobFunction) {
    payload.jobFunction = resolvedJobFunction;
  }

  const resolvedCountryOfResidence = String(countryOfResidence || '').trim();
  if (resolvedCountryOfResidence) {
    payload.countryOfResidence = resolvedCountryOfResidence;
  }

  const resolvedYearsOfExperience = yearsOfExperience === 0 || yearsOfExperience
    ? Number(yearsOfExperience)
    : '';
  if (resolvedYearsOfExperience !== '' && !Number.isNaN(resolvedYearsOfExperience)) {
    payload.noOfYearOfRelevantWorkExperience = resolvedYearsOfExperience;
  }

  if (isPaid) {
    payload.Is_paid = true;
  }

  const resolvedPaidAmount = paidAmount === 0 || paidAmount
    ? Number(paidAmount)
    : '';
  if (resolvedPaidAmount !== '' && !Number.isNaN(resolvedPaidAmount)) {
    payload.paid_amount = resolvedPaidAmount;
  }

  const resolvedPaidDate = String(paidDate || '').trim();
  if (resolvedPaidDate) {
    payload.Paid_date = resolvedPaidDate;
  }

  const resolvedProofToken = String(paymentProofToken || '').trim();
  if (resolvedProofToken) {
    payload.paymentProofToken = resolvedProofToken;
  }

  return payload;
}

/**
 * Payload for POST /services/apexrest/signupfornexus (company QR / pre-paid enrollment).
 */
export function buildSalesforceSignupForNexusPayloadFromSignup({
  salutation = 'Mr',
  firstName = '',
  lastName = '',
  email = '',
  nameAsPerId = '',
  password = '',
  company = '',
  jobFunction = '',
  countryOfResidence = '',
  companyCode = '',
  yearsOfExperience = '',
} = {}) {
  const payload = {
    salutation: String(salutation || 'Mr').trim(),
    first_name: String(firstName || '').trim(),
    last_name: String(lastName || '').trim(),
    name_as_per_id: String(nameAsPerId || `${firstName} ${lastName}`).trim(),
    email: String(email || '').trim(),
    password: String(password || ''),
  };

  const resolvedCompany = String(company || '').trim();
  if (resolvedCompany) {
    payload.company = resolvedCompany;
  }

  const resolvedJobFunction = String(jobFunction || '').trim();
  if (resolvedJobFunction) {
    payload.jobFunction = resolvedJobFunction;
  }

  const resolvedCountryOfResidence = String(countryOfResidence || '').trim();
  if (resolvedCountryOfResidence) {
    payload.countryOfResidence = resolvedCountryOfResidence;
  }

  const resolvedCompanyCode = String(companyCode || '').trim();
  if (resolvedCompanyCode) {
    payload.companyCode = resolvedCompanyCode;
  }

  const resolvedYearsOfExperience = yearsOfExperience === 0 || yearsOfExperience
    ? Number(yearsOfExperience)
    : '';
  if (resolvedYearsOfExperience !== '' && !Number.isNaN(resolvedYearsOfExperience)) {
    payload.noOfYearOfRelevantWorkExperience = resolvedYearsOfExperience;
  }

  return payload;
}

export function resolveSalesforceNexusUsernameFromCreateResponse(createResult, fallbackEmail = '') {
  const salesforce = createResult?.salesforce ?? createResult;
  const nestedData =
    salesforce && typeof salesforce === 'object' && salesforce.data && typeof salesforce.data === 'object'
      ? salesforce.data
      : null;
  const sources = [salesforce, nestedData, createResult].filter(
    (item) => item && typeof item === 'object'
  );

  for (const source of sources) {
    const candidate = String(
      source.username
      || source.Username
      || source.userName
      || source.UserName
      || source.user_name
      || source.loginUsername
      || ''
    ).trim();
    if (candidate) {
      return candidate;
    }
  }

  return String(fallbackEmail || '').trim();
}

/**
 * Resolve verified NRIC fields from eligibility flow, draft storage, and form data.
 * @param {Record<string, unknown>} params
 */
export function resolveVerifiedNricSalesforceFields({
  flow = null,
  storedValues = {},
  formData = {},
  eligibilityData = null,
  verifiedPrefill = null,
} = {}) {
  const snapshot =
    eligibilityData?.snapshot && typeof eligibilityData.snapshot === 'object'
      ? eligibilityData.snapshot
      : {};

  const idNumber = String(
    formData?.nricFin
    || flow?.verifiedNricFin
    || storedValues?.nricFin
    || verifiedPrefill?.nricFin
    || snapshot.nricFin
    || snapshot.verifiedNricFin
    || ''
  ).trim();

  const storedIdType = String(
    flow?.verifiedNricIdType
    || storedValues?.idType
    || verifiedPrefill?.idType
    || snapshot.verifiedNricIdType
    || snapshot.idType
    || ''
  ).trim();

  const idType = String(
    storedIdType
    || resolveSalesforceIdTypeForNricNumber(idNumber, {
      cardColor: snapshot.cardColor,
      nationality: snapshot.nationality,
    })
    || ''
  ).trim();

  return { idType, idNumber };
}

// ----------------------------------------------------------------------
// Singapore NRIC/FIN checksum (same rules as backend singapore-nric-fin.util)

const SINGAPORE_NRIC_FIN_WEIGHTS = [2, 7, 6, 5, 4, 3, 2];
const ST_SERIES_CHECKSUM_MAP = ['J', 'Z', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
const FG_SERIES_CHECKSUM_MAP = ['X', 'W', 'U', 'T', 'R', 'Q', 'P', 'N', 'M', 'L', 'K'];
const M_SERIES_CHECKSUM_MAP = ['X', 'W', 'U', 'T', 'R', 'Q', 'P', 'N', 'J', 'L', 'K'];

export function normalizeSingaporeNricFin(value = '') {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function getSingaporeNricFinOffset(prefix) {
  if (prefix === 'T' || prefix === 'G') return 4;
  if (prefix === 'M') return 3;
  return 0;
}

function getSingaporeNricFinChecksumMap(prefix) {
  if (prefix === 'S' || prefix === 'T') return ST_SERIES_CHECKSUM_MAP;
  if (prefix === 'F' || prefix === 'G') return FG_SERIES_CHECKSUM_MAP;
  return M_SERIES_CHECKSUM_MAP;
}

function computeSingaporeNricFinChecksum(prefix, digits) {
  const total = digits
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * SINGAPORE_NRIC_FIN_WEIGHTS[index], 0);
  const remainder = (total + getSingaporeNricFinOffset(prefix)) % 11;
  return getSingaporeNricFinChecksumMap(prefix)[remainder];
}

/**
 * Validates Singapore NRIC/FIN format + checksum.
 * @returns {{ ok: true, normalized: string } | { ok: false, message: string }}
 */
export function validateSingaporeNricFinValue(value = '') {
  const normalized = normalizeSingaporeNricFin(value);
  if (!normalized) {
    return { ok: false, message: 'NRIC / ID number is required.' };
  }
  if (!/^[STFGM]\d{7}[A-Z]$/.test(normalized)) {
    return { ok: false, message: NRIC_FIN_USER_MESSAGES.invalidFormat };
  }
  const prefix = normalized[0];
  const digits = normalized.slice(1, 8);
  const suffix = normalized[8];
  const expected = computeSingaporeNricFinChecksum(prefix, digits);
  if (suffix !== expected) {
    return { ok: false, message: NRIC_FIN_USER_MESSAGES.invalidChecksum };
  }
  return { ok: true, normalized };
}

/** True when corporate enrol id_type should use Singapore NRIC checksum rules. */
export function isSingaporeNricIdType(idType = '') {
  const normalized = String(idType || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, ' ');
  if (!normalized) return true;
  if (normalized.includes('passport')) return false;
  return (
    normalized.includes('nric')
    || normalized === 'nric'
    || normalized.includes('fin')
  );
}
