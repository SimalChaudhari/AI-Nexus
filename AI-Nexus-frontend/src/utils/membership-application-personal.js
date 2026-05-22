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

export function validatePersonalFormBeforeSubmit(personal, applicationId = '') {
  if (!applicationId?.trim() && !personal.applicationId?.trim()) {
    return 'Application ID is required. Submit the Application tab first.';
  }

  const missing = [];
  if (!personal.firstName?.trim()) missing.push('First name');
  if (!personal.lastName?.trim()) missing.push('Last name');
  if (!personal.nameAsPerId?.trim()) missing.push('Name as per ID');
  if (!personal.personalEmail?.trim() && !personal.email?.trim()) missing.push('Email');
  if (!personal.dateOfBirth?.trim()) missing.push('Date of birth');
  if (!personal.nationality?.trim()) missing.push('Nationality');
  if (missing.length) {
    return `Please complete: ${missing.join(', ')}.`;
  }

  if (personal.telMobile?.trim()) {
    if (!isValidNationalPhoneNumber(personal.telMobile, personal.mobileCountryCode)) {
      const { hint } = getNationalPhoneLimits(personal.mobileCountryCode);
      return `Mobile number is invalid. ${hint}.`;
    }
  }

  if (personal.otherNumber?.trim()) {
    if (!isValidNationalPhoneNumber(personal.otherNumber, personal.otherCountryCode)) {
      const { hint } = getNationalPhoneLimits(personal.otherCountryCode);
      return `Other number is invalid. ${hint}.`;
    }
  }

  return '';
}
