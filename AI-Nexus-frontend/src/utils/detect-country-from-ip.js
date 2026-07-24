import { countries } from 'src/assets/data';

const GEO_COUNTRY_CACHE_KEY = 'geoCountryOfResidenceCode';
const GEO_FALLBACK_COUNTRY_LABEL = 'Singapore';

function withTimeout(ms = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

/**
 * Map ISO country code (e.g. SG) to CountrySelect label (e.g. Singapore).
 * @param {string} code
 * @returns {string}
 */
export function resolveCountryLabelFromCode(code = '') {
  const normalized = String(code || '')
    .trim()
    .toUpperCase();
  if (!normalized) return '';
  const match = countries.find((country) => country.code === normalized);
  return String(match?.label || '').trim();
}

async function fetchCountryCodeFromIpwho() {
  const timeout = withTimeout();
  try {
    const response = await fetch('https://ipwho.is/', { signal: timeout.signal });
    if (!response.ok) return '';
    const data = await response.json();
    if (data?.success === false) return '';
    return String(data?.country_code || '').trim().toUpperCase();
  } catch {
    return '';
  } finally {
    timeout.clear();
  }
}

async function fetchCountryCodeFromIpapi() {
  const timeout = withTimeout();
  try {
    const response = await fetch('https://ipapi.co/json/', { signal: timeout.signal });
    if (!response.ok) return '';
    const data = await response.json();
    if (data?.error) return '';
    return String(data?.country_code || '').trim().toUpperCase();
  } catch {
    return '';
  } finally {
    timeout.clear();
  }
}

async function fetchCountryCodeFromIp() {
  const primary = await fetchCountryCodeFromIpwho();
  if (primary) return primary;
  return fetchCountryCodeFromIpapi();
}

/**
 * Detect visitor country from public IP and return CountrySelect label.
 * Falls back to Singapore when detection fails.
 * @returns {Promise<string>}
 */
export async function detectCountryOfResidenceFromIp() {
  try {
    const cachedCode = sessionStorage.getItem(GEO_COUNTRY_CACHE_KEY);
    const cachedLabel = resolveCountryLabelFromCode(cachedCode || '');
    if (cachedLabel) return cachedLabel;
  } catch {
    // ignore storage errors
  }

  const code = await fetchCountryCodeFromIp();
  const label = resolveCountryLabelFromCode(code);
  if (label) {
    try {
      sessionStorage.setItem(GEO_COUNTRY_CACHE_KEY, code);
    } catch {
      // ignore storage errors
    }
    return label;
  }

  return GEO_FALLBACK_COUNTRY_LABEL;
}

export { GEO_FALLBACK_COUNTRY_LABEL };
