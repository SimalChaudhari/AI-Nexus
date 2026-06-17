// ----------------------------------------------------------------------
// CA Work Experience — Salesforce UI API picklist configuration.

export const MEMBERSHIP_EMPLOYMENT_PICKLIST_FIELDS = {
  companyType: 'Company_Type__c',
  industry: 'Sector__c',
} as const;

export type MembershipEmploymentPicklistField =
  (typeof MEMBERSHIP_EMPLOYMENT_PICKLIST_FIELDS)[keyof typeof MEMBERSHIP_EMPLOYMENT_PICKLIST_FIELDS];

export const MEMBERSHIP_EMPLOYMENT_PICKLIST_FIELD_VALUES = Object.values(
  MEMBERSHIP_EMPLOYMENT_PICKLIST_FIELDS,
) as MembershipEmploymentPicklistField[];

export const MEMBERSHIP_EMPLOYMENT_PICKLIST_MESSAGES: Record<
  MembershipEmploymentPicklistField,
  { emptyMessage: string; failureMessage: string }
> = {
  [MEMBERSHIP_EMPLOYMENT_PICKLIST_FIELDS.companyType]: {
    emptyMessage: 'Organisation type options were not returned from Salesforce.',
    failureMessage: 'Failed to load organisation type options from Salesforce.',
  },
  [MEMBERSHIP_EMPLOYMENT_PICKLIST_FIELDS.industry]: {
    emptyMessage: 'Industry options were not returned from Salesforce.',
    failureMessage: 'Failed to load industry options from Salesforce.',
  },
};

export function getMembershipEmploymentPicklistRecordTypeId(): string {
  return (
    process.env.OAUTH_EMPLOYMENT_PICKLIST_RECORD_TYPE_ID?.trim()
    || process.env.OAUTH_EMPLOYMENT_COMPANY_TYPE_RECORD_TYPE_ID?.trim()
    || '0120K000000nhJ4QAI'
  );
}

export function getMembershipEmploymentPicklistObjectName(): string {
  return process.env.OAUTH_EMPLOYMENT_DETAIL_OBJECT?.trim() || 'Application_Employment_Detail__c';
}

export function getMembershipEmploymentPicklistApiVersion(): string {
  return process.env.OAUTH_SALESFORCE_UI_API_VERSION?.trim() || 'v58.0';
}
