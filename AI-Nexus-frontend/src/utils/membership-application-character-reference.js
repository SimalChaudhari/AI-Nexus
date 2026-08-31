import {
  getNationalPhoneLimits,
  isValidNationalPhoneNumber,
} from 'src/utils/membership-dial-codes';

// ----------------------------------------------------------------------

export const EMPTY_CHARACTER_REFERENCE_FORM = {
  firstReferenceName: '',
  firstReferenceYearsKnown: '',
  firstReferenceRelationship: '',
  firstReferenceCountryCode: '65',
  firstReferenceContactNo: '',
  firstReferenceEmailAddress: '',
  firstReferenceNameOfAccountancyBody: '',
  firstReferenceMembershipId: '',
  secondReferenceName: '',
  secondReferenceYearsKnown: '',
  secondReferenceRelationship: '',
  secondReferenceCountryCode: '65',
  secondReferenceContactNo: '',
  secondReferenceEmailAddress: '',
  secondReferenceType: '',
  secondReferenceCompanyName: '',
  secondReferencePositionTitle: '',
};

function parseCountryCode(value) {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) ? n : 0;
}

function parseYearsKnown(value) {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function buildCharacterReferenceApiPayload(form, applicationId) {
  return {
    applicationId: String(applicationId || '').trim(),
    firstReferenceName: form.firstReferenceName?.trim() || '',
    firstReferenceYearsKnown: parseYearsKnown(form.firstReferenceYearsKnown),
    firstReferenceRelationship: form.firstReferenceRelationship?.trim() || '',
    firstReferenceCountryCode: parseCountryCode(form.firstReferenceCountryCode),
    firstReferenceContactNo: form.firstReferenceContactNo?.trim() || '',
    firstReferenceEmailAddress: form.firstReferenceEmailAddress?.trim() || '',
    firstReferenceNameOfAccountancyBody:
      form.firstReferenceNameOfAccountancyBody?.trim() || '',
    firstReferenceMembershipId: form.firstReferenceMembershipId?.trim() || '',
    secondReferenceName: form.secondReferenceName?.trim() || '',
    secondReferenceYearsKnown: parseYearsKnown(form.secondReferenceYearsKnown),
    secondReferenceRelationship: form.secondReferenceRelationship?.trim() || '',
    secondReferenceCountryCode: parseCountryCode(form.secondReferenceCountryCode),
    secondReferenceContactNo: form.secondReferenceContactNo?.trim() || '',
    secondReferenceEmailAddress: form.secondReferenceEmailAddress?.trim() || '',
    secondReferenceType: form.secondReferenceType?.trim() || '',
    secondReferenceCompanyName: form.secondReferenceCompanyName?.trim() || '',
    secondReferencePositionTitle: form.secondReferencePositionTitle?.trim() || '',
  };
}

export const CHARACTER_REFERENCE_REQUIRED_KEYS = [
  'firstReferenceName',
  'firstReferenceYearsKnown',
  'firstReferenceRelationship',
  'firstReferenceContactNo',
  'firstReferenceEmailAddress',
  'firstReferenceNameOfAccountancyBody',
  'firstReferenceMembershipId',
  'secondReferenceName',
  'secondReferenceYearsKnown',
  'secondReferenceRelationship',
  'secondReferenceContactNo',
  'secondReferenceEmailAddress',
  'secondReferenceType',
  'secondReferenceCompanyName',
  'secondReferencePositionTitle',
];

const CHARACTER_REFERENCE_FIELD_LABELS = {
  firstReferenceName: 'First reference name',
  firstReferenceYearsKnown: 'First reference years known',
  firstReferenceRelationship: 'First reference relationship',
  firstReferenceContactNo: 'First reference contact number',
  firstReferenceEmailAddress: 'First reference email',
  firstReferenceNameOfAccountancyBody: 'First reference name of accountancy body',
  firstReferenceMembershipId: 'First reference membership ID',
  secondReferenceName: 'Second reference name',
  secondReferenceYearsKnown: 'Second reference years known',
  secondReferenceRelationship: 'Second reference relationship',
  secondReferenceContactNo: 'Second reference contact number',
  secondReferenceEmailAddress: 'Second reference email',
  secondReferenceType: 'Second reference type',
  secondReferenceCompanyName: 'Second reference company name',
  secondReferencePositionTitle: 'Second reference position / title',
};

export function isCharacterReferenceFieldMissing(form, key) {
  return !String(form[key] ?? '').trim();
}

export function validateCharacterReferenceBeforeSubmit(form, applicationId) {
  if (!applicationId?.trim()) {
    return 'Application ID is required. Submit the Application tab first.';
  }

  const missing = CHARACTER_REFERENCE_REQUIRED_KEYS.filter((key) =>
    isCharacterReferenceFieldMissing(form, key)
  ).map((key) => CHARACTER_REFERENCE_FIELD_LABELS[key] || key);

  if (missing.length) {
    return `Please complete: ${missing.join(', ')}.`;
  }

  if (!Number.isFinite(parseYearsKnown(form.firstReferenceYearsKnown))) {
    return 'First reference years known must be a valid number.';
  }
  if (!Number.isFinite(parseYearsKnown(form.secondReferenceYearsKnown))) {
    return 'Second reference years known must be a valid number.';
  }

  if (
    !isValidNationalPhoneNumber(
      form.firstReferenceContactNo,
      form.firstReferenceCountryCode
    )
  ) {
    const { hint } = getNationalPhoneLimits(form.firstReferenceCountryCode);
    return `First reference contact number is invalid. ${hint}.`;
  }

  if (
    !isValidNationalPhoneNumber(
      form.secondReferenceContactNo,
      form.secondReferenceCountryCode
    )
  ) {
    const { hint } = getNationalPhoneLimits(form.secondReferenceCountryCode);
    return `Second reference contact number is invalid. ${hint}.`;
  }

  return '';
}
