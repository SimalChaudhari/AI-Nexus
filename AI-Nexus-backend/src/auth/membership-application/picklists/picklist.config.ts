// ----------------------------------------------------------------------
// Salesforce UI API picklist definitions for membership application forms.

export const MEMBERSHIP_PICKLIST_OBJECTS = {
  employmentDetail: 'Application_Employment_Detail__c',
  application: 'Application__c',
  characterReference: 'Application_Character_References__c',
  document: 'Documents__c',
  qualificationDetail: 'Application_Qualification_Detail__c',
} as const;

export const MEMBERSHIP_PICKLIST_RECORD_TYPES = {
  employmentDetail:
    process.env.OAUTH_EMPLOYMENT_PICKLIST_RECORD_TYPE_ID?.trim()
    || process.env.OAUTH_EMPLOYMENT_COMPANY_TYPE_RECORD_TYPE_ID?.trim()
    || '0120K000000nhJ4QAI',
  application:
    process.env.OAUTH_APPLICATION_PICKLIST_RECORD_TYPE_ID?.trim() || '0120K000000nhJ6QAI',
  applicationPersonal:
    process.env.OAUTH_APPLICATION_PERSONAL_PICKLIST_RECORD_TYPE_ID?.trim()
    || '01228000000knwQAAQ',
  characterReference:
    process.env.OAUTH_CHARACTER_REFERENCE_PICKLIST_RECORD_TYPE_ID?.trim()
    || '01228000000knyBAAQ',
  document:
    process.env.OAUTH_DOCUMENT_PICKLIST_RECORD_TYPE_ID?.trim() || '01228000000knyVAAQ',
  qualificationDetail:
    process.env.OAUTH_QUALIFICATION_PICKLIST_RECORD_TYPE_ID?.trim()
    || '01228000000knwHAAQ',
} as const;

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
} as const;

export type MembershipPicklistKey =
  (typeof MEMBERSHIP_PICKLIST_KEYS)[keyof typeof MEMBERSHIP_PICKLIST_KEYS];

export const MEMBERSHIP_PICKLIST_KEY_VALUES = Object.values(
  MEMBERSHIP_PICKLIST_KEYS,
) as MembershipPicklistKey[];

export interface MembershipPicklistDefinition {
  objectName: string;
  recordTypeId: string;
  field: string;
  emptyMessage: string;
  failureMessage: string;
}

export const MEMBERSHIP_PICKLIST_DEFINITIONS: Record<
  MembershipPicklistKey,
  MembershipPicklistDefinition
> = {
  [MEMBERSHIP_PICKLIST_KEYS.companyType]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.employmentDetail,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.employmentDetail,
    field: 'Company_Type__c',
    emptyMessage: 'Organisation type options were not returned from Salesforce.',
    failureMessage: 'Failed to load organisation type options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.industry]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.employmentDetail,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.employmentDetail,
    field: 'Sector__c',
    emptyMessage: 'Industry options were not returned from Salesforce.',
    failureMessage: 'Failed to load industry options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.jobLevel]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.employmentDetail,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.employmentDetail,
    field: 'Job_Level__c',
    emptyMessage: 'Job level options were not returned from Salesforce.',
    failureMessage: 'Failed to load job level options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.jobFunction]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.employmentDetail,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.employmentDetail,
    field: 'Job_Function__c',
    emptyMessage: 'Job function options were not returned from Salesforce.',
    failureMessage: 'Failed to load job function options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.accountingQualification]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.application,
    field: 'Accounting_Qualification__c',
    emptyMessage: 'Accounting qualification options were not returned from Salesforce.',
    failureMessage: 'Failed to load accounting qualification options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.citizenship]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.application,
    field: 'Citizenship__c',
    emptyMessage: 'Citizenship options were not returned from Salesforce.',
    failureMessage: 'Failed to load citizenship options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.cpeComplianceDeclaration]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.application,
    field: 'CPE_Compliance_Declaration__c',
    emptyMessage: 'CPE compliance declaration options were not returned from Salesforce.',
    failureMessage: 'Failed to load CPE compliance declaration options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.currentEmploymentStatus]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.application,
    field: 'Current_Employment_Status__c',
    emptyMessage: 'Current employment status options were not returned from Salesforce.',
    failureMessage: 'Failed to load current employment status options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.employmentDetailStatus]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.employmentDetail,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.employmentDetail,
    field: 'Status__c',
    emptyMessage: 'Employment status options were not returned from Salesforce.',
    failureMessage: 'Failed to load employment status options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.idType]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.application,
    field: 'ID_Type__c',
    emptyMessage: 'ID type options were not returned from Salesforce.',
    failureMessage: 'Failed to load ID type options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.gender]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.applicationPersonal,
    field: 'Gender__c',
    emptyMessage: 'Gender options were not returned from Salesforce.',
    failureMessage: 'Failed to load gender options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.nationality]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.applicationPersonal,
    field: 'Nationality__c',
    emptyMessage: 'Nationality options were not returned from Salesforce.',
    failureMessage: 'Failed to load nationality options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.maritalStatus]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.applicationPersonal,
    field: 'Marital_Status__c',
    emptyMessage: 'Marital status options were not returned from Salesforce.',
    failureMessage: 'Failed to load marital status options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.professionalInterest]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.applicationPersonal,
    field: 'Domain_Knowledge_of_Interest__c',
    emptyMessage: 'Professional interest options were not returned from Salesforce.',
    failureMessage: 'Failed to load professional interest options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.subscriptionPreference]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.applicationPersonal,
    field: 'Subscription_Preference__c',
    emptyMessage: 'Subscription preference options were not returned from Salesforce.',
    failureMessage: 'Failed to load subscription preference options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.communicationPreference]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.applicationPersonal,
    field: 'Communication_Preference__c',
    emptyMessage: 'Communication preference options were not returned from Salesforce.',
    failureMessage: 'Failed to load communication preference options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.textMessages]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.applicationPersonal,
    field: 'Text_Messages__c',
    emptyMessage: 'Text message consent options were not returned from Salesforce.',
    failureMessage: 'Failed to load text message consent options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.voiceCalls]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.applicationPersonal,
    field: 'Voice_Calls__c',
    emptyMessage: 'Voice call consent options were not returned from Salesforce.',
    failureMessage: 'Failed to load voice call consent options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.faxMessages]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.applicationPersonal,
    field: 'Fax_Messages__c',
    emptyMessage: 'Fax message consent options were not returned from Salesforce.',
    failureMessage: 'Failed to load fax message consent options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.characterReferenceType]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.characterReference,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.characterReference,
    field: 'Character_Reference_Type__c',
    emptyMessage: 'Character reference type options were not returned from Salesforce.',
    failureMessage: 'Failed to load character reference type options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.residentialDeclaration]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.application,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.applicationPersonal,
    field: 'Residential_declaration__c',
    emptyMessage: 'Residential declaration options were not returned from Salesforce.',
    failureMessage: 'Failed to load residential declaration options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.documentType]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.document,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.document,
    field: 'Type_of_Document__c',
    emptyMessage: 'Document type options were not returned from Salesforce.',
    failureMessage: 'Failed to load document type options from Salesforce.',
  },
  [MEMBERSHIP_PICKLIST_KEYS.qualificationMembershipStatus]: {
    objectName: MEMBERSHIP_PICKLIST_OBJECTS.qualificationDetail,
    recordTypeId: MEMBERSHIP_PICKLIST_RECORD_TYPES.qualificationDetail,
    field: 'Membership_Status__c',
    emptyMessage: 'Qualification membership status options were not returned from Salesforce.',
    failureMessage: 'Failed to load qualification membership status options from Salesforce.',
  },
};

/** @deprecated Use MEMBERSHIP_PICKLIST_DEFINITIONS */
export const MEMBERSHIP_EMPLOYMENT_PICKLIST_FIELDS = {
  companyType: MEMBERSHIP_PICKLIST_DEFINITIONS.companyType.field,
  industry: MEMBERSHIP_PICKLIST_DEFINITIONS.industry.field,
} as const;

export function getMembershipPicklistApiVersion(): string {
  return process.env.OAUTH_SALESFORCE_UI_API_VERSION?.trim() || 'v58.0';
}

export function getMembershipPicklistDefinition(
  picklistKey: MembershipPicklistKey,
): MembershipPicklistDefinition {
  return MEMBERSHIP_PICKLIST_DEFINITIONS[picklistKey];
}
