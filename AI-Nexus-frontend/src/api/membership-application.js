import axios from 'src/utils/axios';
import { handleMembershipSalesforceAuthError } from 'src/utils/membership-salesforce-auth';

// ----------------------------------------------------------------------

async function callMembershipApplicationApi(request) {
  try {
    return await request();
  } catch (error) {
    if (handleMembershipSalesforceAuthError(error)) {
      const redirectError = new Error(
        'Your eServices session has expired. Redirecting to sign in…'
      );
      redirectError.code = 'SALESFORCE_SOCIAL_TOKEN_EXPIRED';
      throw redirectError;
    }
    throw error;
  }
}

/** Create application record → Salesforce createApplicationNexus (before Personal tab) */
export async function submitCreateApplication(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/create-application', payload);
    return res.data;
  });
}

/** Submit Personal tab → Salesforce createApplicationPersonalDetailsNexus */
export async function submitMembershipApplicationPersonalDetails(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/personal-details', payload);
    return res.data;
  });
}

/** Submit Work Experience tab → Salesforce createEmploymentDetailsNexus */
export async function submitMembershipApplicationEmploymentDetails(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/employment-details', payload);
    return res.data;
  });
}

/** Load Salesforce picklist values for membership application forms. */
export async function fetchMembershipPicklistOptions(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/picklist-options', payload);
    return res.data;
  });
}

/** Load employment organisation names from Salesforce ApplicationAPI. */
export async function fetchOrganisationNameOptions(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/organisation-name-options', payload);
    return res.data;
  });
}

/** Load character reference accountancy body names from Salesforce ApplicationAPI. */
export async function fetchAccountancyBodyNameOptions(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/accountancy-body-name-options', payload);
    return res.data;
  });
}

/** @deprecated Use fetchMembershipPicklistOptions */
export async function fetchEmploymentPicklistOptions(payload) {
  if (payload?.picklistKey) {
    return fetchMembershipPicklistOptions(payload);
  }
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/employment-picklist-options', payload);
    return res.data;
  });
}

/** @deprecated Use fetchEmploymentPicklistOptions */
export async function fetchEmploymentCompanyTypeOptions(payload) {
  return fetchEmploymentPicklistOptions({
    ...payload,
    field: payload?.field || 'Company_Type__c',
  });
}

export async function submitAcademicQualification(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/academic-qualification', payload);
    return res.data;
  });
}

export async function submitProfessionalQualification(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post(
      '/auth/membership-application/professional-qualification',
      payload
    );
    return res.data;
  });
}

/** CA pathway — Salesforce ApplicationAPI createATONexus ({ applicationId, atoName }). */
export async function submitAtoMembership(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/ato-membership', payload);
    return res.data;
  });
}

export async function submitOpbMembership(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/opb-membership', payload);
    return res.data;
  });
}

export async function submitCharacterReference(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/character-reference', payload);
    return res.data;
  });
}

export async function submitDeclaration(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/declaration', payload);
    return res.data;
  });
}

/** Load pathway-specific document types for Document Upload tab */
export async function fetchAvailableDocumentTypes(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/available-document-types', payload);
    return res.data;
  });
}

/** Upload one supporting document (base64) → Salesforce uploadDocumentNexus */
export async function submitMembershipDocumentUpload(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/upload-document', payload);
    return res.data;
  });
}

/** Submit Residential Declaration tab → Salesforce createResidentialDeclarationNexus */
export async function submitResidentialDeclaration(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/residential-declaration', payload);
    return res.data;
  });
}

/** Load checkout / payment summary for billing tab (getCheckoutDetailsForNexus) */
export async function fetchMembershipCheckoutDetails(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/checkout-details', payload);
    return res.data;
  });
}

/** Submit billing after WooshPay → Salesforce createBillingNexus */
export async function submitMembershipApplicationBilling(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/billing', payload);
    return res.data;
  });
}

/** Load Salesforce userinfonexus for membership application (memberClass, isCaMember). */
export async function fetchMembershipApplicationUserInfo(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/user-info', payload);
    return res.data;
  });
}

/** When memberClass is CA, sync user and return platform access token. */
export async function loginMembershipApplicationIfCa(payload) {
  return callMembershipApplicationApi(async () => {
    const res = await axios.post('/auth/membership-application/ca-login', payload);
    return res.data;
  });
}
