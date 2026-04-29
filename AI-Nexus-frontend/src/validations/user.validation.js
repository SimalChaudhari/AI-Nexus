import { z as zod } from 'zod';

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
  password: zod
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
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

  phoneNumber: zod
    .string()
    .optional()
    .refine(
      (val) => !val || val === '' || /^[0-9]{10}$/.test(val),
      { message: 'Mobile number must be exactly 10 digits!' }
    ),

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
});

// ----------------------------------------------------------------------

