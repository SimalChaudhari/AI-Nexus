import {
  getNationalPhoneLimits,
  isValidNationalPhoneNumber,
} from 'src/utils/membership-dial-codes';

// ----------------------------------------------------------------------
// Map Personal tab form → Salesforce createApplicationPersonalDetailsNexus body
// ----------------------------------------------------------------------

export const EMPTY_PERSONAL_FORM = {
  applicationId: '',
  personalEmail: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  nationality: '',
  gender: 'Male',
  nameAsPerId: '',
  emailFriendlyName: '',
  citizenship: '',
  idType: '',
  maritalStatus: 'Single',
  subscriptionPreference: '',
  communicationPreference: '',
  professionalInterest: '',
  mobileCountryCode: '65',
  telMobile: '',
  otherCountryCode: '65',
  otherNumber: '',
  alternateEmailAddress: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: 'Singapore',
  postalCode: '',
  unitNumber: '',
  copyAddress: false,
  mailingaddressLine1: '',
  mailingaddressLine2: '',
  mailingcity: '',
  mailingstate: '',
  mailingcountry: 'Singapore',
  mailingpostalCode: '',
  mailingunitNumber: '',
  voiceCalls: 'Yes',
  textMessages: 'Yes',
  faxMessages: 'No',
};

/** HTML date input (yyyy-mm-dd) → Salesforce dd/mm/yyyy */
export function formatDateForSalesforceApi(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const parts = isoDate.trim().split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

export function salutationToGender(salutation) {
  const s = String(salutation || '').toLowerCase();
  if (s.includes('mr')) return 'Male';
  if (s.includes('mrs') || s.includes('ms') || s.includes('mdm')) return 'Female';
  return '';
}

export function buildPersonalDetailsApiPayload(personal, accountId, applicationId = '') {
  const copyAddress = Boolean(personal.copyAddress);
  const residential = {
    addressLine1: personal.addressLine1?.trim() || '',
    addressLine2: personal.addressLine2?.trim() || '',
    city: personal.city?.trim() || '',
    state: personal.state?.trim() || '',
    country: personal.country?.trim() || '',
    postalCode: personal.postalCode?.trim() || '',
    unitNumber: personal.unitNumber?.trim() || '',
  };

  const mailing = copyAddress
    ? {
        mailingaddressLine1: residential.addressLine1,
        mailingaddressLine2: residential.addressLine2,
        mailingcity: residential.city,
        mailingstate: residential.state,
        mailingcountry: residential.country,
        mailingpostalCode: residential.postalCode,
        mailingunitNumber: residential.unitNumber,
      }
    : {
        mailingaddressLine1: personal.mailingaddressLine1?.trim() || '',
        mailingaddressLine2: personal.mailingaddressLine2?.trim() || '',
        mailingcity: personal.mailingcity?.trim() || '',
        mailingstate: personal.mailingstate?.trim() || '',
        mailingcountry: personal.mailingcountry?.trim() || '',
        mailingpostalCode: personal.mailingpostalCode?.trim() || '',
        mailingunitNumber: personal.mailingunitNumber?.trim() || '',
      };

  return {
    accountId: String(accountId || '').trim(),
    ...(applicationId ? { applicationId: String(applicationId).trim() } : {}),
    personalEmail: personal.personalEmail?.trim() || personal.email?.trim() || '',
    firstName: personal.firstName?.trim() || '',
    lastName: personal.lastName?.trim() || '',
    dateOfBirth: formatDateForSalesforceApi(personal.dateOfBirth),
    nationality: personal.nationality?.trim() || '',
    gender: personal.gender?.trim() || salutationToGender(personal.salutation) || '',
    nameAsPerId: personal.nameAsPerId?.trim() || '',
    emailFriendlyName:
      personal.emailFriendlyName?.trim() || personal.firstName?.trim() || '',
    citizenship: personal.citizenship?.trim() || personal.nationality?.trim() || '',
    idType: personal.idType?.trim() || '',
    maritalStatus: personal.maritalStatus?.trim() || '',
    subscriptionPreference: personal.subscriptionPreference?.trim() || '',
    communicationPreference: personal.communicationPreference?.trim() || '',
    professionalInterest: personal.professionalInterest?.trim() || '',
    mobileCountryCode: Number(personal.mobileCountryCode) || 65,
    telMobile: personal.telMobile?.trim() || personal.contactNumber?.trim() || '',
    otherCountryCode: Number(personal.otherCountryCode) || 65,
    otherNumber: personal.otherNumber?.trim() || '',
    alternateEmailAddress: personal.alternateEmailAddress?.trim() || '',
    residentialAddress: residential,
    copyAddress,
    mailingAddress: mailing,
    voiceCalls: personal.voiceCalls || 'Yes',
    textMessages: personal.textMessages || 'Yes',
    faxMessages: personal.faxMessages || 'No',
  };
}

export const PERSONAL_BASIC_REQUIRED_KEYS = [
  'salutation',
  'firstName',
  'lastName',
  'gender',
  'nameAsPerId',
  'dateOfBirth',
  'maritalStatus',
  'nationality',
  'citizenship',
  'idType',
  'telMobile',
  'otherNumber',
  'personalEmail',
  'emailFriendlyName',
  'alternateEmailAddress',
];

export const PERSONAL_RESIDENTIAL_REQUIRED_KEYS = [
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'country',
  'postalCode',
  'unitNumber',
];

export const PERSONAL_MAILING_REQUIRED_KEYS = [
  'mailingaddressLine1',
  'mailingaddressLine2',
  'mailingcity',
  'mailingstate',
  'mailingcountry',
  'mailingpostalCode',
  'mailingunitNumber',
];

export const PERSONAL_PREFERENCES_REQUIRED_KEYS = [
  'subscriptionPreference',
  'communicationPreference',
  'professionalInterest',
  'voiceCalls',
  'textMessages',
  'faxMessages',
];

const PERSONAL_FIELD_LABELS = {
  salutation: 'Salutation',
  firstName: 'First name',
  lastName: 'Last name',
  gender: 'Gender',
  nameAsPerId: 'Name as per ID',
  dateOfBirth: 'Date of birth',
  maritalStatus: 'Marital status',
  nationality: 'Nationality',
  citizenship: 'Citizenship',
  idType: 'ID type',
  telMobile: 'Mobile number',
  otherNumber: 'Other number',
  personalEmail: 'Personal email',
  emailFriendlyName: 'Email friendly name',
  alternateEmailAddress: 'Alternate email',
  addressLine1: 'Address line 1',
  addressLine2: 'Address line 2',
  city: 'City',
  state: 'State',
  country: 'Country',
  postalCode: 'Postal code',
  unitNumber: 'Unit number',
  mailingaddressLine1: 'Mailing address line 1',
  mailingaddressLine2: 'Mailing address line 2',
  mailingcity: 'Mailing city',
  mailingstate: 'Mailing state',
  mailingcountry: 'Mailing country',
  mailingpostalCode: 'Mailing postal code',
  mailingunitNumber: 'Mailing unit number',
  subscriptionPreference: 'Subscription preference',
  communicationPreference: 'Communication preference',
  professionalInterest: 'Professional interest',
  voiceCalls: 'Voice calls',
  textMessages: 'Text messages',
  faxMessages: 'Fax messages',
};

export function getPersonalRequiredFieldKeys(personal) {
  return [
    ...PERSONAL_BASIC_REQUIRED_KEYS,
    ...PERSONAL_RESIDENTIAL_REQUIRED_KEYS,
    ...(personal?.copyAddress ? [] : PERSONAL_MAILING_REQUIRED_KEYS),
    ...PERSONAL_PREFERENCES_REQUIRED_KEYS,
  ];
}

export function isPersonalFieldMissing(personal, key) {
  if (key === 'personalEmail') {
    return !personal.personalEmail?.trim() && !personal.email?.trim();
  }
  return !String(personal[key] ?? '').trim();
}

export function validatePersonalFormBeforeSubmit(personal, applicationId = '') {
  if (!applicationId?.trim() && !personal.applicationId?.trim()) {
    return 'Application ID is required. Submit the Application tab first.';
  }

  const missing = getPersonalRequiredFieldKeys(personal)
    .filter((key) => isPersonalFieldMissing(personal, key))
    .map((key) => PERSONAL_FIELD_LABELS[key] || key);

  if (missing.length) {
    return `Please complete: ${missing.join(', ')}.`;
  }

  if (!isValidNationalPhoneNumber(personal.telMobile, personal.mobileCountryCode)) {
    const { hint } = getNationalPhoneLimits(personal.mobileCountryCode);
    return `Mobile number is invalid. ${hint}.`;
  }

  if (!isValidNationalPhoneNumber(personal.otherNumber, personal.otherCountryCode)) {
    const { hint } = getNationalPhoneLimits(personal.otherCountryCode);
    return `Other number is invalid. ${hint}.`;
  }

  return '';
}
