const neutralTheme = {
  chatAppUi: false,
  accent: '#6b7280',
  accentMuted: 'rgba(107, 114, 128, 0.14)',
  accentStrong: '#4b5563',
  topBar: 'linear-gradient(90deg, #6b7280 0%, #6b7280 100%)',
  rowBg: 'rgba(107, 114, 128, 0.06)',
  rowBorder: 'rgba(107, 114, 128, 0.25)',
};

function isHexColor(value) {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function hexToRgb(hex) {
  const value = hex.replace('#', '').trim();
  if (value.length === 3) {
    return value.split('').map((ch) => parseInt(`${ch}${ch}`, 16));
  }
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
}

function rgbaFromHex(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function extractFirstHex(colorValue) {
  if (typeof colorValue !== 'string') return null;
  const match = colorValue.match(/#([0-9a-f]{3}|[0-9a-f]{6})/i);
  return match ? match[0] : null;
}

function isLinearGradient(value) {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith('linear-gradient(');
}

export function getProviderPromptTheme(providerId, options = {}) {
  const dynamicColor = options?.color;
  const dynamicBgColor = options?.bgColor;

  if (!dynamicColor || typeof dynamicColor !== 'string') {
    return neutralTheme;
  }

  if (!isHexColor(dynamicColor)) {
    const extracted = extractFirstHex(dynamicColor);
    const accentColor = extracted || neutralTheme.accent;
    return {
      ...neutralTheme,
      accent: accentColor,
      accentStrong: accentColor,
      accentMuted: `color-mix(in srgb, ${accentColor} 14%, transparent)`,
      topBar: isLinearGradient(dynamicBgColor || dynamicColor)
        ? (dynamicBgColor || dynamicColor)
        : `linear-gradient(90deg, ${dynamicBgColor || dynamicColor} 0%, ${dynamicBgColor || dynamicColor} 100%)`,
      rowBg: `color-mix(in srgb, ${accentColor} 6%, transparent)`,
      rowBorder: `color-mix(in srgb, ${accentColor} 25%, transparent)`,
      chatBorderAccent: `color-mix(in srgb, ${accentColor} 25%, transparent)`,
    };
  }

  return {
    ...neutralTheme,
    accent: dynamicColor,
    accentStrong: dynamicColor,
    accentMuted: rgbaFromHex(dynamicColor, 0.14),
    topBar: isLinearGradient(dynamicBgColor)
      ? dynamicBgColor
      : `linear-gradient(90deg, ${dynamicBgColor || dynamicColor} 0%, ${dynamicBgColor || dynamicColor} 100%)`,
    rowBg: rgbaFromHex(dynamicColor, 0.06),
    rowBorder: rgbaFromHex(dynamicColor, 0.25),
    chatBorderAccent: rgbaFromHex(dynamicColor, 0.25),
  };
}
