import {
  RECORD_TYPE_EXPERIENCED_APPLICATION,
  isExperiencedMembershipApplicationPathway,
  readMembershipApplicationPathway,
} from 'src/utils/membership-application-pathway';

// ----------------------------------------------------------------------

export const RECORD_TYPE_CA_APPLICATION = 'CA_Application';

export const ACCOUNTING_QUALIFICATION_OPTIONS = [
  'ACCA Qualification Holders',
  'Chartered Accountant Recognition Arrangement',
  'Other Professional Body Recognition',
];

export const EMPTY_CA_APPLICATION_FORM = {
  recordTypeName: RECORD_TYPE_CA_APPLICATION,
  accountingQualification: ACCOUNTING_QUALIFICATION_OPTIONS[0],
  experiencedMemberType: '',
};

export const EMPTY_EXPERIENCED_APPLICATION_FORM = {
  recordTypeName: RECORD_TYPE_EXPERIENCED_APPLICATION,
  accountingQualification: '',
  experiencedMemberType: '',
};

/** @deprecated Use getEmptyApplicationForm(pathway) */
export const EMPTY_APPLICATION_FORM = { ...EMPTY_CA_APPLICATION_FORM };

export function getEmptyApplicationForm(pathway = readMembershipApplicationPathway()) {
  return isExperiencedMembershipApplicationPathway(pathway)
    ? { ...EMPTY_EXPERIENCED_APPLICATION_FORM }
    : { ...EMPTY_CA_APPLICATION_FORM };
}

export function buildCreateApplicationApiPayload(
  form,
  accountId,
  pathway = readMembershipApplicationPathway()
) {
  if (isExperiencedMembershipApplicationPathway(pathway)) {
    return {
      accountId: String(accountId || '').trim(),
      recordTypeName: RECORD_TYPE_EXPERIENCED_APPLICATION,
    };
  }

  return {
    accountId: String(accountId || '').trim(),
    recordTypeName: form.recordTypeName?.trim() || RECORD_TYPE_CA_APPLICATION,
    accountingQualification: form.accountingQualification?.trim() || '',
  };
}

export function validateApplicationBeforeSubmit(
  form,
  accountId,
  existingApplicationId,
  pathway = readMembershipApplicationPathway()
) {
  if (!accountId?.trim()) {
    return 'Salesforce account is not linked. Please sign in with Eservices again.';
  }
  if (existingApplicationId?.trim()) {
    return '';
  }
  if (!form.recordTypeName?.trim()) {
    return 'Record type is required.';
  }

  if (isExperiencedMembershipApplicationPathway(pathway)) {
    return '';
  }

  if (!form.accountingQualification?.trim()) {
    return 'Accounting qualification is required.';
  }
  return '';
}
