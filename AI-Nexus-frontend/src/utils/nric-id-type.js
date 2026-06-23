export const SALESFORCE_ID_TYPE_BLUE = 'Blue NRIC';
export const SALESFORCE_ID_TYPE_PINK = 'Pink NRIC';

/**
 * Maps NRIC/FIN prefix to Salesforce `id_type` for citizen (Blue) vs PR (Pink).
 * @param {string} prefix
 * @returns {string}
 */
export function resolveSalesforceIdTypeFromPrefix(prefix = '') {
  const normalized = String(prefix || '').trim().toUpperCase();
  if (normalized === 'S' || normalized === 'T') {
    return SALESFORCE_ID_TYPE_BLUE;
  }
  if (normalized === 'F' || normalized === 'G') {
    return SALESFORCE_ID_TYPE_PINK;
  }
  return '';
}

/**
 * Resolve Salesforce id_type from verify API payload, with prefix/identifier fallback.
 * @param {Record<string, unknown>} extracted
 */
export function resolveSalesforceIdTypeFromExtracted(extracted = {}) {
  const direct = String(extracted.idType || '').trim();
  if (direct) {
    return direct;
  }

  const fromPrefix = resolveSalesforceIdTypeFromPrefix(extracted.prefix);
  if (fromPrefix) {
    return fromPrefix;
  }

  const identifier = String(extracted.identifier || '').trim();
  if (identifier) {
    return resolveSalesforceIdTypeFromPrefix(identifier[0]);
  }

  return '';
}

/**
 * @param {string} idType
 * @returns {boolean}
 */
export function isSalesforceCitizenOrPrIdType(idType = '') {
  const normalized = String(idType || '').trim();
  return normalized === SALESFORCE_ID_TYPE_BLUE || normalized === SALESFORCE_ID_TYPE_PINK;
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

  return payload;
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

  const idType = String(
    flow?.verifiedNricIdType
    || storedValues?.idType
    || verifiedPrefill?.idType
    || snapshot.verifiedNricIdType
    || snapshot.idType
    || resolveSalesforceIdTypeFromExtracted({
      idType: snapshot.idType,
      prefix: snapshot.prefix || flow?.verifiedNricPrefix,
      identifier: idNumber,
    })
    || ''
  ).trim();

  return { idType, idNumber };
}
