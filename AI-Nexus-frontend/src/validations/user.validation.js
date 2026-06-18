import { z as zod } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';

// ----------------------------------------------------------------------

const avatarFieldSchema = zod
  .any()
  .optional()
  .refine(
    (val) =>
      !val ||
      (typeof File !== 'undefined' && val instanceof File) ||
      typeof val === 'string',
    { message: 'Please upload a valid image file' }
  );

export const optionalPhoneSchema = zod
  .string()
  .optional()
  .refine((val) => !val || String(val).trim() === '' || isValidPhoneNumber(String(val).trim()), {
    message: 'Please enter a valid phone number or leave blank',
  });

// ----------------------------------------------------------------------

const blockedEmailDomains = [
  'example.com',
  'test.com',
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  // 'yopmail.com',
  'guerrillamail.com',
];

const emailSchema = zod
  .string()
  .trim()
  .toLowerCase()
  .min(1, { message: 'Email is required!' })
  .email({ message: 'Email must be a valid email address!' })
  .max(100, { message: 'Email must be less than 100 characters!' })
  .refine(
    (value) => !blockedEmailDomains.includes(value.split('@')[1]?.toLowerCase() || ''),
    { message: 'Please enter a real email address.' }
  );

export function isValidPersonalEmail(email) {
  return emailSchema.safeParse(String(email || '').trim()).success;
}

export function getPersonalEmailValidationMessage(email) {
  const value = String(email || '').trim();
  if (!value) return '';
  const result = emailSchema.safeParse(value);
  if (result.success) return '';
  return result.error.issues[0]?.message || 'Email must be a valid email address!';
}

const optionalEmailSchema = emailSchema.optional();

export const AuthSignInSchema = zod.object({
  identifier: zod.string().min(1, { message: 'Email or username is required!' }),
  password: zod
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
});

export const AuthSignUpSchema = zod.object({
  username: zod
    .string()
    .min(1, { message: 'Username is required!' })
    .min(3, { message: 'Username must be at least 3 characters!' })
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]+$/, {
      message: 'Username must contain both letters and numbers, and no special characters!',
    }),
  firstName: zod.string().min(1, { message: 'First name is required!' }),
  lastName: zod.string().min(1, { message: 'Last name is required!' }),
  email: emailSchema,
  companyCode: zod.string().optional(),
  contactNumber: optionalPhoneSchema,
  password: zod
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
});

export const CorporateSignUpSchema = AuthSignUpSchema.extend({
  companyCode: zod
    .string()
    .min(1, { message: 'Organization name is required!' })
    .max(64, { message: 'Organization name must be less than 64 characters!' }),
});

/**
 * User validation schema for create and update operations
 */
export const NewUserSchema = zod.object({
  username: zod
    .string()
    .min(1, { message: 'Username is required!' })
    .min(3, { message: 'Username must be at least 3 characters!' })
    .max(50, { message: 'Username must be less than 50 characters!' })
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]+$/, {
      message: 'Username must contain both letters and numbers, and no special characters!',
    }),

  firstname: zod
    .string()
    .min(1, { message: 'First name is required!' })
    .min(2, { message: 'First name must be at least 2 characters!' })
    .max(50, { message: 'First name must be less than 50 characters!' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'First name can only contain letters, spaces, hyphens, and apostrophes!' }),

  lastname: zod
    .string()
    .min(1, { message: 'Last name is required!' })
    .min(2, { message: 'Last name must be at least 2 characters!' })
    .max(50, { message: 'Last name must be less than 50 characters!' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'Last name can only contain letters, spaces, hyphens, and apostrophes!' }),

  email: emailSchema,

  avatar: avatarFieldSchema,

  companyCode: zod.string().max(64, { message: 'Company code must be less than 64 characters!' }).optional(),

  contactNumber: optionalPhoneSchema,

  status: zod
    .string()
    .min(1, { message: 'Status is required!' })
    .refine(
      (val) => ['Active', 'Banned'].includes(val),
      { message: 'Status must be Active or Banned!' }
    ),

  /** Optional: if empty, backend emails a generated temporary password */
  password: zod
    .string()
    .optional()
    .refine((val) => !val || val === '' || val.length >= 8, {
      message: 'Password must be at least 8 characters, or leave blank to email a temporary password',
    }),
});

// ----------------------------------------------------------------------

/**
 * User validation schema for update operations (all fields optional)
 */
export const UpdateUserSchema = zod.object({
  username: zod
    .string()
    .min(3, { message: 'Username must be at least 3 characters!' })
    .max(50, { message: 'Username must be less than 50 characters!' })
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]+$/, {
      message: 'Username must contain both letters and numbers, and no special characters!',
    })
    .optional(),

  firstname: zod
    .string()
    .min(2, { message: 'First name must be at least 2 characters!' })
    .max(50, { message: 'First name must be less than 50 characters!' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'First name can only contain letters, spaces, hyphens, and apostrophes!' })
    .optional(),

  lastname: zod
    .string()
    .min(2, { message: 'Last name must be at least 2 characters!' })
    .max(50, { message: 'Last name must be less than 50 characters!' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'Last name can only contain letters, spaces, hyphens, and apostrophes!' })
    .optional(),

  email: optionalEmailSchema,

  avatar: avatarFieldSchema,

  companyCode: zod.string().max(64, { message: 'Company code must be less than 64 characters!' }).optional(),

  contactNumber: optionalPhoneSchema,

  status: zod
    .string()
    .refine(
      (val) => !val || ['Active', 'Banned'].includes(val),
      { message: 'Status must be Active or Banned!' }
    )
    .optional(),
});

/**
 * Profile validation schema (for profile editing - no status field)
 */
export const ProfileSchema = zod.object({
  username: zod
    .string()
    .min(1, { message: 'Username is required!' })
    .min(3, { message: 'Username must be at least 3 characters!' })
    .max(50, { message: 'Username must be less than 50 characters!' })
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]+$/, {
      message: 'Username must contain both letters and numbers, and no special characters!',
    }),

  firstname: zod
    .string()
    .min(1, { message: 'First name is required!' })
    .min(2, { message: 'First name must be at least 2 characters!' })
    .max(50, { message: 'First name must be less than 50 characters!' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'First name can only contain letters, spaces, hyphens, and apostrophes!' }),

  lastname: zod
    .string()
    .min(1, { message: 'Last name is required!' })
    .min(2, { message: 'Last name must be at least 2 characters!' })
    .max(50, { message: 'Last name must be less than 50 characters!' })
    .regex(/^[a-zA-Z\s'-]+$/, { message: 'Last name can only contain letters, spaces, hyphens, and apostrophes!' }),

  email: emailSchema,

  avatar: avatarFieldSchema,

  companyCode: zod.string().max(64, { message: 'Company code must be less than 64 characters!' }).optional(),

  contactNumber: optionalPhoneSchema,
});

// ----------------------------------------------------------------------

