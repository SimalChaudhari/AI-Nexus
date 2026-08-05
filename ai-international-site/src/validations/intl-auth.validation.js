import { z as zod } from 'zod';

export const INDIVIDUAL_SIGNUP_JOB_FUNCTION_OPTIONS = [
  { value: 'accounting-finance-related', label: 'Accounting and finance related' },
  {
    value: 'unemployed-accounting-finance-qualification',
    label: 'Unemployed but has accounting and finance qualification',
  },
  { value: 'others', label: 'Others' },
];

const jobFunctionValues = INDIVIDUAL_SIGNUP_JOB_FUNCTION_OPTIONS.map((o) => o.value);

export const IntlPaidSignUpSchema = zod
  .object({
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
    companyCode: zod.string().optional(),
    company: zod.string().min(1, { message: 'Company is required!' }),
    jobFunction: zod
      .string()
      .min(1, { message: 'Job function is required!' })
      .refine((value) => jobFunctionValues.includes(value), {
        message: 'Please select a valid job function.',
      }),
    jobFunctionOther: zod.string().optional(),
    yearsOfExperience: zod
      .string()
      .min(1, { message: 'Years of relevant work experience is required!' })
      .refine((value) => /^\d+$/.test(String(value).trim()), {
        message: 'Enter a whole number of years.',
      })
      .refine((value) => {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed >= 0 && parsed <= 80;
      }, { message: 'Enter a valid number of years between 0 and 80.' }),
    countryOfResidence: zod.string().min(1, { message: 'Country of residence is required!' }),
    promoCode: zod.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.jobFunction === 'others' && !String(data.jobFunctionOther || '').trim()) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: 'Please specify your job function.',
        path: ['jobFunctionOther'],
      });
    }
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
  companyCode: '',
  company: '',
  jobFunction: '',
  jobFunctionOther: '',
  yearsOfExperience: '',
  countryOfResidence: '',
  promoCode: '',
};

/** Common residence countries for the paid signup select. */
export const COUNTRY_OF_RESIDENCE_OPTIONS = [
  'Singapore',
  'Malaysia',
  'Indonesia',
  'Thailand',
  'Vietnam',
  'Philippines',
  'India',
  'China',
  'Hong Kong',
  'Japan',
  'South Korea',
  'Australia',
  'New Zealand',
  'United Arab Emirates',
  'Saudi Arabia',
  'United Kingdom',
  'United States',
  'Canada',
  'Germany',
  'France',
  'Netherlands',
  'Switzerland',
  'Other',
];
