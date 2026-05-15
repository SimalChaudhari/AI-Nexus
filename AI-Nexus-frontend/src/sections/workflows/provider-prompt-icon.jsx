import Box from '@mui/material/Box';

import { Iconify } from 'src/components/iconify';

import { PROMPT_PROVIDER_ICONS } from './data/prompt-providers';

/** Provider tab/header icon — prefers bundled assets in `src/assets/ai`, then Iconify fallback. */
export function ProviderPromptIcon({ providerId, iconifyIcon, imageSrc, width = 32, height, sx }) {
  const src = imageSrc || PROMPT_PROVIDER_ICONS[providerId];
  const sizeSx =
    typeof width === 'object'
      ? { width, height: height ?? width }
      : { width, height: height ?? width };

  if (src) {
    return (
      <Box
        component="img"
        src={src}
        alt=""
        sx={{
          ...sizeSx,
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
          ...sx,
        }}
      />
    );
  }

  if (iconifyIcon) {
    const iconSize = typeof width === 'number' ? width : 32;
    return <Iconify icon={iconifyIcon} width={iconSize} sx={sx} />;
  }

  return null;
}
