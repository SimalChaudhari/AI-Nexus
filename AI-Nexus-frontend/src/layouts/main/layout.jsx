import Alert from '@mui/material/Alert';
import { useEffect } from 'react';
import { useTheme } from '@mui/material/styles';

import { usePathname } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { prefetchMainPages } from 'src/routes/prefetch-main-pages';

import { useBoolean } from 'src/hooks/use-boolean';
import { useSettingsContext } from 'src/components/settings';

import { Main } from './main';
import { NavMobile } from './nav/mobile';
import { NavDesktop } from './nav/desktop';
import { Footer } from './footer';
import { HeaderBase } from '../core/header-base';
import { LayoutSection } from '../core/layout-section';
import { navData as mainNavData } from '../config-nav-main';
import { _account } from '../config-nav-account';
import { ChatbotWidget } from 'src/components/chatbot/chatbot-widget';

import { layoutClasses } from '../classes';

// ----------------------------------------------------------------------

export function MainLayout({ sx, data, children }) {
  const theme = useTheme();

  const pathname = usePathname();

  const mobileNavOpen = useBoolean();

  const settings = useSettingsContext();

  const homePage = pathname === '/home';
  const partnerWithIscaPage = pathname === paths.partnerWithIsca;
  const marketingLandingPage = homePage || partnerWithIscaPage;
  const isAdminRoute = pathname?.startsWith('/admin');
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  const isCustomerFacingRoute = !isAdminRoute && !isDashboardRoute;

  const hideFooterOnLearning =
    pathname === paths.learning || pathname.startsWith(`${paths.learning}/`);

  /** Course player: fill viewport below header; lesson/quiz scroll inside, not on body. */
  const isLearningCoursePlayer = /^\/learning\/course\/[^/]+\/learn/.test(pathname);

  const layoutQuery = 'md';

  const navData = data?.nav ?? mainNavData;

  useEffect(() => {
    prefetchMainPages();
  }, []);

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
         * Footer (stats + dynamic contact + links)
         *************************************** */
        footerSection={
          marketingLandingPage || hideFooterOnLearning ? null : <Footer layoutQuery={layoutQuery} />
        }
        /** **************************************
         * Style
         *************************************** */
        cssVars={{
          '--layout-header-mobile-height': '64px',
          '--layout-header-desktop-height': '72px',
          '--layout-dashboard-content-pt': settings.compactLayout ? theme.spacing(1) : theme.spacing(2),
          '--layout-dashboard-content-pb': settings.compactLayout ? theme.spacing(8) : theme.spacing(10),
          '--layout-dashboard-content-px': settings.compactLayout ? theme.spacing(5) : theme.spacing(3),
        }}
        sx={{
          ...(isCustomerFacingRoute && {
            [`& .${layoutClasses.content}`]: {
              width: '100%',
              maxWidth: '1400px',
              mx: 'auto',
              px: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 },
            },
          }),
          ...(isLearningCoursePlayer && {
            height: '100dvh',
            maxHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            [`& .${layoutClasses.header}`]: { flexShrink: 0 },
            [`& .${layoutClasses.main}`]: { flex: '1 1 0%', minHeight: 0 },
          }),
          ...(marketingLandingPage && { bgcolor: '#ffffff' }),
          ...sx,
        }}
      >
        <Main
          sx={
            isLearningCoursePlayer
              ? {
                  flex: '1 1 0%',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }
              : marketingLandingPage
                ? {
                    flex: '1 1 auto',
                    bgcolor: '#ffffff',
                  }
                : undefined
          }
        >
          {children}
        </Main>
        {marketingLandingPage ? <ChatbotWidget title="AI Nexus Chatbot" /> : null}
      </LayoutSection>
    </>
  );
}
