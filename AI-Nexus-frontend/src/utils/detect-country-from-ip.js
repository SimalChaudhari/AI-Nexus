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
 * @param {string} code
 * @returns {boolean}
 */
export function isSingaporeCountryCode(code = '') {
  return String(code || '').trim().toUpperCase() === 'SG';
}

/**
 * Detect visitor ISO country code from public IP.
 * Falls back to SG when detection fails (GST-safe default).
 * @returns {Promise<string>}
 */
export async function detectCountryCodeFromIp() {
  try {
    const cachedCode = String(sessionStorage.getItem(GEO_COUNTRY_CACHE_KEY) || '')
      .trim()
      .toUpperCase();
    if (cachedCode) return cachedCode;
  } catch {
    // ignore storage errors
  }

  const code = await fetchCountryCodeFromIp();
  const normalized = String(code || '').trim().toUpperCase();
  if (normalized) {
    try {
      sessionStorage.setItem(GEO_COUNTRY_CACHE_KEY, normalized);
    } catch {
      // ignore storage errors
    }
    return normalized;
  }

  return 'SG';
}

/**
 * Detect visitor country from public IP and return CountrySelect label.
 * Falls back to Singapore when detection fails.
 * @returns {Promise<string>}
 */
export async function detectCountryOfResidenceFromIp() {
  const code = await detectCountryCodeFromIp();
  return resolveCountryLabelFromCode(code) || GEO_FALLBACK_COUNTRY_LABEL;
}

export { GEO_FALLBACK_COUNTRY_LABEL };
