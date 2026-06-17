// ----------------------------------------------------------------------
// Salesforce UI API picklist keys for membership application forms.

export const MEMBERSHIP_PICKLIST_KEYS = {
  companyType: 'companyType',
  industry: 'industry',
  jobLevel: 'jobLevel',
  jobFunction: 'jobFunction',
  employmentDetailStatus: 'employmentDetailStatus',
  accountingQualification: 'accountingQualification',
  citizenship: 'citizenship',
  cpeComplianceDeclaration: 'cpeComplianceDeclaration',
  currentEmploymentStatus: 'currentEmploymentStatus',
  idType: 'idType',
  gender: 'gender',
  nationality: 'nationality',
  maritalStatus: 'maritalStatus',
  professionalInterest: 'professionalInterest',
  subscriptionPreference: 'subscriptionPreference',
  communicationPreference: 'communicationPreference',
  textMessages: 'textMessages',
  voiceCalls: 'voiceCalls',
  faxMessages: 'faxMessages',
  characterReferenceType: 'characterReferenceType',
  residentialDeclaration: 'residentialDeclaration',
  documentType: 'documentType',
  qualificationMembershipStatus: 'qualificationMembershipStatus',
};

export const MEMBERSHIP_PICKLIST_CONFIG = {
  companyType: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.companyType,
    label: 'Organisation type',
    emptyErrorMessage: 'Organisation type options were not returned from Salesforce.',
  },
  industry: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.industry,
    label: 'Industry',
    emptyErrorMessage: 'Industry options were not returned from Salesforce.',
  },
  jobLevel: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.jobLevel,
    label: 'Job level',
    emptyErrorMessage: 'Job level options were not returned from Salesforce.',
  },
  jobFunction: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.jobFunction,
    label: 'Job function',
    emptyErrorMessage: 'Job function options were not returned from Salesforce.',
  },
  accountingQualification: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.accountingQualification,
    label: 'Accounting qualification',
    emptyErrorMessage: 'Accounting qualification options were not returned from Salesforce.',
  },
  citizenship: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.citizenship,
    label: 'Citizenship',
    emptyErrorMessage: 'Citizenship options were not returned from Salesforce.',
  },
  cpeComplianceDeclaration: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.cpeComplianceDeclaration,
    label: 'CPE compliance declaration',
    emptyErrorMessage: 'CPE compliance declaration options were not returned from Salesforce.',
  },
  currentEmploymentStatus: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.currentEmploymentStatus,
    label: 'Current employment status',
    emptyErrorMessage: 'Current employment status options were not returned from Salesforce.',
  },
  idType: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.idType,
    label: 'ID type',
    emptyErrorMessage: 'ID type options were not returned from Salesforce.',
  },
  gender: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.gender,
    label: 'Gender',
    emptyErrorMessage: 'Gender options were not returned from Salesforce.',
  },
  nationality: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.nationality,
    label: 'Nationality',
    emptyErrorMessage: 'Nationality options were not returned from Salesforce.',
  },
  maritalStatus: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.maritalStatus,
    label: 'Marital status',
    emptyErrorMessage: 'Marital status options were not returned from Salesforce.',
  },
  professionalInterest: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.professionalInterest,
    label: 'Professional interest',
    emptyErrorMessage: 'Professional interest options were not returned from Salesforce.',
  },
  subscriptionPreference: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.subscriptionPreference,
    label: 'Subscription preference',
    emptyErrorMessage: 'Subscription preference options were not returned from Salesforce.',
  },
  communicationPreference: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.communicationPreference,
    label: 'Communication preference',
    emptyErrorMessage: 'Communication preference options were not returned from Salesforce.',
  },
  textMessages: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.textMessages,
    label: 'Text messages',
    emptyErrorMessage: 'Text message consent options were not returned from Salesforce.',
  },
  voiceCalls: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.voiceCalls,
    label: 'Voice calls',
    emptyErrorMessage: 'Voice call consent options were not returned from Salesforce.',
  },
  faxMessages: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.faxMessages,
    label: 'Fax messages',
    emptyErrorMessage: 'Fax message consent options were not returned from Salesforce.',
  },
  characterReferenceType: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.characterReferenceType,
    label: 'Reference type',
    emptyErrorMessage: 'Character reference type options were not returned from Salesforce.',
  },
  residentialDeclaration: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.residentialDeclaration,
    label: 'Residential declaration',
    emptyErrorMessage: 'Residential declaration options were not returned from Salesforce.',
  },
  documentType: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.documentType,
    label: 'Document type',
    emptyErrorMessage: 'Document type options were not returned from Salesforce.',
  },
  qualificationMembershipStatus: {
    picklistKey: MEMBERSHIP_PICKLIST_KEYS.qualificationMembershipStatus,
    label: 'Membership status',
    emptyErrorMessage: 'Qualification membership status options were not returned from Salesforce.',
  },
};

/** @deprecated Use MEMBERSHIP_PICKLIST_KEYS */
export const EMPLOYMENT_PICKLIST_FIELDS = {
  companyType: 'Company_Type__c',
  industry: 'Sector__c',
};

/** @deprecated Use MEMBERSHIP_PICKLIST_CONFIG */
export const EMPLOYMENT_PICKLIST_CONFIG = {
  companyType: MEMBERSHIP_PICKLIST_CONFIG.companyType,
  industry: MEMBERSHIP_PICKLIST_CONFIG.industry,
};
