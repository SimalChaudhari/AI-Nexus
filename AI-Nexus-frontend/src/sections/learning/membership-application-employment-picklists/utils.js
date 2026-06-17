// ----------------------------------------------------------------------

export function decodeSalesforceUiLabel(value) {
  return String(value || '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function normalizeEmploymentPicklistOptions(response) {
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

export function buildEmploymentPicklistMenuOptions(savedValue, options = []) {
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

export function getEmploymentPicklistSelectProps(onOpen) {
  return {
    displayEmpty: true,
    onOpen,
    renderValue: (selected) => selected || '',
  };
}
