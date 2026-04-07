import { z as zod } from 'zod';

// ----------------------------------------------------------------------

/**
 * User validation schema for create and update operations
 */
export const NewUserSchema = zod.object({
  username: zod
    .string()
    .min(1, { message: 'Username is required!' })
    .min(3, { message: 'Username must be at least 3 characters!' })
    .max(50, { message: 'Username must be less than 50 characters!' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores!' }),

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

  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' })
    .max(100, { message: 'Email must be less than 100 characters!' })
    .toLowerCase(),

  status: zod
    .string()
    .min(1, { message: 'Status is required!' })
    .refine(
      (val) => ['Active', 'Inactive', 'Pending', 'Banned'].includes(val),
      { message: 'Status must be Active, Inactive, Pending, or Banned!' }
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
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores!' })
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

  email: zod
    .string()
    .email({ message: 'Email must be a valid email address!' })
    .max(100, { message: 'Email must be less than 100 characters!' })
    .toLowerCase()
    .optional(),

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
      (val) => !val || ['Active', 'Inactive', 'Pending', 'Banned'].includes(val),
      { message: 'Status must be Active, Inactive, Pending, or Banned!' }
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
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores!' }),

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

  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' })
    .max(100, { message: 'Email must be less than 100 characters!' })
    .toLowerCase(),
});

// ----------------------------------------------------------------------

