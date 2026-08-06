const fs = require('fs');

const frontend = fs.readFileSync('AI-Nexus-frontend/src/assets/data/countries.js', 'utf8');
const match = frontend.match(/export const countries = (\[[\s\S]*?\]);/);
if (!match) throw new Error('parse fail');
const countries = eval(match[1]).filter((c) => c.code);

(async () => {
  const res = await fetch('https://raw.githubusercontent.com/mledoze/countries/master/countries.json');
  const d = await res.json();
  const currencyByCode = {};
  for (const c of d) {
    if (c.cca2 && c.currencies) {
      const codes = Object.keys(c.currencies);
      if (codes[0]) currencyByCode[c.cca2] = codes[0] === 'CUC' ? 'CUP' : codes[0];
    }
  }
  currencyByCode.CK = 'NZD';
  currencyByCode.ZW = 'ZWL';

  const rows = countries.map((c) => ({
    code: c.code,
    label: c.label,
    phone: String(c.phone || ''),
    currency: currencyByCode[c.code] || 'USD',
  }));

  const currencyMap = {};
  const labelMap = {};
  for (const r of rows) {
    currencyMap[r.code] = r.currency;
    labelMap[r.label.toLowerCase()] = r.code;
  }

  const backendTs = `/** Auto-generated full country list for international membership. */
export type IntlCountry = {
  code: string;
  label: string;
  phone: string;
  currency: string;
};

export const INTL_COUNTRIES: IntlCountry[] = ${JSON.stringify(rows, null, 2)};

export const COUNTRY_CURRENCY: Record<string, string> = ${JSON.stringify(currencyMap, null, 2)};

export const COUNTRY_LABEL_TO_CODE: Record<string, string> = ${JSON.stringify(labelMap, null, 2)};
`;

  fs.writeFileSync('AI-Nexus-backend/src/intl-payment/intl-countries.data.ts', backendTs);

  const slim = rows.map(({ code, label, phone }) => ({ code, label, phone }));
  const feJs = `/** Full country list (same as main Nexus site). */
export const COUNTRIES = ${JSON.stringify(slim, null, 2)};

export function getCountryFlagUrl(code) {
  const normalized = String(code || '').trim().toLowerCase();
  if (!normalized) return '';
  return \`https://flagcdn.com/w40/\${normalized}.png\`;
}

export function resolveCountryByLabel(label = '') {
  const normalized = String(label || '').trim().toLowerCase();
  if (!normalized) return null;
  return COUNTRIES.find((c) => c.label.toLowerCase() === normalized) || null;
}

export function resolveCountryByCode(code = '') {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return null;
  return COUNTRIES.find((c) => c.code === normalized) || null;
}

export function isSingaporeCountry(labelOrCode = '') {
  const value = String(labelOrCode || '').trim().toLowerCase();
  return value === 'singapore' || value === 'sg';
}
`;
  fs.writeFileSync('ai-international-site/src/assets/data/countries.js', feJs);
  console.log('countries', rows.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
