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

const disposableEmailDomains = [
  'example.com',
  'test.com',
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'yopmail.com',
  'guerrillamail.com',
];

export const trustedOrganizationEmailDomains = ['isca.org.sg', 'ainexus.isca.org.sg'];

export const studentSchoolEmailDomainSuffixes = [
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

function isTrustedOrganizationEmailDomain(domain) {
  const normalized = String(domain || '').trim().toLowerCase();
  if (!normalized) return false;
  if (trustedOrganizationEmailDomains.includes(normalized)) return true;
  return normalized.endsWith('.isca.org.sg');
}

function isAllowedStudentSchoolEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!value || !value.includes('@')) return false;

  const domain = value.split('@')[1] || '';
  if (value.endsWith('.edu')) return true;
  if (isTrustedOrganizationEmailDomain(domain)) return true;

  return studentSchoolEmailDomainSuffixes.some(
    (suffix) => value.endsWith(`@${suffix}`) || domain === suffix
  );
}

const hrEmailSchema = zod
  .string()
  .trim()
  .min(1, { message: 'HR email is required.' })
  .email({ message: 'Please enter a valid email address.' })
  .max(254, { message: 'Email address is too long.' })
  .refine(
    (value) => !disposableEmailDomains.includes(value.split('@')[1]?.toLowerCase() || ''),
    { message: 'Temporary or disposable email addresses are not accepted. Please use your employer HR email.' }
  );
const emailSchema = zod
  .string()
  .trim()
  .toLowerCase()
  .min(1, { message: 'Email is required!' })
  .email({ message: 'Email must be a valid email address!' })
  .max(100, { message: 'Email must be less than 100 characters!' })
  .refine(
    (value) => !disposableEmailDomains.includes(value.split('@')[1]?.toLowerCase() || ''),
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

export function getHrEmailValidationMessage(hrEmail, { learnerEmail } = {}) {
  const value = String(hrEmail || '').trim();
  const result = hrEmailSchema.safeParse(value);
  if (!result.success) {
    return result.error.issues[0]?.message || 'Please enter a valid email address.';
  }

  const learner = String(learnerEmail || '').trim().toLowerCase();
  if (learner && value.toLowerCase() === learner) {
    return 'HR email must be different from your registration email.';
  }

  return '';
}

export function getStudentSchoolEmailValidationMessage(schoolEmail) {
  const value = String(schoolEmail || '').trim().toLowerCase();
  if (!value) return 'School email is required.';

  const formatResult = zod.string().email().safeParse(value);
  if (!formatResult.success) {
    return 'Please enter a valid school email address.';
  }

  if (!isAllowedStudentSchoolEmail(value)) {
    return 'School email must use a supported academic domain (e.g. .edu) or @isca.org.sg.';
  }

  const domain = value.split('@')[1] || '';
  if (disposableEmailDomains.includes(domain)) {
    return 'Disposable email domains are not allowed.';
  }

  return '';
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

const individualSignupJobFunctionValues = [
  'accounting-finance-related',
  'unemployed-accounting-finance-qualification',
  'others',
];

const individualSignupCitizenshipValues = ['singaporean', 'permanent-resident-singapore', 'others'];

const individualSignupSharedFields = {
  salutation: zod.string().min(1, { message: 'Salutation is required!' }),
  company: zod.string().min(1, { message: 'Company is required!' }),
  jobFunction: zod
    .string()
    .min(1, { message: 'Job function is required!' })
    .refine((value) => individualSignupJobFunctionValues.includes(value), {
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
};

function refineIndividualSignupProfile(data, ctx) {
  if (data.jobFunction === 'others' && !String(data.jobFunctionOther || '').trim()) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: 'Please specify your job function.',
      path: ['jobFunctionOther'],
    });
  }
}

function refineFreeIndividualSignupProfile(data, ctx) {
  refineIndividualSignupProfile(data, ctx);

  if (!String(data.citizenship || '').trim()) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: 'Citizenship is required!',
      path: ['citizenship'],
    });
  } else if (
    individualSignupCitizenshipValues.includes(data.citizenship)
    && data.citizenship === 'others'
    && !String(data.citizenshipOther || '').trim()
  ) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: 'Please specify your citizenship.',
      path: ['citizenshipOther'],
    });
  }

  if (!String(data.nricFin || '').trim()) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: 'NRIC/FIN number is required!',
      path: ['nricFin'],
    });
  }

  if (!data.imdaFundingAcknowledged) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: 'You must acknowledge IMDA funding data sharing to continue.',
      path: ['imdaFundingAcknowledged'],
    });
  }
}

/** Individual sign-up (paid membership flows). */
export function buildPaidIndividualSignUpSchema() {
  return AuthSignUpSchema.extend(individualSignupSharedFields).superRefine(refineIndividualSignupProfile);
}

/** Individual free sign-up (fee waiver / programme registration). */
export function buildFreeIndividualSignUpSchema() {
  return AuthSignUpSchema.extend({
    ...individualSignupSharedFields,
    nricFin: zod.string().optional(),
    citizenship: zod.string().optional(),
    citizenshipOther: zod.string().optional(),
    imdaFundingAcknowledged: zod.boolean().optional(),
  }).superRefine(refineFreeIndividualSignupProfile);
}

export const CorporateSignUpSchema = zod.object({
  // Account (company)
  companyName: zod
    .string()
    .min(1, { message: 'Company name is required!' })
    .max(200, { message: 'Company name is too long!' }),
  uenNumber: zod
    .string()
    .min(1, { message: 'UEN number is required!' })
    .max(64, { message: 'UEN number is too long!' }),
  organisationType: zod.string().min(1, { message: 'Organisation type is required!' }),
  businessCountry: zod.string().min(1, { message: 'Business country is required!' }),
  businessCity: zod.string().min(1, { message: 'Business city is required!' }),
  businessState: zod.string().optional(),
  businessPostalCode: zod.string().optional(),
  businessStreetName: zod.string().optional(),
  businessUnitNumber: zod.string().optional(),
  businessBuildingName: zod.string().optional(),
  isSme: zod.boolean().optional(),
  isPaidCorporate: zod.boolean().optional(),
  isProvidesProfessionalServices: zod.boolean().optional(),
  // Contact (HR)
  firstName: zod
    .string()
    .min(1, { message: 'First name is required!' })
    .max(80, { message: 'First name is too long!' }),
  lastName: zod
    .string()
    .min(1, { message: 'Last name is required!' })
    .max(80, { message: 'Last name is too long!' }),
  email: emailSchema,
  mobilePhone: zod.string().optional(),
  phone: zod.string().optional(),
  designation: zod.string().optional(),
  website: zod.string().optional(),
  // ISCA / newsletter preferences (Salesforce contact)
  iscaConferencesEvents: zod.boolean().optional(),
  practitionersBulletin: zod.boolean().optional(),
  iscaAccountifyBulletin: zod.boolean().optional(),
  financialForensicFocus: zod.boolean().optional(),
  businessFinanceBulletin: zod.boolean().optional(),
  monthlyCALab: zod.boolean().optional(),
  specialISCAOfferings: zod.boolean().optional(),
  participateInResearch: zod.boolean().optional(),
  boardflixBulletin: zod.boolean().optional(),
  monthlyISCharteredAccountantJournal: zod.boolean().optional(),
  scaqNewsletterUpdates: zod.boolean().optional(),
  studentMemberNewsletterUpdates: zod.boolean().optional(),
  theISCABuzzCorporateMembersNewsletter: zod.boolean().optional(),
  password: zod
    .string()
    .min(8, { message: 'Password must be at least 8 characters!' }),
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

