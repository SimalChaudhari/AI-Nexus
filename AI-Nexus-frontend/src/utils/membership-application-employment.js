import { formatDateForSalesforceApi } from 'src/utils/membership-application-personal';

// ----------------------------------------------------------------------

export const EMPTY_WORK_EXPERIENCE_ENTRY = {
  organisationName: '',
  organisationType: '',
  industry: '',
  jobPosition: '',
  jobLevel: '',
  jobFunction: '',
  jobResponsibilities: '',
  periodFrom: '',
  periodTo: '',
  isCurrentEmployment: false,
};

export const EMPTY_WORK_EXPERIENCE_FORM = {
  currentEmploymentStatus: 'Student',
  experiences: [{ ...EMPTY_WORK_EXPERIENCE_ENTRY }],
};

export function buildEmploymentDetailsApiPayload(workExperience, applicationId) {
  const experiences = Array.isArray(workExperience?.experiences)
    ? workExperience.experiences
    : [];

  const previousWorkExperience = experiences
    .filter((row) => row && typeof row === 'object')
    .map((row) => ({
      organisationName: row.organisationName?.trim() || '',
      organisationType: row.organisationType?.trim() || '',
      industry: row.industry?.trim() || '',
      jobPosition: row.jobPosition?.trim() || row.jobTitle?.trim() || '',
      jobLevel: row.jobLevel?.trim() || '',
      jobFunction: row.jobFunction?.trim() || '',
      jobResponsibilities:
        row.jobResponsibilities?.trim() || row.responsibilities?.trim() || '',
      periodFrom: formatDateForSalesforceApi(row.periodFrom || row.startDate),
      periodTo: formatDateForSalesforceApi(row.periodTo || row.endDate),
      isCurrentEmployment: Boolean(row.isCurrentEmployment),
    }))
    .filter((row) => row.organisationName || row.jobPosition);

  return {
    applicationId: String(applicationId || '').trim(),
    currentEmploymentStatus: workExperience.currentEmploymentStatus?.trim() || '',
    previousWorkExperience,
  };
}

export function validateWorkExperienceBeforeSubmit(workExperience, applicationId) {
  if (!applicationId?.trim()) {
    return 'Application ID is required. Submit the Application tab first.';
  }
  if (!workExperience.currentEmploymentStatus?.trim()) {
    return 'Current employment status is required.';
  }

  const payload = buildEmploymentDetailsApiPayload(workExperience, applicationId);
  if (!payload.previousWorkExperience.length) {
    return 'Add at least one work experience entry with organisation name or job position.';
  }
  return '';
}
