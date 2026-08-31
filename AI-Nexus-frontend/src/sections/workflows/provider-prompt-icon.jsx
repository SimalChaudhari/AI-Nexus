import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import { PROMPT_PROVIDER_ICONS } from './data/prompt-providers';

/** Provider tab/header icon — prefers bundled assets in `src/assets/ai`, then Iconify fallback. */
export function ProviderPromptIcon({
  providerId,
  iconifyIcon,
  imageSrc,
  width = 32,
  height,
  brandColor,
  inCircle = false,
  sx,
}) {
  const src = imageSrc || PROMPT_PROVIDER_ICONS[providerId];
  const sizeSx =
    typeof width === 'object'
      ? { width, height: height ?? width }
      : { width, height: height ?? width };

  const inner =
    src ? (
      <Box
        component="img"
        src={src}
        alt=""
        sx={{
          ...sizeSx,
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />
    ) : iconifyIcon ? (
      <Iconify
        icon={iconifyIcon}
        width={typeof width === 'number' ? width : 32}
        sx={{ color: brandColor || 'text.secondary' }}
      />
    ) : null;

  if (!inner) return null;

  if (!inCircle || !brandColor) {
    return (
      <Box sx={{ display: 'inline-flex', flexShrink: 0, ...sx }}>
        {inner}
      </Box>
    );
  }

  const circleSize =
    typeof width === 'number' ? Math.max(width + 14, 40) : { xs: 40, sm: 44 };

  return (
    <Box
      sx={{
        width: circleSize,
        height: circleSize,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        bgcolor: (t) => alpha(brandColor, t.palette.mode === 'dark' ? 0.22 : 0.12),
        border: `1px solid ${alpha(brandColor, 0.35)}`,
        ...sx,
      }}
    >
      {inner}
    </Box>
  );
}
