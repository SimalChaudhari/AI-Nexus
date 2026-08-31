/** Asian countries shown in admin country pricing. Keep in sync with backend PROMO_PRICING_COUNTRIES. */
export const COUNTRY_PRICING_CATALOG = [
  { code: 'AF', name: 'Afghanistan', currency: 'AFN' },
  { code: 'AM', name: 'Armenia', currency: 'AMD' },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT' },
  { code: 'BT', name: 'Bhutan', currency: 'BTN' },
  { code: 'BN', name: 'Brunei', currency: 'BND' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'CY', name: 'Cyprus', currency: 'EUR' },
  { code: 'GE', name: 'Georgia', currency: 'GEL' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'IR', name: 'Iran', currency: 'IRR' },
  { code: 'IQ', name: 'Iraq', currency: 'IQD' },
  { code: 'IL', name: 'Israel', currency: 'ILS' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'JO', name: 'Jordan', currency: 'JOD' },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD' },
  { code: 'KG', name: 'Kyrgyzstan', currency: 'KGS' },
  { code: 'LA', name: 'Laos', currency: 'LAK' },
  { code: 'LB', name: 'Lebanon', currency: 'LBP' },
  { code: 'MO', name: 'Macau', currency: 'MOP' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'MV', name: 'Maldives', currency: 'MVR' },
  { code: 'MN', name: 'Mongolia', currency: 'MNT' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK' },
  { code: 'NP', name: 'Nepal', currency: 'NPR' },
  { code: 'KP', name: 'North Korea', currency: 'KPW' },
  { code: 'OM', name: 'Oman', currency: 'OMR' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR' },
  { code: 'PS', name: 'Palestine', currency: 'EGP' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'QA', name: 'Qatar', currency: 'QAR' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'KR', name: 'South Korea', currency: 'KRW' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR' },
  { code: 'SY', name: 'Syria', currency: 'SYP' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD' },
  { code: 'TJ', name: 'Tajikistan', currency: 'TJS' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'TL', name: 'Timor-Leste', currency: 'USD' },
  { code: 'TR', name: 'Turkey', currency: 'TRY' },
  { code: 'TM', name: 'Turkmenistan', currency: 'TMT' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'YE', name: 'Yemen', currency: 'YER' },
];

export function catalogCountryByCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  return COUNTRY_PRICING_CATALOG.find((row) => row.code === normalized) || null;
}

export function currencyForCountryCode(code) {
  return catalogCountryByCode(code)?.currency || '';
}
