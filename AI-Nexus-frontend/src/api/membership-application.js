import axios from 'src/utils/axios';

/** Create application record → Salesforce createApplicationNexus (before Personal tab) */
export async function submitCreateApplication(payload) {
  const res = await axios.post('/auth/membership-application/create-application', payload);
  return res.data;
}

/** Submit Personal tab → Salesforce createApplicationPersonalDetailsNexus */
export async function submitMembershipApplicationPersonalDetails(payload) {
  const res = await axios.post('/auth/membership-application/personal-details', payload);
  return res.data;
}

/** Submit Work Experience tab → Salesforce createEmploymentDetailsNexus */
export async function submitMembershipApplicationEmploymentDetails(payload) {
  const res = await axios.post('/auth/membership-application/employment-details', payload);
  return res.data;
}

export async function submitAcademicQualification(payload) {
  const res = await axios.post('/auth/membership-application/academic-qualification', payload);
  return res.data;
}

export async function submitProfessionalQualification(payload) {
  const res = await axios.post('/auth/membership-application/professional-qualification', payload);
  return res.data;
}

export async function submitAtoMembership(payload) {
  const res = await axios.post('/auth/membership-application/ato-membership', payload);
  return res.data;
}

export async function submitCharacterReference(payload) {
  const res = await axios.post('/auth/membership-application/character-reference', payload);
  return res.data;
}

export async function submitDeclaration(payload) {
  const res = await axios.post('/auth/membership-application/declaration', payload);
  return res.data;
}

/** Load pathway-specific document types for Document Upload tab */
export async function fetchAvailableDocumentTypes(payload) {
  const res = await axios.post('/auth/membership-application/available-document-types', payload);
  return res.data;
}

/** Upload one supporting document (base64) → Salesforce uploadDocumentNexus */
export async function submitMembershipDocumentUpload(payload) {
  const res = await axios.post('/auth/membership-application/upload-document', payload);
  return res.data;
}

/** Submit billing after WooshPay → Salesforce createBillingNexus */
export async function submitMembershipApplicationBilling(payload) {
  const res = await axios.post('/auth/membership-application/billing', payload);
  return res.data;
}
