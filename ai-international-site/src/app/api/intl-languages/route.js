/**
 * Proxies Microsoft Translator public languages list (no API key required).
 * Avoids browser CORS and keeps a single server-side fetch.
 *
 * Docs: GET https://api.cognitive.microsofttranslator.com/languages?api-version=3.0
 */

const MS_LANGUAGES_URL =
  'https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation';

/** Prefer these on the first pages of the landing carousel. */
const PRIORITY_CODES = [
  'en',
  'zh-Hans',
  'zh-Hant',
  'vi',
  'th',
  'ms',
  'id',
  'ja',
  'ko',
  'hi',
  'ar',
  'es',
  'fr',
  'de',
  'pt',
];

/** Best-effort language → flagcdn country code. */
const FLAG_BY_CODE = {
  en: null,
  'zh-Hans': 'cn',
  'zh-Hant': 'tw',
  zh: 'cn',
  vi: 'vn',
  th: 'th',
  ms: 'my',
  id: 'id',
  ja: 'jp',
  ko: 'kr',
  hi: 'in',
  ar: 'sa',
  es: 'es',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  ru: 'ru',
  it: 'it',
  nl: 'nl',
  pl: 'pl',
  tr: 'tr',
  uk: 'ua',
  bn: 'bd',
  ta: 'in',
  te: 'in',
  fil: 'ph',
  tl: 'ph',
  my: 'mm',
  km: 'kh',
  lo: 'la',
};

function mapLanguage(code, item) {
  const name = String(item?.name || code).trim();
  const nativeName = String(item?.nativeName || name).trim();
  const flagCode = Object.prototype.hasOwnProperty.call(FLAG_BY_CODE, code)
    ? FLAG_BY_CODE[code]
    : null;

  return {
    id: code,
    code,
    label: name,
    nativeLabel: nativeName,
    locale: code,
    language: name,
    title: name,
    flagCode,
    icon: 'solar:global-bold-duotone',
  };
}

function sortLanguages(list) {
  const priority = new Map(PRIORITY_CODES.map((code, index) => [code, index]));
  return [...list].sort((a, b) => {
    const pa = priority.has(a.code) ? priority.get(a.code) : 999;
    const pb = priority.has(b.code) ? priority.get(b.code) : 999;
    if (pa !== pb) return pa - pb;
    return a.label.localeCompare(b.label);
  });
}

export async function GET() {
  try {
    const response = await fetch(MS_LANGUAGES_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return Response.json(
        { ok: false, error: `Upstream status ${response.status}`, data: [] },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const translation = payload?.translation || {};
    const list = sortLanguages(
      Object.entries(translation).map(([code, item]) => mapLanguage(code, item))
    );

    return Response.json({ ok: true, data: list });
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || 'Failed to load languages', data: [] },
      { status: 502 }
    );
  }
}
