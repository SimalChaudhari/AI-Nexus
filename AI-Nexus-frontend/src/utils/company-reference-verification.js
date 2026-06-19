/** Interim company reference ID accepted for verification (matches eligibility questionnaire). */
export const VERIFIED_COMPANY_REFERENCE_ID = '123456';

/**
 * Verify a numeric company reference / verification code.
 * @param {string} referenceId
 * @returns {{ verified: boolean, companyName?: string, industry?: string }}
 */
export function verifyCompanyReferenceId(referenceId) {
  const id = String(referenceId || '').trim();
  if (!/^\d+$/.test(id)) {
    return { verified: false };
  }
  if (id === VERIFIED_COMPANY_REFERENCE_ID) {
    return {
      verified: true,
      companyName: 'Corporate account (123456)',
      industry: 'To be confirmed',
    };
  }
  return { verified: false };
}
