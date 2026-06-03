// ----------------------------------------------------------------------

export const RESIDENTIAL_DECLARATION_SINGAPORE = 'Singapore';
export const RESIDENTIAL_DECLARATION_OVERSEAS = 'Overseas';

export const RESIDENTIAL_DECLARATION_OPTIONS = [
  {
    value: RESIDENTIAL_DECLARATION_SINGAPORE,
    label: 'I declare that I reside in Singapore',
  },
  {
    value: RESIDENTIAL_DECLARATION_OVERSEAS,
    label: 'I declare that I reside Overseas',
  },
];

export const EMPTY_RESIDENTIAL_DECLARATION_FORM = {
  residentialDeclaration: RESIDENTIAL_DECLARATION_SINGAPORE,
};

export function buildResidentialDeclarationApiPayload(form, applicationId) {
  return {
    applicationId: String(applicationId || '').trim(),
    residentialDeclaration:
      form.residentialDeclaration?.trim() || RESIDENTIAL_DECLARATION_SINGAPORE,
  };
}

export function validateResidentialDeclarationBeforeSubmit(form, applicationId) {
  if (!applicationId?.trim()) {
    return 'Application ID is required. Submit the Application tab first.';
  }

  const value = form.residentialDeclaration?.trim();
  if (
    !value
    || !RESIDENTIAL_DECLARATION_OPTIONS.some((option) => option.value === value)
  ) {
    return 'Please declare whether you reside in Singapore or overseas.';
  }

  return '';
}
