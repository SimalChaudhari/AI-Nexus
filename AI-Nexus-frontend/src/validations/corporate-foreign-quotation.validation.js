import { z as zod } from 'zod';

// ----------------------------------------------------------------------

export const corporateForeignQuotationDefaultValues = {
  companyName: '',
  contactPerson: '',
  contactEmail: '',
  estimatedParticipants: '',
};

export const CorporateForeignQuotationSchema = zod.object({
  companyName: zod.string().trim().min(1, 'Company name is required'),
  contactPerson: zod.string().trim().min(1, 'Contact person is required'),
  contactEmail: zod
    .string()
    .trim()
    .min(1, 'Contact email is required')
    .email('Enter a valid contact email address'),
  estimatedParticipants: zod.preprocess(
    (val) => (val === undefined || val === null ? '' : String(val)),
    zod
      .string()
      .trim()
      .min(1, 'Estimated number of foreign learners is required')
      .refine((value) => {
        const count = Number(value);
        return Number.isInteger(count) && count >= 1;
      }, 'Enter a whole number of at least 1'),
  ),
});
