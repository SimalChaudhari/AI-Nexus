import { checkSalesforceUserByEmail } from 'src/auth/context/jwt';

export const SALESFORCE_EMAIL_EXISTS_MESSAGE =
  'An eServices account already exists for this email address. Please sign in instead of creating a new account.';

/**
 * Blocks individual membership / fee-waiver signup when email is already used in eServices.
 * Uses usercheckforemail only — not the corporate account API.
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
