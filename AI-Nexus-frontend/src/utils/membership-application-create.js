// ----------------------------------------------------------------------

export const RECORD_TYPE_CA_APPLICATION = 'CA_Application';

export const ACCOUNTING_QUALIFICATION_OPTIONS = [
  'ACCA Qualification Holders',
  'Chartered Accountant Recognition Arrangement',
  'Other Professional Body Recognition',
];

export const EMPTY_APPLICATION_FORM = {
  recordTypeName: RECORD_TYPE_CA_APPLICATION,
  accountingQualification: ACCOUNTING_QUALIFICATION_OPTIONS[0],
};

export function buildCreateApplicationApiPayload(form, accountId) {
  return {
    accountId: String(accountId || '').trim(),
    recordTypeName: form.recordTypeName?.trim() || RECORD_TYPE_CA_APPLICATION,
    accountingQualification: form.accountingQualification?.trim() || '',
  };
}

export function validateApplicationBeforeSubmit(form, accountId, existingApplicationId) {
  if (!accountId?.trim()) {
    return 'Salesforce account is not linked. Please sign in with Eservices again.';
  }
  if (existingApplicationId?.trim()) {
    return 'Application already created. Continue to the Personal tab.';
  }
  if (!form.accountingQualification?.trim()) {
    return 'Accounting qualification is required.';
  }
  if (!form.recordTypeName?.trim()) {
    return 'Record type is required.';
  }
  return '';
}
