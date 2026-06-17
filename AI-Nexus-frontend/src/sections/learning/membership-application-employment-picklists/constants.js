// ----------------------------------------------------------------------
// CA Work Experience — Salesforce UI API picklist field API names.
// Add new picklists here when more employment fields are needed.

export const EMPLOYMENT_PICKLIST_FIELDS = {
  companyType: 'Company_Type__c',
  industry: 'Sector__c',
};

export const EMPLOYMENT_PICKLIST_CONFIG = {
  companyType: {
    field: EMPLOYMENT_PICKLIST_FIELDS.companyType,
    label: 'Organisation type',
    emptyErrorMessage: 'Organisation type options were not returned from Salesforce.',
  },
  industry: {
    field: EMPLOYMENT_PICKLIST_FIELDS.industry,
    label: 'Industry',
    emptyErrorMessage: 'Industry options were not returned from Salesforce.',
  },
};
