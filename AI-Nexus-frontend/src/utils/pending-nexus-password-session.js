// ----------------------------------------------------------------------
// Incomplete Salesforce create → set-password handoff
// After createuserfornexus / corporateaccandconcreation, Apex may temporarily
// replace the user email with a test address until setpasswordfornexus runs.
// Persist the pending username so Back / refresh / remount can resume Step 2.
// ----------------------------------------------------------------------

export const PENDING_NEXUS_PASSWORD_KEY = 'pendingNexusPasswordSetup';

/** @typedef {{
 *   username: string,
 *   email: string,
 *   registerForm?: {
 *     salutation?: string,
 *     firstName?: string,
 *     lastName?: string,
 *     nameAsPerId?: string,
 *     email?: string,
 *   },
 *   designation?: string,
 *   source?: string,
 *   createdAt: string,
 * }} PendingNexusPasswordSetup */

/**
 * @returns {PendingNexusPasswordSetup | null}
 */
export function readPendingNexusPasswordSetup() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING_NEXUS_PASSWORD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const username = String(parsed.username || '').trim();
    const email = String(parsed.email || '').trim().toLowerCase();
    if (!username || !email) return null;
    return {
      username,
      email,
      registerForm:
        parsed.registerForm && typeof parsed.registerForm === 'object'
          ? parsed.registerForm
          : undefined,
      designation: String(parsed.designation || '').trim() || undefined,
      source: String(parsed.source || '').trim() || undefined,
      createdAt: String(parsed.createdAt || ''),
    };
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   username: string,
 *   email: string,
 *   registerForm?: object,
 *   designation?: string,
 *   source?: string,
 * }} payload
 */
export function writePendingNexusPasswordSetup(payload) {
  if (typeof window === 'undefined') return false;
  const username = String(payload?.username || '').trim();
  const email = String(payload?.email || '').trim().toLowerCase();
  if (!username || !email) return false;

  const record = {
    username,
    email,
    ...(payload?.registerForm && typeof payload.registerForm === 'object'
      ? {
          registerForm: {
            salutation: String(payload.registerForm.salutation || '').trim(),
            firstName: String(payload.registerForm.firstName || '').trim(),
            lastName: String(payload.registerForm.lastName || '').trim(),
            nameAsPerId: String(payload.registerForm.nameAsPerId || '').trim(),
            email: String(payload.registerForm.email || email).trim(),
          },
        }
      : {}),
    ...(payload?.designation
      ? { designation: String(payload.designation).trim() }
      : {}),
    ...(payload?.source ? { source: String(payload.source).trim() } : {}),
    createdAt: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(PENDING_NEXUS_PASSWORD_KEY, JSON.stringify(record));
    // Keep legacy key in sync for simple signup paths that already read it.
    sessionStorage.setItem('salesforceNexusUsername', username);
    return true;
  } catch {
    return false;
  }
}

export function clearPendingNexusPasswordSetup() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_NEXUS_PASSWORD_KEY);
  } catch {
    // ignore
  }
}

/**
 * @param {string} email
 * @returns {PendingNexusPasswordSetup | null}
 */
export function readPendingNexusPasswordSetupForEmail(email) {
  const pending = readPendingNexusPasswordSetup();
  if (!pending) return null;
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || pending.email !== normalized) return null;
  return pending;
}
