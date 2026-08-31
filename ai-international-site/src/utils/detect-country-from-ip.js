import { resolveCountryByCode } from 'src/assets/data/countries';

const GEO_COUNTRY_CACHE_KEY = 'intl_geo_country_code';
const GEO_FALLBACK_LABEL = 'Singapore';

function withTimeout(ms = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
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

export async function detectCountryCodeFromIp() {
  try {
    const cached = String(sessionStorage.getItem(GEO_COUNTRY_CACHE_KEY) || '')
      .trim()
      .toUpperCase();
    if (cached) return cached;
  } catch {
    // ignore
  }

  const primary = await fetchCountryCodeFromIpwho();
  const code = primary || (await fetchCountryCodeFromIpapi()) || 'SG';

  try {
    sessionStorage.setItem(GEO_COUNTRY_CACHE_KEY, code);
  } catch {
    // ignore
  }

  return code;
}

export async function detectCountryOfResidenceFromIp() {
  const code = await detectCountryCodeFromIp();
  return resolveCountryByCode(code)?.label || GEO_FALLBACK_LABEL;
}
