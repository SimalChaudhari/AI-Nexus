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
 * @param {string} linkOrPhone - Admin-configured link or fallback display value
 */
export function resolveWhatsAppUrl(linkOrPhone, displayValue = '') {
  const raw = String(linkOrPhone || displayValue || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) return raw;
  if (/wa\.me|whatsapp\.com/i.test(raw)) {
    return raw.startsWith('http') ? raw : `https://${raw}`;
  }

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}`;
}

export function buildContactFieldHref(fieldKey, row) {
  if (!row || typeof row !== 'object') return '';

  const value = String(row[fieldKey] || '').trim();
  if (!value && fieldKey !== 'whatsapp') return '';

  switch (fieldKey) {
    case 'website':
      if (!value) return '';
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    case 'whatsapp':
      return resolveWhatsAppUrl(row.whatsappLink, value);
    default:
      return '';
  }
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
    href: buildContactFieldHref(item.key, {
      ...row,
      ...parsed,
      whatsappLink: row.whatsappLink,
    }),
  })).filter((item) => !!item.value);
}

export function buildWhatsAppMessageUrl(whatsappUrl, message) {
  const baseUrl = resolveWhatsAppUrl(whatsappUrl);
  if (!baseUrl) return '';

  const text = String(message || '').trim();
  if (!text) return baseUrl;

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}text=${encodeURIComponent(text)}`;
}
