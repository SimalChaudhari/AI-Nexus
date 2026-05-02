// Shared field definitions + parsing for public contact hero (contact page + footer).

export const CONTACT_FIELD_DEFS = [
  {
    key: 'address',
    label: 'Address',
    iconKey: 'addressIcon',
    defaultIcon: 'solar:map-point-bold',
    iconColor: '#00c48c',
  },
  {
    key: 'phone',
    label: 'Phone',
    iconKey: 'phoneIcon',
    defaultIcon: 'solar:phone-bold',
    iconColor: '#00c48c',
  },
  {
    key: 'email',
    label: 'Email',
    iconKey: 'emailIcon',
    defaultIcon: 'solar:letter-bold',
    iconColor: '#8b5cf6',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    iconKey: 'whatsappIcon',
    defaultIcon: 'ri:whatsapp-fill',
    iconColor: '#00c853',
  },
  {
    key: 'website',
    label: 'Website',
    iconKey: 'websiteIcon',
    defaultIcon: 'mdi:web',
    iconColor: '#3b82f6',
  },
];

export function parseContactDetails(detailsHtml) {
  const normalizedText = String(detailsHtml || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n+/g, '\n')
    .trim();

  const lines = normalizedText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const result = {};
  let activeKey = '';

  lines.forEach((line) => {
    const match = line.match(/^(Address|Phone|Email|WhatsApp|Website)\s*:?\s*(.*)$/i);
    if (match) {
      activeKey = match[1].toLowerCase();
      result[activeKey] = (match[2] || '').trim();
      return;
    }

    if (activeKey) {
      result[activeKey] = result[activeKey] ? `${result[activeKey]} ${line}`.trim() : line;
    }
  });

  return result;
}

/**
 * @param {Record<string, unknown> | null | undefined} row - First contact row from public settings
 */
export function buildContactFieldRows(row) {
  if (!row || typeof row !== 'object') return [];
  const parsed = parseContactDetails(row.details || '');
  return CONTACT_FIELD_DEFS.map((item) => ({
    ...item,
    value: String(row[item.key] || parsed[item.key] || '').trim(),
    icon: String(row[item.iconKey] || item.defaultIcon || '').trim(),
  })).filter((item) => !!item.value);
}
