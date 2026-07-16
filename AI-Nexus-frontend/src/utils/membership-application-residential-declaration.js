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

const RESIDENTIAL_DECLARATION_LABEL_MAP = {
  [RESIDENTIAL_DECLARATION_SINGAPORE]: 'I declare that I reside in Singapore',
  [RESIDENTIAL_DECLARATION_OVERSEAS]: 'I declare that I reside Overseas',
};

/** Map Salesforce picklist values to residential declaration radio labels. */
export function buildResidentialDeclarationRadioOptions(
  picklistOptions = [],
  savedValue = '',
  { useFallback = false } = {}
) {
  const normalizedSaved = String(savedValue || '').trim();
  const hasPicklist = Array.isArray(picklistOptions) && picklistOptions.length > 0;

  if (!hasPicklist && !useFallback) {
    if (!normalizedSaved) return [];
    return [
      {
        value: normalizedSaved,
        label: RESIDENTIAL_DECLARATION_LABEL_MAP[normalizedSaved] || normalizedSaved,
      },
    ];
  }

  const source = hasPicklist ? picklistOptions : RESIDENTIAL_DECLARATION_OPTIONS;

  const options = source.map((option) => {
    const value = String(option?.value || '').trim();
    if (!value) return null;
    return {
      value,
      label:
        RESIDENTIAL_DECLARATION_LABEL_MAP[value]
        || String(option?.label || value).trim(),
    };
  }).filter(Boolean);

  if (
    normalizedSaved
    && !options.some((option) => option.value === normalizedSaved)
  ) {
    options.unshift({
      value: normalizedSaved,
      label: RESIDENTIAL_DECLARATION_LABEL_MAP[normalizedSaved] || normalizedSaved,
    });
  }

  return options.length ? options : RESIDENTIAL_DECLARATION_OPTIONS;
}

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
  const allowedValues = [
    RESIDENTIAL_DECLARATION_SINGAPORE,
    RESIDENTIAL_DECLARATION_OVERSEAS,
    ...RESIDENTIAL_DECLARATION_OPTIONS.map((option) => option.value),
  ];

  if (!value || !allowedValues.includes(value)) {
    return 'Please declare whether you reside in Singapore or overseas.';
  }

  return '';
}
