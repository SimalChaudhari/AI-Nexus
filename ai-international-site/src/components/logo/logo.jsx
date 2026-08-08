'use client';

import { forwardRef } from 'react';
import Link from 'next/link';

import Box from '@mui/material/Box';

import { paths } from 'src/routes/paths';
import { logoClasses } from './classes';

const PUBLIC_LOGO_SX = {
  width: 'auto',
  maxWidth: { xs: 88, md: 100 },
  height: { xs: 32, md: 36 },
  maxHeight: 40,
  objectFit: 'contain',
  objectPosition: 'left center',
  overflow: 'hidden',
  flexShrink: 0,
};

export const Logo = forwardRef(
  ({ width = 40, height = 40, disableLink = false, className, href = paths.home, sx, ...other }, ref) => {
    const logo = (
      <Box
        ref={ref}
        component="img"
        alt="AI Nexus"
        src="/logo/nexus.png"
        className={logoClasses.root.concat(className ? ` ${className}` : '')}
        sx={{
          width,
          height,
          display: 'inline-flex',
          ...PUBLIC_LOGO_SX,
          ...sx,
        }}
        {...other}
      />
    );

    if (disableLink) {
      return logo;
    }

    return (
      <Box
        component={Link}
        href={href}
        sx={{ display: 'inline-flex', lineHeight: 0, textDecoration: 'none' }}
      >
        {logo}
      </Box>
    );
  }
);

Logo.displayName = 'Logo';
