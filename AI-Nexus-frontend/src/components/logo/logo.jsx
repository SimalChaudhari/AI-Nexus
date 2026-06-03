import { useState, useEffect, forwardRef } from 'react';

import Box from '@mui/material/Box';
import NoSsr from '@mui/material/NoSsr';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { usePathname } from 'src/routes/hooks';
import { appSettingsService } from 'src/services/app-settings.service';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

const HOME_PATHS = [paths.home, '/'];

export const Logo = forwardRef(
  (
    { width = 40, height = 40, disableLink = false, className, href = paths.home, sx, onClick, ...other },
    ref
  ) => {
    const theme = useTheme();
    const pathname = usePathname();

    const isDark = theme.palette.mode === 'dark';

    // Check if we're on a public route (not admin/dashboard)
    const isPublicRoute = !pathname?.startsWith('/admin') && !pathname?.startsWith('/dashboard');

    const isHomeLink = HOME_PATHS.includes(href);
    const isOnHome = HOME_PATHS.includes(pathname);

    const handleLogoClick = (event) => {
      onClick?.(event);
      if (event.defaultPrevented || disableLink || !isHomeLink || !isOnHome) {
        return;
      }
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const [siteLogoUrl, setSiteLogoUrl] = useState(() => {
      if (typeof window === 'undefined') {
        return '';
      }

      return window.localStorage.getItem('site-logo-url') || '';
    });

    useEffect(() => {
      let active = true;

      appSettingsService
        .getPublic()
        .then((settings) => {
          const nextLogoUrl = settings.logoUrl || '';

          if (!active) return;

          setSiteLogoUrl(nextLogoUrl);

          if (typeof window !== 'undefined') {
            if (nextLogoUrl) {
              window.localStorage.setItem('site-logo-url', nextLogoUrl);
            } else {
              window.localStorage.removeItem('site-logo-url');
            }
          }
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, [isPublicRoute]);

    useEffect(() => {
      if (typeof window === 'undefined') return undefined;

      const handleSiteLogoUpdated = (event) => {
        const nextLogoUrl = event?.detail?.logoUrl || '';
        setSiteLogoUrl(nextLogoUrl);
      };

      window.addEventListener('site-logo-updated', handleSiteLogoUpdated);

      return () => {
        window.removeEventListener('site-logo-updated', handleSiteLogoUpdated);
      };
    }, []);

    /*
     * OR using local (public folder)
     * const logo = ( <Box alt="logo" component="img" src={`${CONFIG.site.basePath}/logo/logo-single.svg`} width={width} height={height} /> );
     */
    const logo = isPublicRoute ? (
      <img
        alt="logo"
        src={siteLogoUrl || '/favicon.png'}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    ) : (
      <img
        alt="logo"
        src={siteLogoUrl || (isDark ? '/favicon.png' : '/favicon.png')}
        style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
      />
    );

    const publicLogoSx = isPublicRoute
      ? {
          width: 'auto',
          height: 'auto',
          minHeight: 'unset',
        }
      : undefined;

    return (
      <NoSsr
        fallback={
          <Box
            width={isPublicRoute ? 'auto' : width}
            height={isPublicRoute ? 'auto' : height}
            className={logoClasses.root.concat(className ? ` ${className}` : '')}
            sx={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              verticalAlign: 'middle',
              ...publicLogoSx,
              ...sx,
            }}
          />
        }
      >
        <Box
          ref={ref}
          component={RouterLink}
          href={href}
          width={isPublicRoute ? 'auto' : 130}
          height={isPublicRoute ? 'auto' : 72}
          className={logoClasses.root.concat(className ? ` ${className}` : '')}
          aria-label="logo"
          onClick={handleLogoClick}
          sx={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            verticalAlign: 'middle',
            ...publicLogoSx,
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
