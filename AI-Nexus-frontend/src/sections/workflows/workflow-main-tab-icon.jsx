import Box from '@mui/material/Box';

import { Iconify } from 'src/components/iconify';

export function WorkflowMainTabIcon({ imageSrc, iconifyIcon, active, width = 22, sx }) {
  const sizeSx =
    typeof width === 'object' ? { width, height: width } : { width, height: width };

  if (imageSrc) {
    return (
      <Box
        component="img"
        src={imageSrc}
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
    const iconSize = typeof width === 'number' ? width : 22;
    return (
      <Iconify
        icon={iconifyIcon}
        width={iconSize}
        sx={{
          color: active ? 'common.white' : 'text.secondary',
          ...sx,
        }}
      />
    );
  }

  return null;
}
