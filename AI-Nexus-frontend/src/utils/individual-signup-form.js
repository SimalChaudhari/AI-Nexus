import {
  resolveCitizenshipFromSalesforceIdType,
} from 'src/utils/nric-id-type';

export const INDIVIDUAL_SIGNUP_JOB_FUNCTION_OPTIONS = [
  { value: 'accounting-finance-related', label: 'Accounting and finance related' },
  {
    value: 'unemployed-accounting-finance-qualification',
    label: 'Unemployed but has accounting and finance qualification',
  },
  { value: 'others', label: 'Others' },
];

export const INDIVIDUAL_SIGNUP_CITIZENSHIP_OPTIONS = [
  { value: 'singaporean', label: 'Singaporean' },
  { value: 'permanent-resident-singapore', label: 'Permanent Resident of Singapore' },
  { value: 'others', label: 'Others' },
];

export function requiresFreeSignupJobAudit(jobFunction = '') {
  const normalized = String(jobFunction || '').trim();
  return Boolean(normalized) && normalized !== 'others';
}

/** Human-readable job function for Salesforce Apex payloads. */
export function resolveIndividualSignupJobFunctionLabel(jobFunction = '', jobFunctionOther = '') {
  const value = String(jobFunction || '').trim();
  if (!value) return '';
  if (value === 'others') {
    return String(jobFunctionOther || '').trim();
  }
  return (
    INDIVIDUAL_SIGNUP_JOB_FUNCTION_OPTIONS.find((option) => option.value === value)?.label || value
  );
}

export const INDIVIDUAL_SIGNUP_DEFAULT_VALUES = {
  company: '',
  companyCode: '',
  jobFunction: '',
  jobFunctionOther: '',
  yearsOfExperience: '',
  countryOfResidence: '',
  nricFin: '',
  idType: '',
  citizenship: '',
  citizenshipOther: '',
  imdaFundingAcknowledged: false,
  promoCode: '',
};

/**
 * @param {Record<string, unknown>} flow
 * @param {Record<string, unknown>} [storedValues]
 */
export function buildIndividualSignupPrefillFromEligibility(flow = {}, storedValues = {}) {
  const companyFromFlow = String(flow.companyVerifiedName || '').trim();
  const companyCodeFromFlow =
    flow.companyReferenceConfirmed === true ? String(flow.companyReferenceId || '').trim() : '';
  const verifiedNricFin = String(flow.verifiedNricFin || storedValues.nricFin || '').trim();
  const verifiedNricIdType = String(flow.verifiedNricIdType || storedValues.idType || '').trim();
  const company = String(storedValues.company || companyFromFlow).trim();
  const citizenshipFromIdType = resolveCitizenshipFromSalesforceIdType(verifiedNricIdType);

  return {
    company,
    companyCode: String(storedValues.companyCode || companyCodeFromFlow).trim(),
    jobFunction: String(storedValues.jobFunction || '').trim(),
    jobFunctionOther: String(storedValues.jobFunctionOther || '').trim(),
    yearsOfExperience:
      storedValues.yearsOfExperience === 0 || storedValues.yearsOfExperience
        ? String(storedValues.yearsOfExperience)
        : '',
    countryOfResidence: String(storedValues.countryOfResidence || '').trim(),
    nricFin: verifiedNricFin,
    idType: verifiedNricIdType,
    citizenship: String(storedValues.citizenship || citizenshipFromIdType).trim(),
    citizenshipOther: String(storedValues.citizenshipOther || '').trim(),
    imdaFundingAcknowledged: Boolean(storedValues.imdaFundingAcknowledged),
    nricVerified: Boolean(verifiedNricFin),
    companyPrefilled: Boolean(companyFromFlow),
  };
}

/**
 * @param {Record<string, unknown>} formData
 * @param {boolean} isFreeSignup
 */
export function buildIndividualSignupProfileSnapshot(formData = {}, isFreeSignup = false) {
  const jobFunctionLabel =
    INDIVIDUAL_SIGNUP_JOB_FUNCTION_OPTIONS.find((option) => option.value === formData.jobFunction)
      ?.label || formData.jobFunction;
  const citizenshipLabel =
    INDIVIDUAL_SIGNUP_CITIZENSHIP_OPTIONS.find((option) => option.value === formData.citizenship)
      ?.label || formData.citizenship;

  const snapshot = {
    companyName: String(formData.company || '').trim(),
    companyCode: String(formData.companyCode || '').trim(),
    jobFunction: String(formData.jobFunction || '').trim(),
    jobFunctionLabel,
    jobFunctionOther:
      formData.jobFunction === 'others' ? String(formData.jobFunctionOther || '').trim() : '',
    yearsOfRelevantWorkExperience: Number(formData.yearsOfExperience),
    countryOfResidence: String(formData.countryOfResidence || '').trim(),
  };

  if (isFreeSignup) {
    snapshot.nricFin = String(formData.nricFin || '').trim();
    snapshot.idType = String(formData.idType || '').trim();
    snapshot.verifiedNricIdType = String(formData.idType || '').trim();
    snapshot.citizenship = String(formData.citizenship || '').trim();
    snapshot.citizenshipLabel =
      formData.citizenship === 'others'
        ? String(formData.citizenshipOther || '').trim()
        : citizenshipLabel;
    snapshot.citizenshipOther =
      formData.citizenship === 'others' ? String(formData.citizenshipOther || '').trim() : '';
    snapshot.imdaFundingAcknowledged = Boolean(formData.imdaFundingAcknowledged);
  }

  return snapshot;
}

/**
 * @param {Record<string, unknown> | null | undefined} eligibilityData
 * @param {Record<string, unknown>} formData
 * @param {boolean} isFreeSignup
 */
export function mergeSignupEligibilityData(eligibilityData, formData, isFreeSignup) {
  const profileSnapshot = buildIndividualSignupProfileSnapshot(formData, isFreeSignup);

  return {
    isSingaporePr:
      typeof eligibilityData?.isSingaporePr === 'boolean' ? eligibilityData.isSingaporePr : undefined,
    isIscaMember:
      typeof eligibilityData?.isIscaMember === 'boolean' ? eligibilityData.isIscaMember : undefined,
    wantsIscaMembership:
      typeof eligibilityData?.wantsIscaMembership === 'boolean'
        ? eligibilityData.wantsIscaMembership
        : undefined,
    eligibilityType: eligibilityData?.eligibilityType || undefined,
    snapshot: {
      ...(eligibilityData?.snapshot && typeof eligibilityData.snapshot === 'object'
        ? eligibilityData.snapshot
        : {}),
      ...profileSnapshot,
    },
  };
}
