import { useState, useEffect, forwardRef } from 'react';

import Box from '@mui/material/Box';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { usePathname } from 'src/routes/hooks';
import { appSettingsService } from 'src/services/app-settings.service';

import { logoClasses } from './classes';
import { DEFAULT_SITE_LOGO } from './default-logo';

// ----------------------------------------------------------------------

const HOME_PATHS = [paths.home, '/'];

/** Header logo bounds — prevents full-size image flash before Emotion styles load */
const PUBLIC_LOGO_SX = {
  width: { xs: 88, md: 100 },
  maxWidth: 100,
  height: { xs: 40, md: 44 },
  maxHeight: 48,
  overflow: 'hidden',
  flexShrink: 0,
};

export const Logo = forwardRef(
  (
    { width = 40, height = 40, disableLink = false, className, href = paths.home, sx, onClick, ...other },
    ref
  ) => {
    const pathname = usePathname();

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
    const [logoError, setLogoError] = useState(false);

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

    useEffect(() => {
      setLogoError(false);
    }, [siteLogoUrl]);

    const logoSrc = siteLogoUrl && !logoError ? siteLogoUrl : DEFAULT_SITE_LOGO;

    const handleLogoError = () => {
      if (siteLogoUrl) {
        setLogoError(true);
      }
    };

    /*
     * OR using local (public folder)
     * const logo = ( <Box alt="logo" component="img" src={`${CONFIG.site.basePath}/logo/logo-single.svg`} width={width} height={height} /> );
     */
    const logoImg = (
      <Box
        component="img"
        alt="logo"
        src={logoSrc}
        onError={handleLogoError}
        sx={{
          display: 'block',
          width: '100%',
          height: 'auto',
          maxHeight: '100%',
          objectFit: 'contain',
          objectPosition: 'left center',
        }}
      />
    );

    return (
      <Box
        ref={ref}
        component={RouterLink}
        href={href}
        className={logoClasses.root.concat(className ? ` ${className}` : '')}
        aria-label="logo"
        onClick={handleLogoClick}
        sx={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          verticalAlign: 'middle',
          ...(isPublicRoute
            ? PUBLIC_LOGO_SX
            : {
                width: 130,
                height: 72,
                maxWidth: 130,
                maxHeight: 72,
                overflow: 'hidden',
              }),
          ...(disableLink && { pointerEvents: 'none' }),
          ...sx,
        }}
        {...other}
      >
        {logoImg}
      </Box>
    );
  }
);
