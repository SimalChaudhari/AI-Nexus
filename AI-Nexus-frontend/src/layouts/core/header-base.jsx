import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Badge from '@mui/material/Badge';
import useMediaQuery from '@mui/material/useMediaQuery';
import { styled, useTheme, alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Logo } from 'src/components/logo';

import { HeaderSection } from './header-section';
import { Searchbar } from '../components/searchbar';
import { HeaderSearchBar } from '../components/header-search-bar';
import { MenuButton } from '../components/menu-button';
import { SignInButton } from '../components/sign-in-button';
import { AccountDrawer } from '../components/account-drawer';
// import { SettingsButton } from '../components/settings-button';
import { ContactsPopover } from '../components/contacts-popover';
import { WorkspacesPopover } from '../components/workspaces-popover';
import { NotificationsDrawer } from '../components/notifications-drawer';
import { useAuthContext } from 'src/auth/hooks';
import { useScrollOffSetTop } from 'src/hooks/use-scroll-offset-top';
import { Iconify } from 'src/components/iconify';
import { useCheckoutContext } from 'src/sections/checkout/context';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

const StyledDivider = styled('span')(({ theme }) => ({
  width: 1,
  height: 10,
  flexShrink: 0,
  display: 'none',
  position: 'relative',
  alignItems: 'center',
  flexDirection: 'column',
  marginLeft: theme.spacing(2.5),
  marginRight: theme.spacing(2.5),
  backgroundColor: 'currentColor',
  color: theme.vars.palette.divider,
  '&::before, &::after': {
    top: -5,
    width: 3,
    height: 3,
    content: '""',
    flexShrink: 0,
    borderRadius: '50%',
    position: 'absolute',
    backgroundColor: 'currentColor',
  },
  '&::after': { bottom: -5, top: 'auto' },
}));

// ----------------------------------------------------------------------

export function HeaderBase({
  sx,
  data,
  slots,
  slotProps,
  onOpenNav,
  layoutQuery,

  slotsDisplay: {
    signIn = true,
    account = true,
    helpLink = true,
    settings = true,
    purchase = true,
    contacts = true,
    searchbar = true,
    workspaces = true,
    menuButton = true,
    localization = true,
    notifications = true,
  } = {},

  ...other
}) {
  const theme = useTheme();
  const pathname = usePathname();
  const { authenticated } = useAuthContext();
  const checkout = useCheckoutContext();
  const cartCount = checkout.totalItems;
  const hasItems = cartCount > 0;

  const { offsetTop: headerScrolled } = useScrollOffSetTop();
  /** Matches home header CSS: below this width the bar is solid white, not over the hero */
  const isHomeNarrowSolidHeader = useMediaQuery('(max-width:1080px)');

  const isAdminRoute = pathname?.startsWith('/admin');
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  const isHomeRoute = pathname === '/home' || pathname === '/';
  const isCustomerFacingRoute = !isAdminRoute && !isDashboardRoute;
  /** Home + wide desktop: transparent header over hero — secondary nav text until scroll */
  const homeNavLightOnHero =
    isHomeRoute && isCustomerFacingRoute && !headerScrolled && !isHomeNarrowSolidHeader;
  // Show settings gear and other enabled slot utilities on all routes (e.g. /learning, catalog pages).
  const showUtilityActions = true;
  const showAuthAction = true;

  const mergedSlotProps = {
    ...slotProps,
    toolbar: {
      ...slotProps?.toolbar,
      sx: {
        ...(isCustomerFacingRoute && {
          px: { xs: 0, md: 0 },
          minHeight: 'var(--layout-header-mobile-height)',
          [theme.breakpoints.up(layoutQuery)]: {
            minHeight: 'var(--layout-header-desktop-height)',
          },
        }),
        ...slotProps?.toolbar?.sx,
      },
    },
    container: {
      ...slotProps?.container,
      sx: {
        ...(isCustomerFacingRoute && {
          px: { xs: 0, sm: 2, md: 4, lg: 6 },
          justifyContent: 'space-between',
        }),
        ...(isHomeRoute && {
          alignItems: 'center',
        }),
        ...slotProps?.container?.sx,
      },
    },
  };

  return (
    <HeaderSection
      sx={{
        ...(isCustomerFacingRoute && {
          backgroundColor: isHomeRoute ? 'transparent' : 'rgba(255,255,255,0.25)',
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: isHomeRoute ? 'none' : '1px solid rgba(28,66,112,0.30)',
          color:
            isCustomerFacingRoute && isHomeRoute
              ? homeNavLightOnHero
                ? 'secondary.main'
                : 'text.primary'
              : isCustomerFacingRoute
                ? 'common.white'
                : undefined,
          ...(isHomeRoute && {
            '@media (max-width:1080px)': {
              backgroundColor: 'common.white',
              borderBottom: '1px solid rgba(28,66,112,0.16)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            },
            '& [data-slot="logo-wrapper"]': {
              transition: 'none',
            },
            '&[data-offset-top="false"] [data-slot="logo-wrapper"]': {
              '@media (max-width:1080px)': {
                backgroundColor: 'transparent',
                borderRadius: 0,
                overflow: 'visible',
                boxShadow: 'none',
              },
              '@media (min-width:1081px)': {
                backgroundColor: 'common.white',
                borderRadius: '0 0 24px 24px',
                overflow: 'hidden',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.16)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
            },
            '&[data-offset-top="true"] [data-slot="logo-wrapper"]': {
              backgroundColor: 'transparent',
              borderRadius: 0,
              overflow: 'visible',
              boxShadow: 'none',
            },
          }),
        }),
        ...sx,
      }}
      layoutQuery={layoutQuery}
      disableOffset={false}
      disableElevation={isHomeRoute}
      disableAppBar={false}
      appBarPosition={isCustomerFacingRoute && isHomeRoute ? 'fixed' : 'sticky'}
      offsetSx={
        isHomeRoute
          ? {
              backgroundColor: 'common.white',
              borderBottom: '1px solid rgba(28,66,112,0.16)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }
          : undefined
      }
      slots={{
        ...slots,
        leftAreaStart: slots?.leftAreaStart,
        leftArea: (
          <>
            {slots?.leftAreaStart}

            {menuButton && (
              <MenuButton
                data-slot="menu-button"
                onClick={onOpenNav}
                sx={{
                  display: 'none',
                }}
              />
            )}

            <Box
              data-slot="logo-wrapper"
              sx={
                isCustomerFacingRoute
                  ? {
                      position: 'relative',
                      ml: 0,
                      pl: 0,
                      zIndex: 2,
                    }
                  : undefined
              }
            >
              <Logo
                data-slot="logo"
                sx={
                  isCustomerFacingRoute
                    ? {
                        /* One size on all breakpoints so branding doesn’t scale when the bar reflows */
                        width: { xs: 100, md: 150 },
                        height: 'auto',
                        minHeight: 'unset',
                        display: 'block',
                      }
                    : { pr: 2 }
                }
              />
            </Box>

            {!isCustomerFacingRoute && (
              <>
                <StyledDivider data-slot="divider" />

                {workspaces && <WorkspacesPopover data-slot="workspaces" data={data?.workspaces} />}

                {slots?.leftAreaEnd}
              </>
            )}
          </>
        ),
        centerArea:
          !isCustomerFacingRoute && menuButton && !isAdminRoute ? <HeaderSearchBar /> : null,
        rightArea: (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: isCustomerFacingRoute ? { xs: 1.25, md: 2.5 } : { xs: 1, sm: 1.5 },
            }}
          >
            {slots?.rightAreaStart}

            {showUtilityActions && (
              <Box
                data-area="right"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 1, sm: 1.5 },
                }}
              >
                {helpLink && (
                  <Link
                    data-slot="help-link"
                    href={paths.faqs}
                    component={RouterLink}
                    color="inherit"
                    sx={{ typography: 'subtitle2' }}
                  >
                    Need help?
                  </Link>
                )}

                {searchbar && <Searchbar data-slot="searchbar" data={data?.nav} />}

                {notifications && (
                  <NotificationsDrawer data-slot="notifications" data={data?.notifications} />
                )}

                {contacts && <ContactsPopover data-slot="contacts" data={data?.contacts} />}

                {/* Temporarily hidden settings gear on user-side header */}
                {/* {settings && (
                  <SettingsButton
                    data-slot="settings"
                    sx={{
                      borderRadius: '50%',
                      color: 'common.white',
                      background: (theme) =>
                        `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      '&:hover': {
                        background: (theme) =>
                          `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                      },
                    }}
                  />
                )} */}
              </Box>
            )}

            {showAuthAction &&
              (authenticated
                ? account && <AccountDrawer data-slot="account" data={data?.account} />
                : signIn && <SignInButton data={data?.account} />)}

            {authenticated && isCustomerFacingRoute && (
              <Box
                component={RouterLink}
                to={paths.product.checkout}
                onClick={(event) => {
                  if (cartCount > 0) return;
                  event.preventDefault();
                  toast.info('Cart is empty', {
                    description: 'Add a course to continue checkout.',
                    style: {
                      background: '#0f172a',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                    },
                  });
                }}
                sx={{
                  display: { xs: 'flex', md: 'none' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.primary',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.72),
                  transition: 'none',
                }}
              >
                <Badge showZero badgeContent={cartCount} color="error" max={99}>
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: hasItems ? 'secondary.main' : 'warning.main',
                      color: hasItems ? 'common.white' : 'warning.contrastText',
                      borderRadius: '50%',
                      p: 0.45,
                      '&::after': undefined,
                    }}
                  >
                    <Iconify icon="solar:cart-plus-bold" width={22} />
                  </Box>
                </Badge>
              </Box>
            )}

            {slots?.rightAreaEnd}

            {menuButton && (
              <MenuButton
                data-slot="menu-button-right"
                onClick={onOpenNav}
                sx={{
                  mr: 0,
                  ml: 0.5,
                  color: isCustomerFacingRoute
                    ? homeNavLightOnHero
                      ? 'secondary.main'
                      : 'common.black'
                    : 'inherit',
                  [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
                }}
              />
            )}
          </Box>
        ),
      }}
      slotProps={mergedSlotProps}
      {...other}
    />
  );
}
