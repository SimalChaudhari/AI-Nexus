export const FOOTER_STATS_MAX = 4;
export const FOOTER_LINKS_MAX = 8;

const emptyStat = () => ({
  value: '',
  label: '',
  icon: '',
  useLiveEnrollment: false,
});

function normalizeStat(row) {
  const source = row && typeof row === 'object' ? row : {};
  return {
    value: source.value != null ? String(source.value) : '',
    label: source.label != null ? String(source.label) : '',
    icon: source.icon != null ? String(source.icon) : '',
    useLiveEnrollment: Boolean(source.useLiveEnrollment),
  };
}

function normalizeLink(row) {
  const source = row && typeof row === 'object' ? row : {};
  return {
    label: source.label != null ? String(source.label) : '',
    path: source.path != null ? String(source.path) : '',
    external: Boolean(source.external),
    icon: source.icon != null ? String(source.icon) : '',
  };
}

export function normalizeFooterContent(source) {
  if (!source || typeof source !== 'object') {
    return {
      domainLine: '',
      copyrightText: '',
      stats: Array.from({ length: FOOTER_STATS_MAX }, () => emptyStat()),
      links: [],
    };
  }

  const rawStats = Array.isArray(source.stats) ? source.stats : [];

  return {
    domainLine: source.domainLine != null ? String(source.domainLine) : '',
    copyrightText: source.copyrightText != null ? String(source.copyrightText) : '',
    stats: Array.from({ length: FOOTER_STATS_MAX }, (_, index) => normalizeStat(rawStats[index])),
    links: (Array.isArray(source.links) ? source.links : [])
      .slice(0, FOOTER_LINKS_MAX)
      .map((row) => normalizeLink(row)),
  };
}

export function resolveFooterContent(source) {
  return normalizeFooterContent(source);
}
