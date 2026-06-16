import { formatDateForSalesforceApi } from 'src/utils/membership-application-personal';
import { isExperiencedMembershipApplicationPathway } from 'src/utils/membership-application-pathway';

// ----------------------------------------------------------------------

export const EMPTY_CURRENT_WORK_ENTRY = {
  organisationName: '',
  organisationType: '',
  industry: '',
  jobPosition: '',
  jobLevel: '',
  jobFunction: '',
  jobResponsibilities: '',
  periodFrom: '',
  periodTo: '',
  businessEmail: '',
  businessNumber: '',
  businessRegistrationType: '',
  staffStrength: '',
  turnover: '',
};

export const EMPTY_PREVIOUS_WORK_ENTRY = {
  organisationName: '',
  organisationType: '',
  industry: '',
  jobPosition: '',
  jobLevel: '',
  jobFunction: '',
  jobResponsibilities: '',
  periodFrom: '',
  periodTo: '',
  businessEmail: '',
  businessNumber: '',
};

/** @deprecated Use EMPTY_CURRENT_WORK_ENTRY / EMPTY_PREVIOUS_WORK_ENTRY */
export const EMPTY_WORK_EXPERIENCE_ENTRY = {
  ...EMPTY_PREVIOUS_WORK_ENTRY,
  isCurrentEmployment: false,
};

export const EMPTY_WORK_EXPERIENCE_FORM = {
  currentEmploymentStatus: 'Student',
  accreditedEmployerScheme: 'No',
  currentWorkExperience: [],
  previousWorkExperience: [],
};

export const EMPLOYMENT_STATUSES_WITHOUT_CURRENT = ['Student', 'Unemployed'];

export function requiresCurrentWorkExperience(status) {
  return !EMPLOYMENT_STATUSES_WITHOUT_CURRENT.includes(String(status || '').trim());
}

function seedPreviousWorkExperience(status, rows) {
  const previous = Array.isArray(rows)
    ? rows.map((row) => ({ ...EMPTY_PREVIOUS_WORK_ENTRY, ...row }))
    : [];
  if (!previous.length && !requiresCurrentWorkExperience(status)) {
    return [{ ...EMPTY_PREVIOUS_WORK_ENTRY }];
  }
  return previous;
}

const CURRENT_TRACKED_FIELDS = [
  'organisationName',
  'organisationType',
  'industry',
  'jobPosition',
  'jobLevel',
  'jobFunction',
  'jobResponsibilities',
  'periodFrom',
  'businessEmail',
  'businessNumber',
  'businessRegistrationType',
  'staffStrength',
  'turnover',
];

const PREVIOUS_TRACKED_FIELDS = [
  'organisationName',
  'organisationType',
  'industry',
  'jobPosition',
  'jobLevel',
  'jobFunction',
  'jobResponsibilities',
  'periodFrom',
  'periodTo',
  'businessEmail',
  'businessNumber',
];

export function isWorkExperienceRowStarted(row, kind = 'current') {
  if (!row || typeof row !== 'object') {
    return false;
  }
  const fields = kind === 'previous' ? PREVIOUS_TRACKED_FIELDS : CURRENT_TRACKED_FIELDS;
  return fields.some((key) => String(row[key] ?? '').trim());
}

function isCurrentRowComplete(row) {
  return (
    Boolean(String(row?.organisationName ?? '').trim()) &&
    Boolean(String(row?.industry ?? '').trim()) &&
    Boolean(String(row?.jobPosition ?? '').trim()) &&
    Boolean(String(row?.jobLevel ?? '').trim()) &&
    Boolean(String(row?.jobFunction ?? '').trim()) &&
    Boolean(String(row?.jobResponsibilities ?? '').trim()) &&
    Boolean(String(row?.periodFrom ?? '').trim())
  );
}

function isPreviousRowComplete(row, periodToOptional = false) {
  if (periodToOptional) {
    return isCurrentRowComplete(row);
  }
  return isCurrentRowComplete(row) && Boolean(String(row?.periodTo ?? '').trim());
}

/** @deprecated */
export function isWorkExperienceRowComplete(row) {
  if (row?.isCurrentEmployment) {
    return isCurrentRowComplete(row);
  }
  return isPreviousRowComplete(row);
}

function mapCurrentWorkRow(row) {
  const mapped = {
    organisationName: row.organisationName?.trim() || '',
    industry: row.industry?.trim() || '',
    jobPosition: row.jobPosition?.trim() || row.jobTitle?.trim() || '',
    jobLevel: row.jobLevel?.trim() || '',
    jobFunction: row.jobFunction?.trim() || '',
    jobResponsibilities:
      row.jobResponsibilities?.trim() || row.responsibilities?.trim() || '',
    periodFrom: formatDateForSalesforceApi(row.periodFrom || row.startDate),
    isCurrentEmployment: true,
  };

  if (row.organisationType?.trim()) mapped.organisationType = row.organisationType.trim();
  if (row.businessEmail?.trim()) mapped.businessEmail = row.businessEmail.trim();
  if (row.businessNumber?.trim()) mapped.businessNumber = row.businessNumber.trim();
  if (row.businessRegistrationType?.trim()) {
    mapped.businessRegistrationType = row.businessRegistrationType.trim();
  }
  if (row.staffStrength?.trim()) mapped.staffStrength = row.staffStrength.trim();
  if (row.turnover?.trim()) mapped.turnover = row.turnover.trim();

  return mapped;
}

function mapPreviousWorkRow(row, omitEmptyPeriodTo = false) {
  const mapped = {
    organisationName: row.organisationName?.trim() || '',
    industry: row.industry?.trim() || '',
    jobPosition: row.jobPosition?.trim() || row.jobTitle?.trim() || '',
    jobLevel: row.jobLevel?.trim() || '',
    jobFunction: row.jobFunction?.trim() || '',
    jobResponsibilities:
      row.jobResponsibilities?.trim() || row.responsibilities?.trim() || '',
    periodFrom: formatDateForSalesforceApi(row.periodFrom || row.startDate),
    isCurrentEmployment: false,
  };

  const periodTo = formatDateForSalesforceApi(row.periodTo || row.endDate);
  if (periodTo || !omitEmptyPeriodTo) {
    mapped.periodTo = periodTo || '';
  }

  if (row.organisationType?.trim()) mapped.organisationType = row.organisationType.trim();
  if (row.businessEmail?.trim()) mapped.businessEmail = row.businessEmail.trim();
  if (row.businessNumber?.trim()) mapped.businessNumber = row.businessNumber.trim();

  return mapped;
}

function isCompleteWorkRow(row, periodToOptional = false) {
  return (
    row.organisationName &&
    row.industry &&
    row.jobPosition &&
    row.jobLevel &&
    row.jobFunction &&
    row.jobResponsibilities &&
    row.periodFrom &&
    (row.isCurrentEmployment || row.periodTo || periodToOptional)
  );
}

export function normalizeWorkExperienceForm(workExperience) {
  const base = {
    ...EMPTY_WORK_EXPERIENCE_FORM,
    ...(workExperience && typeof workExperience === 'object' ? workExperience : {}),
  };

  if (
    Array.isArray(workExperience?.currentWorkExperience) ||
    Array.isArray(workExperience?.previousWorkExperience)
  ) {
    const status =
      workExperience.currentEmploymentStatus ||
      EMPTY_WORK_EXPERIENCE_FORM.currentEmploymentStatus;
    const currentRows = Array.isArray(workExperience.currentWorkExperience)
      ? workExperience.currentWorkExperience
      : [];

    return {
      currentEmploymentStatus: status,
      accreditedEmployerScheme:
        workExperience.accreditedEmployerScheme ||
        EMPTY_WORK_EXPERIENCE_FORM.accreditedEmployerScheme,
      currentWorkExperience: currentRows.length
        ? currentRows.map((row) => ({ ...EMPTY_CURRENT_WORK_ENTRY, ...row }))
        : requiresCurrentWorkExperience(status)
          ? [{ ...EMPTY_CURRENT_WORK_ENTRY }]
          : [],
      previousWorkExperience: seedPreviousWorkExperience(
        status,
        workExperience.previousWorkExperience
      ),
    };
  }

  if (Array.isArray(workExperience?.experiences)) {
    const currentRows = workExperience.experiences.filter((row) => row?.isCurrentEmployment);
    const previousRows = workExperience.experiences.filter((row) => !row?.isCurrentEmployment);
    const status =
      workExperience.currentEmploymentStatus ||
      EMPTY_WORK_EXPERIENCE_FORM.currentEmploymentStatus;

    return {
      currentEmploymentStatus: status,
      accreditedEmployerScheme:
        workExperience.accreditedEmployerScheme ||
        EMPTY_WORK_EXPERIENCE_FORM.accreditedEmployerScheme,
      currentWorkExperience: currentRows.length
        ? currentRows.map((row) => ({ ...EMPTY_CURRENT_WORK_ENTRY, ...row }))
        : requiresCurrentWorkExperience(status)
          ? [{ ...EMPTY_CURRENT_WORK_ENTRY }]
          : [],
      previousWorkExperience: seedPreviousWorkExperience(status, previousRows),
    };
  }

  const status = base.currentEmploymentStatus || EMPTY_WORK_EXPERIENCE_FORM.currentEmploymentStatus;
  return {
    ...base,
    currentWorkExperience: requiresCurrentWorkExperience(status)
      ? base.currentWorkExperience?.length
        ? base.currentWorkExperience
        : [{ ...EMPTY_CURRENT_WORK_ENTRY }]
      : [],
    previousWorkExperience: seedPreviousWorkExperience(status, base.previousWorkExperience),
  };
}

export function isExperiencedPeriodToOptional(pathway) {
  return isExperiencedMembershipApplicationPathway(pathway);
}

export function buildEmploymentDetailsApiPayload(workExperience, applicationId, pathway) {
  const normalized = normalizeWorkExperienceForm(workExperience);
  const requiresCurrent = requiresCurrentWorkExperience(normalized.currentEmploymentStatus);
  const periodToOptional = isExperiencedPeriodToOptional(pathway);

  const currentWorkExperience = (normalized.currentWorkExperience || [])
    .filter((row) => row && typeof row === 'object' && isWorkExperienceRowStarted(row, 'current'))
    .map(mapCurrentWorkRow)
    .filter((row) => isCompleteWorkRow(row, periodToOptional));

  const previousWorkExperience = (normalized.previousWorkExperience || [])
    .filter((row) => row && typeof row === 'object' && isWorkExperienceRowStarted(row, 'previous'))
    .map((row) => mapPreviousWorkRow(row, periodToOptional))
    .filter((row) => isCompleteWorkRow(row, periodToOptional));

  const payload = {
    applicationId: String(applicationId || '').trim(),
    currentEmploymentStatus: normalized.currentEmploymentStatus?.trim() || '',
    previousWorkExperience,
  };

  if (requiresCurrent) {
    payload.currentWorkExperience = currentWorkExperience;
    payload.accreditedEmployerScheme =
      normalized.accreditedEmployerScheme?.trim() === 'Yes' ? 'Yes' : 'No';
  }

  return payload;
}

export function seedExperiencedEmployedWorkExperience(workExperience) {
  const normalized = normalizeWorkExperienceForm(workExperience);
  if (normalized.currentEmploymentStatus !== 'Employed') {
    return normalized;
  }
  return {
    ...normalized,
    accreditedEmployerScheme: normalized.accreditedEmployerScheme || 'Yes',
    currentWorkExperience: normalized.currentWorkExperience?.length
      ? normalized.currentWorkExperience
      : [{ ...EMPTY_CURRENT_WORK_ENTRY }],
    previousWorkExperience: normalized.previousWorkExperience?.length
      ? normalized.previousWorkExperience
      : [{ ...EMPTY_PREVIOUS_WORK_ENTRY }],
  };
}

export function validateWorkExperienceBeforeSubmit(workExperience, applicationId, pathway) {
  if (!applicationId?.trim()) {
    return 'Application ID is required. Submit the Application tab first.';
  }

  const normalized = normalizeWorkExperienceForm(workExperience);
  const periodToOptional = isExperiencedPeriodToOptional(pathway);

  if (!normalized.currentEmploymentStatus?.trim()) {
    return 'Current employment status is required.';
  }

  const requiresCurrent = requiresCurrentWorkExperience(normalized.currentEmploymentStatus);
  const currentRows = normalized.currentWorkExperience || [];
  let hasValidCurrent = false;

  for (let index = 0; index < currentRows.length; index += 1) {
    const row = currentRows[index];
    const mustValidate =
      (requiresCurrent && index === 0) || isWorkExperienceRowStarted(row, 'current');
    if (!mustValidate) continue;
    if (!isCurrentRowComplete(row)) {
      return 'Please complete all required current work experience fields.';
    }
    hasValidCurrent = true;
  }

  const previousRows = normalized.previousWorkExperience || [];
  let hasValidPrevious = false;

  for (let index = 0; index < previousRows.length; index += 1) {
    const row = previousRows[index];
    if (!isWorkExperienceRowStarted(row, 'previous')) continue;
    if (!isPreviousRowComplete(row, periodToOptional)) {
      return periodToOptional
        ? 'Please complete all required previous work experience fields.'
        : 'Please complete all required previous work experience fields, including period to.';
    }
    hasValidPrevious = true;
  }

  if (requiresCurrent && !hasValidCurrent) {
    return 'Add at least one complete current work experience entry.';
  }

  if (!hasValidCurrent && !hasValidPrevious) {
    return 'Add at least one complete work experience entry.';
  }

  return '';
}
