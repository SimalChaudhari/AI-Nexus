// ----------------------------------------------------------------------

export function decodeSalesforceUiLabel(value) {
  return String(value || '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function normalizeMembershipPicklistOptions(response) {
  const source = Array.isArray(response?.options)
    ? response.options
    : Array.isArray(response?.salesforce?.values)
      ? response.salesforce.values
      : Array.isArray(response?.values)
        ? response.values
        : [];

  return source
    .map((entry) => {
      const rawValue = String(entry?.value || entry?.label || '').trim();
      if (!rawValue) return null;
      const decoded = decodeSalesforceUiLabel(rawValue);
      return { label: decoded, value: decoded };
    })
    .filter(Boolean);
}

/** @deprecated Use normalizeMembershipPicklistOptions */
export function normalizeEmploymentPicklistOptions(response) {
  return normalizeMembershipPicklistOptions(response);
}

export function buildMembershipPicklistMenuOptions(savedValue, options = []) {
  const normalizedSavedValue = String(savedValue || '').trim();
  const menuOptions = Array.isArray(options) ? [...options] : [];

  if (
    normalizedSavedValue
    && !menuOptions.some((option) => option.value === normalizedSavedValue)
  ) {
    menuOptions.unshift({
      label: normalizedSavedValue,
      value: normalizedSavedValue,
    });
  }

  return menuOptions;
}

/** @deprecated Use buildMembershipPicklistMenuOptions */
export const buildEmploymentPicklistMenuOptions = buildMembershipPicklistMenuOptions;

export function getMembershipPicklistSelectProps(onOpen, options = []) {
  return {
    displayEmpty: true,
    onOpen,
    renderValue: (selected) => {
      const normalized = String(selected || '').trim();
      if (!normalized) return '';
      const match = options.find((option) => option.value === normalized);
      return match?.label || normalized;
    },
  };
}

/** @deprecated Use getMembershipPicklistSelectProps */
export const getEmploymentPicklistSelectProps = getMembershipPicklistSelectProps;

export function normalizeOrganisationNameOptions(response) {
  const source = Array.isArray(response?.options)
    ? response.options
    : Array.isArray(response?.data)
      ? response.data
      : [];

  return source
    .map((entry) => {
      const name = String(entry?.value || entry?.name || entry?.label || '').trim();
      if (!name) return null;
      return {
        label: name,
        value: name,
        id: entry?.id ?? null,
      };
    })
    .filter(Boolean);
}

export function normalizeAccountancyBodyNameOptions(response) {
  const source = Array.isArray(response?.options)
    ? response.options
    : Array.isArray(response?.data)
      ? response.data
      : [];

  return source
    .map((entry) => {
      const id = String(entry?.value || entry?.id || '').trim();
      const label = String(entry?.label || entry?.institutionName || '').trim();
      if (!id || !label) return null;
      return {
        label,
        value: id,
        id,
      };
    })
    .filter(Boolean);
}
