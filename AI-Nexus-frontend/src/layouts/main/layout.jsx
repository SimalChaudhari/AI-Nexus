import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';

import { usePathname } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';
import { useSettingsContext } from 'src/components/settings';

import { Main } from './main';
import { NavMobile } from './nav/mobile';
import { NavDesktop } from './nav/desktop';
// import { Footer, HomeFooter } from './footer'; // footer commented out below
import { HeaderBase } from '../core/header-base';
import { LayoutSection } from '../core/layout-section';
import { navData as mainNavData } from '../config-nav-main';
import { _account } from '../config-nav-account';

// ----------------------------------------------------------------------

export function MainLayout({ sx, data, children }) {
  const theme = useTheme();

  const pathname = usePathname();

  const mobileNavOpen = useBoolean();

  const settings = useSettingsContext();

  const homePage = pathname === '/';

  const layoutQuery = 'md';

  const navData = data?.nav ?? mainNavData;

  return (
    <>
      <NavMobile data={navData} open={mobileNavOpen.value} onClose={mobileNavOpen.onFalse} />

      <LayoutSection
        /** **************************************
         * Header
         *************************************** */
        headerSection={
          <HeaderBase
            layoutQuery={layoutQuery}
            onOpenNav={mobileNavOpen.onTrue}
            data={{
              nav: navData,
              account: _account,
            }}
            slotsDisplay={{
              account: true, // Enable account menu for user profile pages
              helpLink: false,
              contacts: false,
              searchbar: false,
              workspaces: false,
              localization: false,
              notifications: false,
              settings: true,
            }}
            slots={{
              topArea: (
                <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
                  This is an info Alert.
                </Alert>
              ),
              rightAreaStart: (
                <NavDesktop
                  data={navData}
                  sx={{
                    display: 'none',
                    [theme.breakpoints.up(layoutQuery)]: {
                      display: 'flex',
                    },
                  }}
                />
              ),
            }}
          />
        }
        /** **************************************
         * Footer – commented out
         *************************************** */
        footerSection={null}
        // footerSection={homePage ? <HomeFooter /> : <Footer layoutQuery={layoutQuery} />}
        /** **************************************
         * Style
         *************************************** */
        cssVars={{
          '--layout-header-mobile-height': '84px',
          '--layout-header-desktop-height': '104px',
          '--layout-dashboard-content-pt': settings.compactLayout ? theme.spacing(1) : theme.spacing(2),
          '--layout-dashboard-content-pb': settings.compactLayout ? theme.spacing(8) : theme.spacing(10),
          '--layout-dashboard-content-px': settings.compactLayout ? theme.spacing(5) : theme.spacing(3),
        }}
        sx={sx}
      >
        <Main>{children}</Main>
      </LayoutSection>
    </>
  );
}
