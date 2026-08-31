import { z as zod } from 'zod';

import { getNationalPhoneLimitsForCountry, isValidNationalPhoneNumber } from 'src/utils/intl-phone';

const NAME_RE = /^[\p{L}][\p{L}\s'.-]{0,78}$/u;
const PROMO_RE = /^[A-Za-z0-9_-]*$/;

export const IntlPaidSignUpSchema = zod
  .object({
    salutation: zod
      .string()
      .trim()
      .min(1, { message: 'Salutation is required!' })
      .refine((v) => ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'].includes(v), {
        message: 'Please select a valid salutation.',
      }),
    firstName: zod
      .string()
      .trim()
      .min(1, { message: 'First name is required!' })
      .max(80, { message: 'First name must be at most 80 characters.' })
      .regex(NAME_RE, { message: 'Enter a valid first name.' }),
    lastName: zod
      .string()
      .trim()
      .min(1, { message: 'Last name is required!' })
      .max(80, { message: 'Last name must be at most 80 characters.' })
      .regex(NAME_RE, { message: 'Enter a valid last name.' }),
    email: zod
      .string()
      .trim()
      .toLowerCase()
      .min(1, { message: 'Email is required!' })
      .max(120, { message: 'Email must be at most 120 characters.' })
      .email({ message: 'Email must be a valid email address!' }),
    contactNumber: zod.string().trim(),
    password: zod
      .string()
      .min(1, { message: 'Password is required!' })
      .min(6, { message: 'Password must be at least 6 characters!' })
      .max(72, { message: 'Password must be at most 72 characters.' }),
    countryOfResidence: zod
      .string()
      .trim()
      .min(1, { message: 'Country of residence is required!' })
      .max(120, { message: 'Country name is too long.' }),
    membershipType: zod
      .string()
      .refine((value) => value === 'student' || value === 'full', {
        message: 'Please choose a membership plan.',
      }),
    promoCode: zod
      .string()
      .trim()
      .max(64, { message: 'Promo code must be at most 64 characters.' })
      .regex(PROMO_RE, { message: 'Promo code can only use letters, numbers, - and _.' }),
    paymentConsent: zod.boolean().refine((v) => v === true, {
      message: 'Please confirm the amount to continue.',
    }),
  })
  .superRefine((data, ctx) => {
    const raw = String(data.contactNumber || '').trim();
    if (!raw) return;

    const limits = getNationalPhoneLimitsForCountry(data.countryOfResidence);
    if (!isValidNationalPhoneNumber(raw, data.countryOfResidence)) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ['contactNumber'],
        message: limits.hint
          ? `Enter a valid number: ${limits.hint}.`
          : 'Enter a valid contact number for your country.',
      });
    }
  });

export const IntlSignInSchema = zod.object({
  identifier: zod
    .string()
    .trim()
    .min(1, { message: 'Email or username is required!' })
    .max(120, { message: 'Identifier is too long.' }),
  password: zod
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' })
    .max(72, { message: 'Password must be at most 72 characters.' }),
});

export const INTL_PAID_SIGNUP_DEFAULTS = {
  salutation: '',
  firstName: '',
  lastName: '',
  email: '',
  contactNumber: '',
  password: '',
  countryOfResidence: '',
  membershipType: '',
  promoCode: '',
  paymentConsent: false,
};

export const INTL_MEMBERSHIP_FEE = {
  /** Fallback until backend pricing loads — fee is defined in SGD */
  currency: 'SGD',
  baseAmountSgd: 365,
  studentAmountSgd: 150,
  baseAmount: 365,
  voucherDiscountAmount: 100,
};
