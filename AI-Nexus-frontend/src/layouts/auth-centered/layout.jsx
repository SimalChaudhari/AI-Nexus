import Alert from '@mui/material/Alert';

import { useBoolean } from 'src/hooks/use-boolean';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { stylesMode } from 'src/theme/styles';

import { Main } from './main';
import { HeaderBase } from '../core/header-base';
import { LayoutSection } from '../core/layout-section';

// ----------------------------------------------------------------------

export function AuthCenteredLayout({ sx, children, showHeader = true }) {
  const mobileNavOpen = useBoolean();
  const pathname = usePathname();

  const layoutQuery = 'md';
  const isWideDesktopSignupPage =
    pathname === paths.auth.simple.signUp || pathname === paths.auth.simple.corporateSignUp;

  return (
    <LayoutSection
      /** **************************************
       * Header
       *************************************** */
      headerSection={
        showHeader ? (
          <HeaderBase
            disableElevation
            layoutQuery={layoutQuery}
            onOpenNav={mobileNavOpen.onTrue}
            slotsDisplay={{
              signIn: false,
              account: false,
              purchase: false,
              contacts: false,
              searchbar: false,
              workspaces: false,
              menuButton: false,
              localization: false,
              notifications: false,
              helpLink: false,
              settings: true,
            }}
            slots={{
              topArea: (
                <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
                  This is an info Alert.
                </Alert>
              ),
            }}
            slotProps={{ container: { maxWidth: false } }}
            sx={{ position: { [layoutQuery]: 'fixed' } }}
          />
        ) : null
      }
      /** **************************************
       * Footer
       *************************************** */
      footerSection={null}
      /** **************************************
       * Style
       *************************************** */
      cssVars={{
        '--layout-auth-content-width': '420px',
      }}
      sx={{
        '--layout-auth-content-width': {
          xs: '420px',
          md: isWideDesktopSignupPage ? '920px' : '420px',
          lg: isWideDesktopSignupPage ? '1040px' : '420px',
        },
        '&::before': {
          width: 1,
          height: 1,
          zIndex: 1,
          content: "''",
          opacity: 0.24,
          position: 'fixed',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundImage: `url(${CONFIG.site.basePath}/assets/background/background-3-blur.webp)`,
          [stylesMode.dark]: { opacity: 0.08 },
        },
        ...sx,
      }}
    >
      <Main layoutQuery={layoutQuery}>{children}</Main>
    </LayoutSection>
  );
}
