import { z as zod } from 'zod';

import {
  isSingaporeNricIdType,
  validateSingaporeNricFinValue,
} from 'src/utils/nric-id-type';

// ----------------------------------------------------------------------

export const corporateEnrolDefaultValues = {
  salutation: 'Mr',
  fullName: '',
  email: '',
  idType: 'NRIC',
  idNumber: '',
  membershipNumber: '',
  countryOfResidence: 'Singapore',
  yearsOfExperience: '',
  learnerAsAnAccounting: 'Yes',
};

export const CorporateEnrolSchema = zod
  .object({
    salutation: zod.string().trim().min(1, 'Salutation is required'),
    fullName: zod
      .string()
      .trim()
      .min(1, 'Full name is required')
      .refine((value) => value.split(/\s+/).filter(Boolean).length >= 2, {
        message: 'Please enter first and last name',
      }),
    email: zod
      .string()
      .trim()
      .min(1, 'Work email is required')
      .email('Enter a valid work email address'),
    idType: zod.string().trim().min(1, 'ID type is required'),
    idNumber: zod.string().trim().min(1, 'NRIC / ID number is required'),
    membershipNumber: zod.string().trim().min(1, 'ISCA membership number is required'),
    countryOfResidence: zod.string().trim().min(1, 'Country of residence is required'),
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
    learnerAsAnAccounting: zod.enum(['Yes', 'No'], {
      required_error: 'Please select Yes or No',
      invalid_type_error: 'Please select Yes or No',
    }),
  })
  .superRefine((data, ctx) => {
    if (!isSingaporeNricIdType(data.idType)) return;
    const result = validateSingaporeNricFinValue(data.idNumber);
    if (!result.ok) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        message: result.message,
        path: ['idNumber'],
      });
    }
  });
