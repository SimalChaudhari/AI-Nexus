/** Fallback copy for International landing admin + API transform. */
export const INTL_LANDING_DEFAULTS = {
  hero: {
    eyebrow: 'AI Nexus International',
    titleLine1: 'AI Fluency.',
    titleLine2: 'Global Impact.',
    body:
      'Future-ready AI learning for accountancy and finance professionals — practical skills, recognized credentials, and career growth no matter where you practice.',
    heroImageUrl: null,
  },
  globalLearning: {
    title: 'A Global Learning Experience',
    points: [
      'Localized content in your language',
      'Relevant to your market and regulations',
      'Recognized credentials that travel with you',
      "Built by ISCA — Asia's trusted accountancy body",
    ],
    imageUrl: null,
    sideCard: {
      icon: 'solar:users-group-rounded-bold-duotone',
      title: 'For Professionals. By Professionals.',
      body: 'Join a global community of accountancy and finance professionals building AI fluency for real-world impact.',
    },
  },
  trustItems: [
    {
      icon: 'solar:diploma-linear',
      line1: 'Industry-Recognized',
      line2: 'Certificates',
      accent: '#002060',
    },
    {
      icon: 'solar:shield-check-linear',
      line1: 'Verifiable Digital',
      line2: 'Credentials',
      accent: '#C00000',
    },
    {
      icon: 'solar:clock-circle-linear',
      line1: 'Flexible Learning',
      line2: 'Anytime, Anywhere',
      accent: '#0f766e',
    },
    {
      icon: 'solar:medal-ribbons-star-linear',
      line1: 'CPE Hours',
      line2: 'Eligible',
      accent: '#185FA5',
    },
  ],
  footer: {
    tagline: 'Practical AI learning for accountancy and finance professionals worldwide.',
    copyrightText: '© {year} ISCA · AI Nexus International. All rights reserved.',
    social: [
      { icon: 'mdi:linkedin', href: '' },
      { icon: 'mdi:youtube', href: '' },
      { icon: 'solar:letter-bold', href: '' },
    ],
    columns: [
      {
        title: 'Platform',
        links: [
          { label: 'AI Fluency', href: '/dashboard' },
          { label: 'Register', href: '/auth/sign-up' },
          { label: 'Sign in', href: '/auth/sign-in' },
          { label: 'FAQ', href: '' },
          { label: 'Sustainability Qualifications', href: '' },
          { label: 'Accountify', href: '' },
          { label: 'Boardflix', href: '' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { label: 'About', href: '' },
          { label: 'FAQs', href: '' },
          { label: 'Help Centre', href: '' },
          { label: 'Contact Us', href: '' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Terms of Use', href: '' },
          { label: 'Privacy Policy', href: '' },
          { label: 'Cookie Policy', href: '' },
        ],
      },
    ],
  },
  languages: [
    {
      id: 'en',
      code: 'en',
      label: 'English',
      nativeLabel: 'International',
      locale: 'en',
      language: 'English',
      flagCode: '',
      icon: 'solar:global-bold-duotone',
      note: '',
      selectable: true,
    },
    {
      id: 'vi',
      code: 'vi',
      label: 'Vietnamese',
      nativeLabel: 'Tiếng Việt',
      locale: 'vi',
      language: 'Vietnamese',
      flagCode: 'vn',
      icon: 'solar:map-point-bold-duotone',
      note: 'Close Caption Available',
      selectable: false,
    },
    {
      id: 'id',
      code: 'id',
      label: 'Indonesian',
      nativeLabel: 'Bahasa Indonesia',
      locale: 'id',
      language: 'Indonesian',
      flagCode: 'id',
      icon: 'solar:global-bold-duotone',
      note: 'Close Caption Available',
      selectable: false,
    },
    {
      id: 'zh-Hans',
      code: 'zh-Hans',
      label: 'Chinese',
      nativeLabel: '中文',
      locale: 'zh-Hans',
      language: 'Chinese',
      flagCode: 'cn',
      icon: 'solar:buildings-bold-duotone',
      note: 'Full translation in September',
      selectable: false,
    },
    {
      id: 'th',
      code: 'th',
      label: 'Thai',
      nativeLabel: 'ไทย',
      locale: 'th',
      language: 'Thai',
      flagCode: 'th',
      icon: 'solar:home-smile-bold-duotone',
      note: 'Close Caption Available',
      selectable: false,
    },
  ],
};

export function normalizeIntlLandingContent(input) {
  const source = input && typeof input === 'object' ? input : {};
  const d = INTL_LANDING_DEFAULTS;
  const hero = source.hero && typeof source.hero === 'object' ? source.hero : {};
  const global =
    source.globalLearning && typeof source.globalLearning === 'object'
      ? source.globalLearning
      : {};
  const side = global.sideCard && typeof global.sideCard === 'object' ? global.sideCard : {};
  const footer = source.footer && typeof source.footer === 'object' ? source.footer : {};

  const points =
    Array.isArray(global.points) && global.points.length
      ? global.points.map((p) => String(p || '').trim()).filter(Boolean)
      : d.globalLearning.points;

  const trustItems =
    Array.isArray(source.trustItems) && source.trustItems.length
      ? source.trustItems
          .slice(0, 8)
          .map((item) => {
            const row = item && typeof item === 'object' ? item : {};
            return {
              icon: String(row.icon || 'solar:star-bold-duotone'),
              line1: String(row.line1 || '').trim(),
              line2: String(row.line2 || '').trim(),
              accent: String(row.accent || '#002060'),
            };
          })
          .filter((item) => item.line1 || item.line2 || item.icon)
      : d.trustItems;

  const social =
    Array.isArray(footer.social) && footer.social.length
      ? footer.social
          .map((item) => ({
            icon: String(item?.icon || '').trim(),
            href: String(item?.href || '').trim(),
          }))
          .filter((item) => item.icon)
      : d.footer.social;

  const columns =
    Array.isArray(footer.columns) && footer.columns.length
      ? footer.columns
          .map((col) => ({
            title: String(col?.title || '').trim(),
            links: Array.isArray(col?.links)
              ? col.links
                  .map((link) => ({
                    label: String(link?.label || '').trim(),
                    href: String(link?.href || '').trim(),
                  }))
                  .filter((link) => link.label)
              : [],
          }))
          .filter((col) => col.title)
      : d.footer.columns;

  const languages = Array.isArray(source.languages)
    ? source.languages
        .slice(0, 12)
        .map((item, index) => {
          const row = item && typeof item === 'object' ? item : {};
          const id = String(row.id || row.code || `lang-${index + 1}`).trim();
          const label = String(row.label || row.language || '').trim();
          const flagCode = String(row.flagCode ?? '')
            .trim()
            .toLowerCase();
          return {
            id,
            code: String(row.code || id).trim(),
            label,
            nativeLabel: String(row.nativeLabel ?? '').trim(),
            locale: String(row.locale || row.code || id).trim(),
            language: String(row.language || label).trim(),
            flagCode: flagCode || null,
            icon: String(row.icon || 'solar:global-bold-duotone').trim(),
            note: String(row.note ?? '').trim(),
            selectable: typeof row.selectable === 'boolean' ? row.selectable : false,
          };
        })
        .filter((item) => item.id && item.label)
    : d.languages;

  return {
    hero: {
      eyebrow: String(hero.eyebrow || d.hero.eyebrow),
      titleLine1: String(hero.titleLine1 || d.hero.titleLine1),
      titleLine2: String(hero.titleLine2 || d.hero.titleLine2),
      body: String(hero.body || d.hero.body),
      heroImageUrl: hero.heroImageUrl ? String(hero.heroImageUrl) : null,
    },
    globalLearning: {
      title: String(global.title || d.globalLearning.title),
      points,
      imageUrl: global.imageUrl ? String(global.imageUrl) : null,
      sideCard: {
        icon: String(side.icon || d.globalLearning.sideCard.icon),
        title: String(side.title || d.globalLearning.sideCard.title),
        body: String(side.body || d.globalLearning.sideCard.body),
      },
    },
    trustItems,
    footer: {
      tagline: String(footer.tagline || d.footer.tagline),
      copyrightText: String(footer.copyrightText || d.footer.copyrightText),
      social,
      columns,
    },
    languages,
  };
}
