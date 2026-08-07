import { z as zod } from 'zod';

export const IntlPaidSignUpSchema = zod.object({
  salutation: zod.string().min(1, { message: 'Salutation is required!' }),
  firstName: zod.string().min(1, { message: 'First name is required!' }),
  lastName: zod.string().min(1, { message: 'Last name is required!' }),
  email: zod
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  contactNumber: zod.string().optional(),
  password: zod
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
  countryOfResidence: zod.string().min(1, { message: 'Country of residence is required!' }),
  promoCode: zod.string().optional(),
  paymentConsent: zod.boolean().refine((v) => v === true, {
    message: 'Please confirm the payable amount to continue.',
  }),
});

export const IntlSignInSchema = zod.object({
  identifier: zod.string().min(1, { message: 'Email or username is required!' }),
  password: zod
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
});

export const INTL_PAID_SIGNUP_DEFAULTS = {
  salutation: '',
  firstName: '',
  lastName: '',
  email: '',
  contactNumber: '',
  password: '',
  countryOfResidence: '',
  promoCode: '',
  paymentConsent: false,
};

export const INTL_MEMBERSHIP_FEE = {
  /** Fallback until backend pricing loads — fee is defined in SGD */
  currency: 'SGD',
  baseAmountSgd: 365,
  baseAmount: 365,
  voucherDiscountAmount: 100,
};

