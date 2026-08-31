import axios from 'src/utils/axios';

/**
 * Verify a company reference ID against Corporate HR companyCode on the backend.
 * @param {string} referenceId
 * @returns {Promise<{ verified: boolean, companyName?: string, industry?: string, companyCode?: string }>}
 */
export async function verifyCompanyReferenceId(referenceId) {
  const res = await axios.post('/auth/verify-company-reference', {
    companyReferenceId: String(referenceId || '').trim(),
  });
  return {
    verified: res?.data?.verified === true,
    companyName: res?.data?.name,
    industry: res?.data?.industry,
    companyCode: res?.data?.companyCode,
  };
}
