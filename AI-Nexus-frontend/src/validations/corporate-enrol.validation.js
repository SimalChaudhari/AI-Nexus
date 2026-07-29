import { z as zod } from 'zod';

// ----------------------------------------------------------------------

export const corporateEnrolDefaultValues = {
  salutation: 'Mr',
  firstName: '',
  lastName: '',
  nameAsPerId: '',
  email: '',
  company: '',
  department: '',
  staffRole: '',
  yearsOfExperience: '',
  corporateAccountId: '',
  learnerAsAnAccounting: 'Yes',
  eligibility: 'Singapore Citizen',
};

export const CorporateEnrolSchema = zod.object({
  salutation: zod.string().trim().min(1, 'Salutation is required'),
  firstName: zod.string().trim().min(1, 'First name is required'),
  lastName: zod.string().trim().min(1, 'Last name is required'),
  nameAsPerId: zod.string().trim().min(1, 'Name as per ID is required'),
  email: zod
    .string()
    .trim()
    .min(1, 'Work email is required')
    .email('Enter a valid work email address'),
  company: zod.string().trim().min(1, 'Company is required'),
  department: zod.string().trim().min(1, 'Department is required'),
  staffRole: zod.string().trim().min(1, 'Staff role is required'),
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
  eligibility: zod.string().trim().min(1, 'Eligibility is required'),
});
