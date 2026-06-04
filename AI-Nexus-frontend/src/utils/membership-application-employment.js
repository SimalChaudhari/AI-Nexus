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

const WORK_EXPERIENCE_TRACKED_FIELDS = [
  'organisationName',
  'organisationType',
  'industry',
  'jobPosition',
  'jobLevel',
  'jobFunction',
  'jobResponsibilities',
  'periodFrom',
  'periodTo',
];

export function isWorkExperienceRowStarted(row) {
  if (!row || typeof row !== 'object') {
    return false;
  }
  return WORK_EXPERIENCE_TRACKED_FIELDS.some((key) => String(row[key] ?? '').trim());
}

function isWorkExperiencePeriodComplete(row) {
  if (!String(row?.periodFrom ?? '').trim()) {
    return false;
  }
  if (row?.isCurrentEmployment) {
    return true;
  }
  return Boolean(String(row?.periodTo ?? '').trim());
}

export function isWorkExperienceRowComplete(row) {
  return (
    Boolean(String(row?.organisationName ?? '').trim()) &&
    Boolean(String(row?.industry ?? '').trim()) &&
    Boolean(String(row?.jobPosition ?? '').trim()) &&
    Boolean(String(row?.jobLevel ?? '').trim()) &&
    Boolean(String(row?.jobFunction ?? '').trim()) &&
    Boolean(String(row?.jobResponsibilities ?? '').trim()) &&
    isWorkExperiencePeriodComplete(row)
  );
}

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
    .filter(
      (row) =>
        row.organisationName &&
        row.industry &&
        row.jobPosition &&
        row.jobLevel &&
        row.jobFunction &&
        row.jobResponsibilities &&
        row.periodFrom &&
        (row.periodTo || row.isCurrentEmployment)
    );

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

  const experiences = Array.isArray(workExperience?.experiences) ? workExperience.experiences : [];
  let hasCompleteEntry = false;

  for (let index = 0; index < experiences.length; index += 1) {
    const row = experiences[index];
    const mustValidate = index === 0 || isWorkExperienceRowStarted(row);
    if (!mustValidate) {
      continue;
    }
    if (!isWorkExperienceRowComplete(row)) {
      return 'Please complete all required work experience fields, including period from and period to (unless this is current employment).';
    }
    hasCompleteEntry = true;
  }

  if (!hasCompleteEntry) {
    return 'Add at least one complete work experience entry with all required fields.';
  }
  return '';
}
