import { formatDateForSalesforceApi } from 'src/utils/membership-application-personal';
import { isExperiencedMembershipApplicationPathway } from 'src/utils/membership-application-pathway';

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

export const EMPTY_OPB_ENTRY = {
  institutionName: '',
  membershipStatus: '',
  membershipId: '',
};

export const EMPTY_QUALIFICATION_FORM = {
  academic: [],
  professional: [],
  ato: [],
  opb: [],
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

export function buildOpbMembershipPayload(row, applicationId) {
  return {
    applicationId: String(applicationId || '').trim(),
    institutionName: row.institutionName?.trim() || '',
    membershipStatus: row.membershipStatus?.trim() || '',
    membershipId: row.membershipId?.trim() || '',
  };
}

export const QUALIFICATION_SUBMIT_KEYS = {
  academic: 'qualification-academic',
  professional: 'qualification-professional',
  ato: 'qualification-ato',
  opb: 'qualification-opb',
};

function requireApplicationId(applicationId) {
  if (!applicationId?.trim()) {
    return 'Application ID is required. Submit the Application tab first.';
  }
  return '';
}

export function validateAcademicQualificationBeforeSubmit(qualification, applicationId, pathway) {
  const appErr = requireApplicationId(applicationId);
  if (appErr) return appErr;

  const rows = (qualification.academic || []).filter(hasAcademicRowData);
  if (!rows.length) {
    if (isExperiencedMembershipApplicationPathway(pathway)) {
      return 'Add at least one academic qualification.';
    }
    return '';
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
    return 'Add at least one Approved Training Organisation (ATO) with ATO name.';
  }
  return '';
}

export function validateOpbMembershipBeforeSubmit(qualification, applicationId) {
  const appErr = requireApplicationId(applicationId);
  if (appErr) return appErr;

  const opb = (qualification.opb || []).filter((row) => row.institutionName?.trim());
  if (!opb.length) {
    return 'Add at least one other professional body membership with institution name.';
  }
  for (let i = 0; i < opb.length; i += 1) {
    const row = opb[i];
    if (!row.membershipStatus?.trim()) {
      return `OPB row ${i + 1}: membership status is required.`;
    }
    if (!row.membershipId?.trim()) {
      return `OPB row ${i + 1}: membership ID is required.`;
    }
  }
  return '';
}

export function isQualificationTabComplete(submittedTabs, pathway) {
  if (isExperiencedMembershipApplicationPathway(pathway)) {
    return Boolean(
      submittedTabs?.[QUALIFICATION_SUBMIT_KEYS.academic]
      && submittedTabs?.[QUALIFICATION_SUBMIT_KEYS.professional]
      && submittedTabs?.[QUALIFICATION_SUBMIT_KEYS.opb]
    );
  }
  return Boolean(
    submittedTabs?.[QUALIFICATION_SUBMIT_KEYS.professional]
    && submittedTabs?.[QUALIFICATION_SUBMIT_KEYS.ato]
    && submittedTabs?.[QUALIFICATION_SUBMIT_KEYS.opb]
  );
}

/** @deprecated Use section-specific validators */
export function validateQualificationBeforeSubmit(qualification, applicationId, pathway) {
  const pro = validateProfessionalQualificationBeforeSubmit(qualification, applicationId);
  if (pro) return pro;
  if (isExperiencedMembershipApplicationPathway(pathway)) {
    return validateOpbMembershipBeforeSubmit(qualification, applicationId);
  }
  const ato = validateAtoMembershipBeforeSubmit(qualification, applicationId);
  if (ato) return ato;
  return validateOpbMembershipBeforeSubmit(qualification, applicationId);
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

  const opb = (qualification.opb || [])
    .filter((row) => row.institutionName?.trim())
    .map((row) => buildOpbMembershipPayload(row, applicationId));

  return { academic, professional, ato, opb };
}
