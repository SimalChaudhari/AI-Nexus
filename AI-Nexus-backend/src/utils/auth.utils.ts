import { UserRole } from './../user/users.entity';
import { shouldBlockDisposableDomain } from './email-disposable.util';

/** Normalize email for lookups and storage: trim + lowercase. */
export function normalizeEmail(email: string | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

// Utility function to validate if the input is an email or not
export const validateEmail = (input: string | undefined): boolean => {
  if (!input) return false;
  const email = input.trim().toLowerCase();
  const strictEmailRegex =
    /^(?!\.)(?!.*\.\.)([a-z0-9._%+-]{1,64})@([a-z0-9-]+\.)+[a-z]{2,}$/i;
  if (!strictEmailRegex.test(email)) return false;

  const [localPart = '', domain = ''] = email.split('@');
  if (!localPart || !domain) return false;

  const blockedLocalParts = new Set([
    'test',
    'testing',
    'demo',
    'admin',
    'user',
    'fake',
    'temp',
    'example',
  ]);

  if (blockedLocalParts.has(localPart)) return false;
  if (shouldBlockDisposableDomain(domain)) return false;
  return true;
};

export function isAdmin(userRole: UserRole): userRole is UserRole.Admin {
  return userRole === UserRole.Admin;
}

export function isUser(userRole: UserRole): userRole is UserRole.User {
  return userRole === UserRole.User;
}
