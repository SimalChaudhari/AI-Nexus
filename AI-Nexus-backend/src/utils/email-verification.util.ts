import { resolveMx } from 'dns/promises';

const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)([a-z0-9._%+-]{1,64})@([a-z0-9-]+\.)+[a-z]{2,}$/i;

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'example.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'test.com',
  // 'yopmail.com', // Temporarily allowed. Re-enable to block later.
]);

const mxCache = new Map<string, boolean>();

export type EmailVerificationResult = {
  isValid: boolean;
  reason?: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function hasValidFormat(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function getDomain(email: string): string {
  return email.split('@')[1] || '';
}

async function domainHasMxRecord(domain: string): Promise<boolean> {
  if (!domain) return false;
  if (mxCache.has(domain)) return Boolean(mxCache.get(domain));

  try {
    const records = await resolveMx(domain);
    const hasMx = Array.isArray(records) && records.length > 0;
    mxCache.set(domain, hasMx);
    return hasMx;
  } catch {
    mxCache.set(domain, false);
    return false;
  }
}

export async function verifyEmailAddress(email: string): Promise<EmailVerificationResult> {
  const normalized = normalizeEmail(email || '');
  if (!normalized) {
    return { isValid: false, reason: 'Email is required.' };
  }

  if (!hasValidFormat(normalized)) {
    return { isValid: false, reason: 'Email format is invalid.' };
  }

  const domain = getDomain(normalized);
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { isValid: false, reason: 'Disposable email domains are not allowed.' };
  }

  const hasMx = await domainHasMxRecord(domain);
  if (!hasMx) {
    return { isValid: false, reason: 'Email domain is not configured to receive emails.' };
  }

  return { isValid: true };
}

