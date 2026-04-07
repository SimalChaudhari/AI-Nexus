import { UserRole } from './../user/users.entity';

/** Normalize email for lookups and storage: trim + lowercase. */
export function normalizeEmail(email: string | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

// Utility function to validate if the input is an email or not
export const validateEmail = (input: string | undefined): boolean => {
  if (!input) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
};

export function isAdmin(userRole: UserRole): userRole is UserRole.Admin {
  return userRole === UserRole.Admin;
}

export function isUser(userRole: UserRole): userRole is UserRole.User {
  return userRole === UserRole.User;
}
