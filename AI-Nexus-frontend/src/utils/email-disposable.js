/**
 * Shared disposable-email policy for frontend validation.
 *
 * VITE_ALLOWED_TEST_EMAIL_DOMAINS — comma-separated disposable domains allowed for testing.
 * If the env var is unset, disposable domains are accepted (not blocked).
 * If set, only listed disposable domains are allowed; other disposables stay blocked.
 */

export const DISPOSABLE_EMAIL_DOMAINS = [
  'example.com',
  'test.com',
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'yopmail.com',
  'guerrillamail.com',
];

export function parseAllowedTestEmailDomains(env = import.meta.env) {
  if (!Object.prototype.hasOwnProperty.call(env, 'VITE_ALLOWED_TEST_EMAIL_DOMAINS')) {
    return null;
  }
  return String(env.VITE_ALLOWED_TEST_EMAIL_DOMAINS || '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function shouldBlockDisposableDomain(domain, env = import.meta.env) {
  const normalized = String(domain || '').trim().toLowerCase();
  if (!normalized || !DISPOSABLE_EMAIL_DOMAINS.includes(normalized)) return false;

  const allowed = parseAllowedTestEmailDomains(env);
  if (allowed === null) return false;
  if (allowed.includes(normalized)) return false;
  return true;
}
