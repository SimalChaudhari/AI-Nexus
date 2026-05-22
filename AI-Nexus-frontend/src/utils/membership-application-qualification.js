import { formatDateForSalesforceApi } from 'src/utils/membership-application-personal';

// ----------------------------------------------------------------------

export const EMPTY_ACADEMIC_ENTRY = {
  country: 'Singapore',
  institutionName: '',
  otherInstitutionName: '',
  academicQualification: '',
  otherAcademicQualification: '',
  dateOfCourseCommencement: '',
  dateOfGraduation: '',
};

export const EMPTY_PROFESSIONAL_ENTRY = {
  institutionName: '',
  dateOfCourseCommencement: '',
  dateOfGraduation: '',
};

export const EMPTY_ATO_ENTRY = {
  atoName: '',
  membershipStatus: '',
  dateOfAdmissionAsFullMember: '',
  membershipNo: '',
};

export const EMPTY_QUALIFICATION_FORM = {
  academic: [],
  professional: [],
  ato: [],
};

export function hasAcademicRowData(row) {
  return Boolean(
    row?.country?.trim()
    || row?.institutionName?.trim()
    || row?.nameOfInstitution?.trim()
    || row?.otherInstitutionName?.trim()
    || row?.academicQualification?.trim()
    || row?.otherAcademicQualification?.trim()
    || row?.dateOfCourseCommencement
    || row?.dateOfGraduation
  );
}

export function buildAcademicQualificationPayload(row, applicationId) {
  const institutionName =
    row.institutionName?.trim() || row.nameOfInstitution?.trim() || '';

  return {
    applicationId: String(applicationId || '').trim(),
    country: row.country?.trim() || '',
    institutionName,
    otherInstitutionName: row.otherInstitutionName?.trim() || '',
    academicQualification: row.academicQualification?.trim() || '',
    otherAcademicQualification: row.otherAcademicQualification?.trim() || '',
    dateOfCourseCommencement: formatDateForSalesforceApi(row.dateOfCourseCommencement),
    dateOfGraduation: formatDateForSalesforceApi(row.dateOfGraduation),
  };
}

export function buildProfessionalQualificationPayload(row, applicationId) {
  return {
    applicationId: String(applicationId || '').trim(),
    institutionName: row.institutionName?.trim() || '',
    dateOfCourseCommencement: formatDateForSalesforceApi(row.dateOfCourseCommencement),
    dateOfGraduation: formatDateForSalesforceApi(row.dateOfGraduation),
  };
}

export function buildAtoMembershipPayload(row, applicationId) {
  return {
    applicationId: String(applicationId || '').trim(),
    atoName: row.atoName?.trim() || '',
    ...(row.membershipStatus?.trim()
      ? { membershipStatus: row.membershipStatus.trim() }
      : {}),
    ...(row.dateOfAdmissionAsFullMember
      ? { dateOfAdmissionAsFullMember: formatDateForSalesforceApi(row.dateOfAdmissionAsFullMember) }
      : {}),
    ...(row.membershipNo?.trim() ? { membershipNo: row.membershipNo.trim() } : {}),
  };
}

export const QUALIFICATION_SUBMIT_KEYS = {
  academic: 'qualification-academic',
  professional: 'qualification-professional',
  ato: 'qualification-ato',
};

function requireApplicationId(applicationId) {
  if (!applicationId?.trim()) {
    return 'Application ID is required. Submit the Application tab first.';
  }
  return '';
}

export function validateAcademicQualificationBeforeSubmit(qualification, applicationId) {
  const appErr = requireApplicationId(applicationId);
  if (appErr) return appErr;

  const rows = (qualification.academic || []).filter(hasAcademicRowData);
  if (!rows.length) {
    return ''; // optional — empty is allowed (skip API)
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const institutionName =
      row.institutionName?.trim() || row.nameOfInstitution?.trim() || '';
    if (!row.country?.trim()) {
      return `Academic row ${i + 1}: country is required.`;
    }
    if (!institutionName) {
      return `Academic row ${i + 1}: institution name is required.`;
    }
    if (!row.academicQualification?.trim()) {
      return `Academic row ${i + 1}: academic qualification is required.`;
    }
    if (!row.dateOfCourseCommencement || !row.dateOfGraduation) {
      return `Academic row ${i + 1}: course commencement and graduation dates are required.`;
    }
  }
  return '';
}

export function validateProfessionalQualificationBeforeSubmit(qualification, applicationId) {
  const appErr = requireApplicationId(applicationId);
  if (appErr) return appErr;

  const professional = (qualification.professional || []).filter(
    (row) => row.institutionName?.trim() && row.dateOfCourseCommencement && row.dateOfGraduation
  );
  if (!professional.length) {
    return 'Add at least one professional qualification with institution name and both dates.';
  }
  return '';
}

export function validateAtoMembershipBeforeSubmit(qualification, applicationId) {
  const appErr = requireApplicationId(applicationId);
  if (appErr) return appErr;

  const ato = (qualification.ato || []).filter((row) => row.atoName?.trim());
  if (!ato.length) {
    return 'Add at least one membership of other professional bodies (institution name).';
  }
  return '';
}

export function isQualificationTabComplete(submittedTabs) {
  return Boolean(
    submittedTabs?.[QUALIFICATION_SUBMIT_KEYS.professional]
    && submittedTabs?.[QUALIFICATION_SUBMIT_KEYS.ato]
  );
}

/** @deprecated Use section-specific validators */
export function validateQualificationBeforeSubmit(qualification, applicationId) {
  const pro = validateProfessionalQualificationBeforeSubmit(qualification, applicationId);
  if (pro) return pro;
  return validateAtoMembershipBeforeSubmit(qualification, applicationId);
}

export function getQualificationSubmitPlan(qualification, applicationId) {
  const academic = (qualification.academic || [])
    .filter(hasAcademicRowData)
    .map((row) => buildAcademicQualificationPayload(row, applicationId));

  const professional = (qualification.professional || [])
    .filter((row) => row.institutionName?.trim())
    .map((row) => buildProfessionalQualificationPayload(row, applicationId));

  const ato = (qualification.ato || [])
    .filter((row) => row.atoName?.trim())
    .map((row) => buildAtoMembershipPayload(row, applicationId));

  return { academic, professional, ato };
}
