// ----------------------------------------------------------------------

/** Display nullable boolean fields (e.g. Salesforce flags) as Yes / No / — */
export function formatNullableBoolean(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
}
