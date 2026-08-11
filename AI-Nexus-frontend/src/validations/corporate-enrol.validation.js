import { z as zod } from 'zod';

import { emailSchema } from './user.validation';

// ----------------------------------------------------------------------

export const corporateEnrolDefaultValues = {
  salutation: '',
  firstName: '',
  lastName: '',
  nameAsPerId: '',
  email: '',
  idType: '',
  idNumber: '',
  company: '',
  department: '',
  jobFunction: '',
  countryOfResidence: '',
  yearsOfExperience: '',
  corporateAccountId: '',
  learnerAsAnAccounting: 'Yes',
  membershipNumber: '',
  eligibility: 'Singapore Citizen',
};

export const CorporateEnrolSchema = zod.object({
  salutation: zod.string().trim().optional(),
  firstName: zod.string().trim().min(1, 'First name is required'),
  lastName: zod.string().trim().min(1, 'Last name is required'),
  nameAsPerId: zod.string().trim().min(1, 'Name as per ID is required'),
  // Same rules as registration form (format + disposable domain block).
  email: emailSchema,
  idType: zod.string().trim().optional(),
  idNumber: zod.string().trim().optional(),
  company: zod.string().trim().min(1, 'Company is required'),
  department: zod.string().trim().optional(),
  jobFunction: zod.string().trim().min(1, 'Job function is required'),
  countryOfResidence: zod.string().trim().optional(),
  yearsOfExperience: zod.preprocess(
    (val) => (val === undefined || val === null ? '' : String(val)),
    zod
      .string()
      .trim()
      .min(1, 'Years of relevant work experience is required')
      .refine((value) => {
        const years = Number(value);
        return !Number.isNaN(years) && years >= 0;
      }, 'Enter a valid number of years (0 or more)'),
  ),
  corporateAccountId: zod.string().trim().min(1, 'Corporate account ID is required'),
  learnerAsAnAccounting: zod.enum(['Yes', 'No'], {
    required_error: 'Please select Yes or No',
    invalid_type_error: 'Please select Yes or No',
  }),
  membershipNumber: zod.string().trim().optional(),
  eligibility: zod.enum(['Singapore Citizen', 'Singapore PR', 'Foreigner'], {
    required_error: 'Eligibility is required',
    invalid_type_error: 'Select Singapore Citizen, Singapore PR, or Foreigner',
  }),
});
