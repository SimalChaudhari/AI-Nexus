import {
  checkSalesforceUserByEmail,
  checkCorporateSalesforceAccount,
} from 'src/auth/context/jwt';

export const SALESFORCE_EMAIL_EXISTS_MESSAGE =
  'An eServices account already exists for this email address. Please sign in instead of creating a new account.';

export const SALESFORCE_CORPORATE_EMAIL_MESSAGE =
  'This email address is already associated with a corporate account. Please use a different email for individual membership, or sign in via the Organisation Portal.';

function isCorporateEmailConflictPayload(result) {
  const nested =
    result?.data && typeof result.data === 'object' ? result.data : result || {};
  return Boolean(
    (nested.corporateAccountExists && nested.contactExists) || nested.exactMatch === true,
  );
}

/**
 * Blocks individual membership signup when email is already used in eServices
 * (individual or corporate). Call this before payment.
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export async function assertSalesforceEmailAvailable(email) {
  const trimmed = String(email || '').trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) {
    return {
      ok: false,
      message: 'Please enter a valid email address.',
    };
  }

  try {
    // Corporate contact emails are often missed by usercheckforemail — check first.
    try {
      const corporateCheck = await checkCorporateSalesforceAccount({ email: trimmed });
      if (isCorporateEmailConflictPayload(corporateCheck)) {
        return { ok: false, message: SALESFORCE_CORPORATE_EMAIL_MESSAGE };
      }
    } catch (corpErr) {
      const corpMsg = String(corpErr?.message || '').toLowerCase();
      if (corpMsg.includes('corporate') && corpMsg.includes('email')) {
        return {
          ok: false,
          message: String(corpErr.message || SALESFORCE_CORPORATE_EMAIL_MESSAGE),
        };
      }
      // Non-fatal: continue to individual email check if corporate API fails.
    }

    const result = await checkSalesforceUserByEmail(trimmed);
    if (result?.found) {
      return { ok: false, message: SALESFORCE_EMAIL_EXISTS_MESSAGE };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message:
        String(err?.message || '').trim()
        || 'Could not verify email with eServices. Please try again.',
    };
  }
}
