export const DEFAULT_TESTIMONIALS_CONTENT = {

  heading: '',

  subtitle: '',

  testimonials: [],

  industryQuotes: [],

};



export const TESTIMONIALS_MAX = 12;

export const INDUSTRY_QUOTES_MAX = 8;



const UUID_RE = /^[0-9a-f-]{36}$/i;



export function createTestimonialsItemId() {

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {

    return globalThis.crypto.randomUUID();

  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {

    const r = Math.floor(Math.random() * 16);

    const v = c === 'x' ? r : (r & 0x3) | 0x8;

    return v.toString(16);

  });

}



function normalizeItemId(value) {

  const id = String(value ?? '').trim();

  return UUID_RE.test(id) ? id : '';

}



export function normalizeTestimonialsContent(source) {

  if (!source || typeof source !== 'object') {

    return {

      ...DEFAULT_TESTIMONIALS_CONTENT,

      testimonials: [],

      industryQuotes: [],

    };

  }

  const rawTestimonials = Array.isArray(source.testimonials) ? source.testimonials : [];

  const rawQuotes = Array.isArray(source.industryQuotes) ? source.industryQuotes : [];

  return {

    heading: source.heading != null ? String(source.heading) : '',

    subtitle: source.subtitle != null ? String(source.subtitle) : '',

    testimonials: rawTestimonials.slice(0, TESTIMONIALS_MAX).map((row) => ({

      id: normalizeItemId(row?.id),

      quote: row?.quote != null ? String(row.quote) : '',

      name: row?.name != null ? String(row.name) : '',

      role: row?.role != null ? String(row.role) : '',

      avatarUrl: row?.avatarUrl != null ? String(row.avatarUrl) : '',

      rating: row?.rating != null ? Number(row.rating) : 5,

    })),

    industryQuotes: rawQuotes.slice(0, INDUSTRY_QUOTES_MAX).map((row) => ({

      id: normalizeItemId(row?.id),

      quote: row?.quote != null ? String(row.quote) : '',

      organisation: row?.organisation != null ? String(row.organisation) : '',

      logoUrl: row?.logoUrl != null ? String(row.logoUrl) : '',

    })),

  };

}



export function hasTestimonialsContent(content) {

  const c = content || {};

  if (String(c.heading || '').trim()) return true;

  if (String(c.subtitle || '').trim()) return true;

  const testimonials = Array.isArray(c.testimonials) ? c.testimonials : [];

  const quotes = Array.isArray(c.industryQuotes) ? c.industryQuotes : [];

  return (

    testimonials.some((r) => r?.quote?.trim() || r?.name?.trim()) ||

    quotes.some((r) => r?.quote?.trim() || r?.organisation?.trim())

  );

}



export function isTestimonialsContentEmpty(source) {

  if (!source || typeof source !== 'object') return true;

  return !hasTestimonialsContent(normalizeTestimonialsContent(source));

}



/** Saved API content only — no placeholder/dummy data. */

export function resolveTestimonialsContent(source) {

  return normalizeTestimonialsContent(source);

}


