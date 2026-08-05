/**
 * Shared disposable-email policy for backend validation.
 *
 * ALLOWED_TEST_EMAIL_DOMAINS — comma-separated disposable domains allowed for testing.
 * If the env var is unset, disposable domains are accepted (not blocked).
 * If set, only listed disposable domains are allowed; other disposables stay blocked.
 */

export const DISPOSABLE_EMAIL_DOMAINS = [
  'example.com',
  'test.com',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'yopmail.com',
] as const;

const DISPOSABLE_DOMAIN_SET = new Set<string>(DISPOSABLE_EMAIL_DOMAINS);

export function parseAllowedTestEmailDomains(
  env: NodeJS.ProcessEnv = process.env,
): string[] | null {
  if (!Object.prototype.hasOwnProperty.call(env, 'ALLOWED_TEST_EMAIL_DOMAINS')) {
    return null;
  }
  return String(env.ALLOWED_TEST_EMAIL_DOMAINS || '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function shouldBlockDisposableDomain(
  domain: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const normalized = String(domain || '').trim().toLowerCase();
  if (!normalized || !DISPOSABLE_DOMAIN_SET.has(normalized)) return false;

  const allowed = parseAllowedTestEmailDomains(env);
  // Flag not present in env → accept disposable domains.
  if (allowed === null) return false;
  // Domain explicitly allow-listed → accept.
  if (allowed.includes(normalized)) return false;
  return true;
}
