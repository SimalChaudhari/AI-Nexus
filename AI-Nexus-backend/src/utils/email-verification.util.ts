import { resolve4, resolveMx } from 'dns/promises';

const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)([a-z0-9._%+-]{1,64})@([a-z0-9-]+\.)+[a-z]{2,}$/i;

/** Known disposable / temporary inbox providers — not accepted for official correspondence. */
/** ISCA and programme operator domains — always accepted when format is valid. */
export const TRUSTED_ORGANIZATION_EMAIL_DOMAINS = new Set([
  'isca.org.sg',
  'ainexus.isca.org.sg',
]);

/** Supported student / academic school email domain suffixes (Singapore institutions + testing). */
export const STUDENT_SCHOOL_EMAIL_DOMAIN_SUFFIXES = [
  'nus.edu',
  'ntu.edu.sg',
  'smu.edu.sg',
  'sit.singaporetech.edu.sg',
  'sp.edu.sg',
  'np.edu.sg',
  'nyp.edu.sg',
  'tp.edu.sg',
  'rp.edu.sg',
  'isca.org.sg',
];

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  // yopmail.com temporarily allowed for testing
]);

const mxCache = new Map<string, boolean>();
const mailDomainCache = new Map<string, boolean>();

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

export function isTrustedOrganizationEmailDomain(domain: string): boolean {
  const normalized = String(domain || '').trim().toLowerCase();
  if (!normalized) return false;
  if (TRUSTED_ORGANIZATION_EMAIL_DOMAINS.has(normalized)) return true;
  return normalized.endsWith('.isca.org.sg');
}

export function isAllowedStudentSchoolEmail(email: string): boolean {
  const normalized = normalizeEmail(email || '');
  if (!normalized || !hasValidFormat(normalized)) return false;

  const domain = getDomain(normalized);
  if (normalized.endsWith('.edu')) return true;
  if (isTrustedOrganizationEmailDomain(domain)) return true;

  return STUDENT_SCHOOL_EMAIL_DOMAIN_SUFFIXES.some(
    (suffix) => normalized.endsWith(`@${suffix}`) || domain === suffix,
  );
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

/** Whether the domain is configured to receive email (MX preferred; A record fallback per RFC 5321). */
async function domainAcceptsMail(domain: string): Promise<boolean> {
  if (!domain) return false;
  if (mailDomainCache.has(domain)) return Boolean(mailDomainCache.get(domain));

  if (await domainHasMxRecord(domain)) {
    mailDomainCache.set(domain, true);
    return true;
  }

  try {
    const records = await resolve4(domain);
    const accepts = Array.isArray(records) && records.length > 0;
    mailDomainCache.set(domain, accepts);
    return accepts;
  } catch {
    mailDomainCache.set(domain, false);
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

  if (isTrustedOrganizationEmailDomain(domain)) {
    return { isValid: true };
  }

  const acceptsMail = await domainAcceptsMail(domain);
  if (!acceptsMail) {
    return { isValid: false, reason: 'Email domain is not configured to receive emails.' };
  }

  return { isValid: true };
}

/**
 * HR / employer contact email validation for fee-waiver and job-role verification.
 * Uses standard format checks and DNS verification — no heuristic local-part blocking.
 */
export async function validateHrContactEmail(email: string): Promise<EmailVerificationResult> {
  const normalized = normalizeEmail(email || '');
  if (!normalized) {
    return { isValid: false, reason: 'HR email is required.' };
  }

  if (!hasValidFormat(normalized)) {
    return { isValid: false, reason: 'Please enter a valid email address.' };
  }

  const domain = getDomain(normalized);
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      isValid: false,
      reason: 'Temporary or disposable email addresses are not accepted. Please use your employer HR email.',
    };
  }

  if (isTrustedOrganizationEmailDomain(domain)) {
    return { isValid: true };
  }

  const acceptsMail = await domainAcceptsMail(domain);
  if (!acceptsMail) {
    return {
      isValid: false,
      reason:
        'This email domain does not appear to accept incoming mail. Please confirm the HR email address with your employer.',
    };
  }

  return { isValid: true };
}

/**
 * Student school / academic email — allows .edu domains and trusted organisation domains.
 * Disposable providers remain blocked.
 */
export async function validateStudentSchoolEmail(email: string): Promise<EmailVerificationResult> {
  const normalized = normalizeEmail(email || '');
  if (!normalized) {
    return { isValid: false, reason: 'School email is required.' };
  }

  if (!hasValidFormat(normalized)) {
    return { isValid: false, reason: 'Please enter a valid school email address.' };
  }

  if (!isAllowedStudentSchoolEmail(normalized)) {
    return {
      isValid: false,
      reason:
        'School email must use a supported academic domain (e.g. .edu) or @isca.org.sg.',
    };
  }

  const domain = getDomain(normalized);

  if (isTrustedOrganizationEmailDomain(domain)) {
    return { isValid: true };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { isValid: false, reason: 'Disposable email domains are not allowed.' };
  }

  const acceptsMail = await domainAcceptsMail(domain);
  if (!acceptsMail) {
    return {
      isValid: false,
      reason:
        'This school email domain does not appear to accept incoming mail. Please confirm the address.',
    };
  }

  return { isValid: true };
}
