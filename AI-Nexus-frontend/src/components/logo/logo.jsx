import { useState, useEffect, forwardRef } from 'react';

import Box from '@mui/material/Box';
import NoSsr from '@mui/material/NoSsr';
import { useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';
import { usePathname } from 'src/routes/hooks';
import { appSettingsService } from 'src/services/app-settings.service';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export const Logo = forwardRef(
  ({ width = 40, height = 40, disableLink = false, className, href = '/', sx, ...other }, ref) => {
    const theme = useTheme();
    const pathname = usePathname();

    const isDark = theme.palette.mode === 'dark';

    // Check if we're on a public route (not admin/dashboard)
    const isPublicRoute = !pathname?.startsWith('/admin') && !pathname?.startsWith('/dashboard');
    const [publicLogoUrl, setPublicLogoUrl] = useState(() => {
      if (typeof window === 'undefined') {
        return '/logo/logo.png';
      }

      return window.localStorage.getItem('public-site-logo-url') || '/logo/logo.png';
    });

    useEffect(() => {
      let active = true;

      if (!isPublicRoute) {
        return undefined;
      }

      appSettingsService
        .getPublic()
        .then((settings) => {
          const nextLogoUrl = settings.logoUrl || '/logo/logo.png';

          if (!active) return;

          setPublicLogoUrl(nextLogoUrl);

          if (typeof window !== 'undefined') {
            window.localStorage.setItem('public-site-logo-url', nextLogoUrl);
          }
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, [isPublicRoute]);

    /*
     * OR using local (public folder)
     * const logo = ( <Box alt="logo" component="img" src={`${CONFIG.site.basePath}/logo/logo-single.svg`} width={width} height={height} /> );
     */
    const logo = isPublicRoute ? (
      <img alt="logo" src={publicLogoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    ) : (
      <img alt="logo" src={isDark ? '/logo/logo-full-dark.svg' : '/logo/logo-full.svg'} />
    );

    return (
      <NoSsr
        fallback={
          <Box
            width={width}
            height={height}
            className={logoClasses.root.concat(className ? ` ${className}` : '')}
            sx={{
              flexShrink: 0,
              display: 'inline-flex',
              verticalAlign: 'middle',
              ...sx,
            }}
          />
        }
      >
        <Box
          ref={ref}
          component={RouterLink}
          href={href}
          width={isPublicRoute ? 'auto' : width}
          height={isPublicRoute ? 'auto' : height}
          className={logoClasses.root.concat(className ? ` ${className}` : '')}
          aria-label="logo"
          sx={{
            flexShrink: 0,
            display: 'inline-flex',
            verticalAlign: 'middle',
            ...(isPublicRoute && {
              width: 'auto',
              height: '10px',
              minHeight: 40,
            }),
            ...(disableLink && { pointerEvents: 'none' }),
            ...sx,
          }}
          {...other}
        >
          {logo}
        </Box>
      </NoSsr>
    );
  }
);
