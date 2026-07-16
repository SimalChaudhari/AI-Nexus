import { formatDateForSalesforceApi } from 'src/utils/membership-application-personal';
import {
  MEMBERSHIP_SALESFORCE_SESSION_KEY,
  readMembershipSalesforceSession,
} from 'src/utils/membership-salesforce-session';

// ----------------------------------------------------------------------

export const STUDENT_MEMBERSHIP_FORM_DRAFT_KEY = 'studentMembershipApplicationFormDraft';

export const STUDENT_ACADEMIC_LEVELS = [
  'Secondary School',
  'Institute of Technical Education (ITE)',
  'Polytechnic',
  'University',
  'Others',
];

export const STUDENT_MEMBERSHIP_PROGRAMME_OPTIONS = [
  'School Mates',
  'Classmates',
  'Family & Friends',
];

export const STUDENT_MEMBERSHIP_SCAQ_OPTIONS = [
  'Inadequate knowledge of available CA programmes to decide',
  'Considering other Programmes',
];

/** Salesforce Expected_Year_of_Graduation__c / commencement year picklists (year strings). */
export function buildStudentMembershipYearRange(startYear, endYear) {
  const start = Number(startYear);
  const end = Number(endYear);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  const years = [];
  for (let year = end; year >= start; year -= 1) {
    years.push(String(year));
  }
  return years;
}

export function getStudentMembershipCommencementYearOptions(referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  return buildStudentMembershipYearRange(currentYear - 12, currentYear + 1);
}

export function getStudentMembershipGraduationYearOptions(referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  return buildStudentMembershipYearRange(currentYear - 2, currentYear + 12);
}

export function isAllowedStudentMembershipCommencementYear(value, referenceDate = new Date()) {
  return getStudentMembershipCommencementYearOptions(referenceDate).includes(
    String(value || '').trim()
  );
}

export function isAllowedStudentMembershipGraduationYear(value, referenceDate = new Date()) {
  return getStudentMembershipGraduationYearOptions(referenceDate).includes(
    String(value || '').trim()
  );
}

/** Salesforce Account Citizenship__c picklist (not the same as free-text nationality). */
export const STUDENT_MEMBERSHIP_CITIZENSHIP_OPTIONS = [
  'Singapore Citizen',
  'Singapore Permanent Resident',
  'Foreigner',
];

/** Common Salesforce Nationality__c values used in student membership submit. */
export const STUDENT_MEMBERSHIP_NATIONALITY_OPTIONS = [
  'Singapore',
  'Malaysia',
  'India',
  'China',
  'Indonesia',
  'Philippines',
  'Vietnam',
  'Myanmar',
  'Thailand',
  'Others',
];

const CITIZENSHIP_ALIASES = {
  singaporean: 'Singapore Citizen',
  'singapore pr': 'Singapore Permanent Resident',
  'singapore permanent resident': 'Singapore Permanent Resident',
  pr: 'Singapore Permanent Resident',
  'permanent resident': 'Singapore Permanent Resident',
};

const NATIONALITY_ALIASES = {
  singaporean: 'Singapore',
  'singapore citizen': 'Singapore',
};

export function normalizeCitizenshipForSalesforceApi(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return CITIZENSHIP_ALIASES[trimmed.toLowerCase()] || trimmed;
}

export function normalizeNationalityForSalesforceApi(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return NATIONALITY_ALIASES[trimmed.toLowerCase()] || trimmed;
}

export const EMPTY_STUDENT_MEMBERSHIP_FORM = {
  personalEmail: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  nationality: 'Singapore',
  gender: 'Male',
  nameAsPerId: '',
  emailFriendlyName: '',
  citizenship: 'Singapore Citizen',
  idType: 'NRIC',
  matriculationNumber: '',
  academicLevel: '',
  institutionName: '',
  mobileCountryCode: '65',
  mobileNumber: '',
  addressLine1: '',
  addressLine2: '',
  city: 'Singapore',
  state: 'Singapore',
  country: 'Singapore',
  postalCode: '',
  unitNumber: '',
  copyAddress: true,
  studentMembershipProgramme: [],
  studentMembershipOtherDetail: '',
  plansToTakeCAQualification: 'No',
  studentMembershipSCAQ: [],
  studentMembershipSCAQOtherDetail: '',
  voiceCalls: 'Yes',
  textMessages: 'Yes',
  faxMessages: 'No',
  doNotMarket: false,
  subscribeStudentMembershipEDM: true,
  subscribeCharteredAccountant: true,
  declaration1: false,
  declaration2: false,
  declaration3: false,
  qualificationInstitutionName: '',
  qualification: '',
  otherQualification: '',
  expectedGraduationYear: '',
  courseCommencementYear: '',
};

export function buildStudentMembershipApiPayload(form) {
  const residentialAddress = {
    addressLine1: form.addressLine1?.trim() || '',
    addressLine2: form.addressLine2?.trim() || '',
    city: form.city?.trim() || '',
    state: form.state?.trim() || '',
    country: form.country?.trim() || '',
    postalCode: form.postalCode?.trim() || '',
    unitNumber: form.unitNumber?.trim() || '',
  };

  return {
    personalEmail: form.personalEmail?.trim() || '',
    firstName: form.firstName?.trim() || '',
    lastName: form.lastName?.trim() || '',
    dateOfBirth: formatDateForSalesforceApi(form.dateOfBirth),
    nationality: normalizeNationalityForSalesforceApi(form.nationality),
    gender: form.gender?.trim() || '',
    nameAsPerId: form.nameAsPerId?.trim() || '',
    emailFriendlyName: form.emailFriendlyName?.trim() || form.firstName?.trim() || '',
    citizenship: normalizeCitizenshipForSalesforceApi(form.citizenship),
    idType: form.idType?.trim() || '',
    matriculationNumber: form.matriculationNumber?.trim() || '',
    academicLevel: form.academicLevel?.trim() || '',
    institutionName: form.institutionName?.trim() || '',
    mobileCountryCode: String(form.mobileCountryCode || '65').trim(),
    mobileNumber: form.mobileNumber?.trim() || '',
    residentialAddress,
    copyAddress: Boolean(form.copyAddress),
    studentMembershipProgramme: Array.isArray(form.studentMembershipProgramme)
      ? form.studentMembershipProgramme
      : [],
    studentMembershipOtherDetail: form.studentMembershipOtherDetail?.trim() || '',
    plansToTakeCAQualification: form.plansToTakeCAQualification?.trim() || 'No',
    studentMembershipSCAQ: Array.isArray(form.studentMembershipSCAQ) ? form.studentMembershipSCAQ : [],
    studentMembershipSCAQOtherDetail: form.studentMembershipSCAQOtherDetail?.trim() || '',
    voiceCalls: form.voiceCalls?.trim() || 'Yes',
    textMessages: form.textMessages?.trim() || 'Yes',
    faxMessages: form.faxMessages?.trim() || 'No',
    doNotMarket: Boolean(form.doNotMarket),
    subscribeStudentMembershipEDM: Boolean(form.subscribeStudentMembershipEDM),
    subscribeCharteredAccountant: Boolean(form.subscribeCharteredAccountant),
    declaration1: Boolean(form.declaration1),
    declaration2: Boolean(form.declaration2),
    declaration3: Boolean(form.declaration3),
    qualificationDetail: {
      institutionName: form.qualificationInstitutionName?.trim() || form.institutionName?.trim() || '',
      qualification: form.qualification?.trim() || '',
      otherQualification: form.otherQualification?.trim() || '',
      expectedGraduationYear: form.expectedGraduationYear?.trim() || '',
      courseCommencementYear: form.courseCommencementYear?.trim() || '',
    },
  };
}

function parseSalesforceDateToInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, d, m, y] = slash;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return '';
}

export function mapStudentMembershipDetailsToForm(applicationData = {}) {
  const addr = applicationData.residentialAddress || {};
  const qual = Array.isArray(applicationData.qualificationDetails)
    ? applicationData.qualificationDetails[0] || {}
    : applicationData.qualificationDetail || {};

  return {
    ...EMPTY_STUDENT_MEMBERSHIP_FORM,
    personalEmail: applicationData.personalEmail || '',
    firstName: applicationData.firstName || '',
    lastName: applicationData.lastName || '',
    dateOfBirth: parseSalesforceDateToInput(applicationData.dateOfBirth),
    nationality: normalizeNationalityForSalesforceApi(applicationData.nationality),
    gender: applicationData.gender || 'Male',
    nameAsPerId: applicationData.nameAsPerId || '',
    emailFriendlyName: applicationData.emailFriendlyName || '',
    citizenship: normalizeCitizenshipForSalesforceApi(applicationData.citizenship),
    idType: applicationData.idType || '',
    matriculationNumber: applicationData.matriculationNumber || '',
    academicLevel: applicationData.academicLevel || '',
    institutionName: applicationData.institutionName || '',
    mobileCountryCode: String(applicationData.mobileCountryCode || '65'),
    mobileNumber: applicationData.mobileNumber || '',
    addressLine1: addr.addressLine1 || '',
    addressLine2: addr.addressLine2 || '',
    city: addr.city || 'Singapore',
    state: addr.state || 'Singapore',
    country: addr.country || 'Singapore',
    postalCode: addr.postalCode || '',
    unitNumber: addr.unitNumber || '',
    copyAddress: applicationData.copyAddress !== false,
    studentMembershipProgramme: applicationData.studentMembershipProgramme || [],
    studentMembershipOtherDetail: applicationData.studentMembershipOtherDetail || '',
    plansToTakeCAQualification: applicationData.plansToTakeCAQualification || 'No',
    studentMembershipSCAQ: applicationData.studentMembershipSCAQ || [],
    studentMembershipSCAQOtherDetail: applicationData.studentMembershipSCAQOtherDetail || '',
    voiceCalls: applicationData.voiceCalls || 'Yes',
    textMessages: applicationData.textMessages || 'Yes',
    faxMessages: applicationData.faxMessages || 'No',
    doNotMarket: Boolean(applicationData.doNotMarket),
    subscribeStudentMembershipEDM: applicationData.subscribeStudentMembershipEDM !== false,
    subscribeCharteredAccountant: applicationData.subscribeCharteredAccountant !== false,
    declaration1: Boolean(applicationData.declaration1),
    declaration2: Boolean(applicationData.declaration2),
    declaration3: Boolean(applicationData.declaration3),
    qualificationInstitutionName: qual.institutionName || '',
    qualification: qual.qualification || '',
    otherQualification: qual.otherQualification || '',
    expectedGraduationYear: qual.expectedGraduationYear || '',
    courseCommencementYear: qual.courseCommencementYear || '',
  };
}

export function validateStudentMembershipPersonalTab(form) {
  if (!form.personalEmail?.trim()) return 'Personal email is required.';
  if (!form.firstName?.trim()) return 'First name is required.';
  if (!form.lastName?.trim()) return 'Last name is required.';
  if (!form.dateOfBirth?.trim()) return 'Date of birth is required.';
  if (!form.nameAsPerId?.trim()) return 'Name as per ID is required.';
  if (!form.nationality?.trim()) return 'Nationality is required.';
  if (!form.citizenship?.trim()) return 'Citizenship is required.';
  if (!form.matriculationNumber?.trim()) return 'Matriculation number is required.';
  if (!form.mobileNumber?.trim()) return 'Mobile number is required.';
  if (!form.addressLine1?.trim()) return 'Residential address line 1 is required.';
  if (!form.postalCode?.trim()) return 'Postal code is required.';
  return '';
}

export function validateStudentMembershipAcademicTab(form) {
  if (!form.academicLevel?.trim()) return 'Academic level is required.';
  if (!form.institutionName?.trim()) return 'Institution name is required.';
  if (!form.qualification?.trim()) return 'Qualification is required.';
  if (!form.courseCommencementYear?.trim()) return 'Course commencement year is required.';
  if (!isAllowedStudentMembershipCommencementYear(form.courseCommencementYear)) {
    return 'Please select a valid course commencement year.';
  }
  if (!form.expectedGraduationYear?.trim()) return 'Expected graduation year is required.';
  if (!isAllowedStudentMembershipGraduationYear(form.expectedGraduationYear)) {
    return 'Please select a valid expected graduation year.';
  }
  const commencementYear = Number(form.courseCommencementYear);
  const graduationYear = Number(form.expectedGraduationYear);
  if (
    Number.isFinite(commencementYear)
    && Number.isFinite(graduationYear)
    && graduationYear < commencementYear
  ) {
    return 'Expected graduation year must be on or after course commencement year.';
  }
  return '';
}

export function validateStudentMembershipPreferencesTab(form) {
  const selections = Array.isArray(form?.studentMembershipProgramme)
    ? form.studentMembershipProgramme
    : [];
  if (!selections.length) {
    return 'Please select at least one student membership programme option.';
  }
  return '';
}

export function validateStudentMembershipDeclarationsTab(form) {
  if (!form.declaration1 || !form.declaration2 || !form.declaration3) {
    return 'Please accept all declarations before submitting.';
  }
  return '';
}

export function validateStudentMembershipTab(tabId, form) {
  switch (tabId) {
    case 'personal':
      return validateStudentMembershipPersonalTab(form);
    case 'academic':
      return validateStudentMembershipAcademicTab(form);
    case 'preferences':
      return validateStudentMembershipPreferencesTab(form);
    case 'declarations':
      return validateStudentMembershipDeclarationsTab(form);
    default:
      return '';
  }
}

export function isStudentMembershipTabComplete(tabId, form) {
  return !validateStudentMembershipTab(tabId, form);
}

export function validateStudentMembershipFormBeforeSave(form) {
  const personalError = validateStudentMembershipPersonalTab(form);
  if (personalError) return personalError;
  const academicError = validateStudentMembershipAcademicTab(form);
  if (academicError) return academicError;
  return '';
}

export function validateStudentMembershipFormBeforeSubmit(form) {
  const saveError = validateStudentMembershipFormBeforeSave(form);
  if (saveError) return saveError;
  const preferencesError = validateStudentMembershipPreferencesTab(form);
  if (preferencesError) return preferencesError;
  return validateStudentMembershipDeclarationsTab(form);
}

function coercePhoneFieldValue(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object' && value.target?.value != null) {
    return String(value.target.value);
  }
  return '';
}

export function sanitizeStudentMembershipFormFields(form = {}) {
  if (!form || typeof form !== 'object') return {};
  const courseCommencementYear = String(form.courseCommencementYear || '').trim();
  const expectedGraduationYear = String(form.expectedGraduationYear || '').trim();
  return {
    ...form,
    mobileCountryCode: coercePhoneFieldValue(form.mobileCountryCode) || '65',
    mobileNumber: coercePhoneFieldValue(form.mobileNumber),
    nationality: normalizeNationalityForSalesforceApi(form.nationality),
    citizenship: normalizeCitizenshipForSalesforceApi(form.citizenship),
    courseCommencementYear: isAllowedStudentMembershipCommencementYear(courseCommencementYear)
      ? courseCommencementYear
      : '',
    expectedGraduationYear: isAllowedStudentMembershipGraduationYear(expectedGraduationYear)
      ? expectedGraduationYear
      : '',
  };
}

/**
 * Copy personal email from eligibility questionnaire into the student application draft.
 * Only fills when the draft personal email is still empty.
 * @param {Record<string, unknown>} flow
 * @returns {boolean}
 */
export function applyStudentMembershipEmailPrefillFromEligibilityFlow(flow = {}) {
  const personalEmail = String(flow.studentPersonalEmail || '').trim();
  if (!personalEmail) return false;

  const existing = readStudentMembershipFormDraft();
  const currentEmail = String(existing?.form?.personalEmail || '').trim();
  if (currentEmail) return false;

  const nextForm = sanitizeStudentMembershipFormFields({
    ...EMPTY_STUDENT_MEMBERSHIP_FORM,
    ...(existing?.form || {}),
    personalEmail,
  });

  saveStudentMembershipFormDraft({
    form: nextForm,
    applicationId: String(existing?.applicationId || '').trim(),
    applicationName: existing?.applicationName || '',
  });
  return true;
}

export function readStudentMembershipFormDraft() {
  try {
    const raw = localStorage.getItem(STUDENT_MEMBERSHIP_FORM_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.form) {
      return { ...parsed, form: sanitizeStudentMembershipFormFields(parsed.form) };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildStudentMembershipRequestBody({
  applicationData,
  applicationId,
  email,
  mobileNumber,
  matriculationNumber,
} = {}) {
  const session = readMembershipSalesforceSession();
  const socialAccessToken = String(session?.socialToken || '').trim();

  return {
    ...(socialAccessToken ? { socialAccessToken } : {}),
    ...(applicationData ? { applicationData } : {}),
    ...(applicationId ? { applicationId } : {}),
    ...(email ? { email: String(email).trim() } : {}),
    ...(mobileNumber ? { mobileNumber: String(mobileNumber).trim() } : {}),
    ...(matriculationNumber ? { matriculationNumber: String(matriculationNumber).trim() } : {}),
  };
}

export function saveStudentMembershipFormDraft(draft) {
  try {
    localStorage.setItem(
      STUDENT_MEMBERSHIP_FORM_DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() })
    );
  } catch {
    // ignore
  }
}

export function clearStudentMembershipFormDraft() {
  try {
    localStorage.removeItem(STUDENT_MEMBERSHIP_FORM_DRAFT_KEY);
  } catch {
    // ignore
  }
}

/** Remove student application draft and linked applicationId from browser storage after submit. */
export function clearStudentMembershipApplicationLocalData() {
  clearStudentMembershipFormDraft();
  try {
    const raw = localStorage.getItem(MEMBERSHIP_SALESFORCE_SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    const next = { ...parsed };
    delete next.applicationId;
    if (!String(next.accountId || '').trim()) {
      localStorage.removeItem(MEMBERSHIP_SALESFORCE_SESSION_KEY);
      return;
    }
    localStorage.setItem(MEMBERSHIP_SALESFORCE_SESSION_KEY, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent('storage', { key: MEMBERSHIP_SALESFORCE_SESSION_KEY }));
  } catch {
    // ignore
  }
}

export function readStoredStudentApplicationName() {
  try {
    const draft = readStudentMembershipFormDraft();
    return String(draft?.applicationName || '').trim();
  } catch {
    return '';
  }
}
