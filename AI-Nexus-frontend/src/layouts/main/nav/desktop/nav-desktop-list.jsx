import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Stack from '@mui/material/Stack';
import Portal from '@mui/material/Portal';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ListSubheader from '@mui/material/ListSubheader';

import { usePathname } from 'src/routes/hooks';
import { useActiveLink } from 'src/routes/hooks/use-active-link';
import { isExternalLink, removeLastSlash } from 'src/routes/utils';

import { paper } from 'src/theme/styles';

import { NavLi, NavUl } from 'src/components/nav-section';

import { NavItem, NavItemDashboard } from './nav-desktop-item';

// ----------------------------------------------------------------------

function isPathActive(currentPath, targetPath) {
  if (!targetPath) return false;

  const normalize = (value) => removeLastSlash(String(value).split('#')[0].split('?')[0]);
  const normalizedCurrent = normalize(currentPath);
  const normalizedTarget = normalize(targetPath);

  if (normalizedTarget === '/') {
    return normalizedCurrent === '/';
  }

  return (
    normalizedCurrent === normalizedTarget || normalizedCurrent.startsWith(`${normalizedTarget}/`)
  );
}

function hasActiveInChildren(currentPath, children) {
  if (!Array.isArray(children)) return false;

  return children.some((group) => {
    const items = Array.isArray(group?.items) ? group.items : [];
    return items.some((item) => {
      if (isPathActive(currentPath, item.path)) return true;
      return hasActiveInChildren(currentPath, item.children);
    });
  });
}

export function NavList({ data }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const SUBMENU_BORDER_OFFSET = 1;
  const CLOSE_DELAY_MS = 140;

  const navItemRef = useRef(null);
  const closeTimerRef = useRef(null);

  const pathname = usePathname();
  const currentPath = removeLastSlash(pathname);

  const [openMenu, setOpenMenu] = useState(false);
  const [openedByClick, setOpenedByClick] = useState(false);
  // const [openMenu, setOpenMenu] = useState(true);

  const hasActiveSubItem = hasActiveInChildren(currentPath, data.children);

  const active = useActiveLink(data.path, !!data.children || !!data.deepMatch) || hasActiveSubItem;

  const [clientRect, setClientRect] = useState({
    top: 0,
    height: 0,
    left: 0,
    width: 0,
    anchorBottom: 0,
  });

  const handleGetClientRect = useCallback(() => {
    const element = navItemRef.current;

    if (element) {
      const rect = element.getBoundingClientRect();
      const headerRect = element.closest('header')?.getBoundingClientRect();
      const anchorBottom = headerRect?.bottom ?? rect.top + rect.height;
      setClientRect({
        top: rect.top,
        height: rect.height,
        left: rect.left,
        width: rect.width,
        anchorBottom,
      });
    }
  }, []);

  const handleOpenMenu = useCallback(() => {
    if (data.children && !isMobile) {
      if (openedByClick) {
        return;
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      handleGetClientRect();
      setOpenMenu(true);
    }
  }, [data.children, handleGetClientRect, isMobile, openedByClick]);

  const handleCloseMenu = useCallback(() => {
    if (openedByClick) {
      return;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setOpenMenu(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  }, [openedByClick]);

  const handleCloseMenuImmediate = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpenedByClick(false);
    setOpenMenu(false);
  }, []);

  const handleToggleMenu = useCallback(
    (event) => {
      if (data.children) {
        event.preventDefault();
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        if (isMobile) {
          setOpenedByClick(false);
          setOpenMenu(false);
          return;
        }
        if (openMenu && openedByClick) {
          setOpenedByClick(false);
          setOpenMenu(false);
          return;
        }
        handleGetClientRect();
        setOpenedByClick(true);
        setOpenMenu(true);
      }
    },
    [data.children, handleGetClientRect, isMobile, openMenu, openedByClick]
  );

  useEffect(() => {
    if (openMenu) {
      handleCloseMenuImmediate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (isMobile && openMenu) {
      handleCloseMenuImmediate();
    }
  }, [isMobile, openMenu, handleCloseMenuImmediate]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  const renderNavItem = (
    <NavItem
      ref={navItemRef}
      // slots
      title={data.title}
      path={data.path}
      // state
      active={active}
      hasChild={!!data.children}
      open={data.children && !!openMenu}
      externalLink={isExternalLink(data.path)}
      // action
      onMouseEnter={handleOpenMenu}
      onMouseLeave={handleCloseMenu}
      onClick={handleToggleMenu}
    />
  );

  useEffect(() => {
    handleGetClientRect();

    window.addEventListener('scroll', handleGetClientRect);
    window.addEventListener('resize', handleGetClientRect);

    return () => {
      window.removeEventListener('scroll', handleGetClientRect);
      window.removeEventListener('resize', handleGetClientRect);
    };
  }, [handleGetClientRect]);

  if (data.children) {
    return (
      <NavLi sx={{ height: 1 }}>
        {renderNavItem}

        {openMenu && !isMobile && (
          <Portal>
            <Fade in>
              <Box
                onMouseEnter={handleOpenMenu}
                onMouseLeave={handleCloseMenu}
                sx={{
                  pt: 0,
                  left: Math.round(clientRect.left),
                  position: 'fixed',
                  zIndex: theme.zIndex.modal,
                  minWidth: 180,
                  width: 'max-content',
                  top: Math.round(clientRect.anchorBottom + SUBMENU_BORDER_OFFSET),
                }}
              >
                <Box
                  component="nav"
                  sx={{
                    ...paper({ theme, dropdown: true }),
                    borderRadius: 1,
                    borderTop: `1px solid ${theme.vars.palette.primary.light}`,
                    backgroundImage: `linear-gradient(135deg, ${theme.vars.palette.primary.main} 0%, ${theme.vars.palette.secondary.main} 100%)`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    color: theme.vars.palette.common.white,
                    padding: '8px 0',
                    pt: 0,
                    minWidth: 160,
                    width: 1,
                    overflow: 'hidden',
                  }}
                >
                  <NavUl
                    sx={{
                      gap: 1,
                      width: 1,
                      flexDirection: 'column',
                    }}
                  >
                    {data.children.map((list, index) => (
                      <NavSubList
                        key={list.subheader || `submenu-${index}`}
                        subheader={list.subheader}
                        data={list.items}
                      />
                    ))}
                  </NavUl>
                </Box>
              </Box>
            </Fade>
          </Portal>
        )}
      </NavLi>
    );
  }

  return <NavLi sx={{ height: 1 }}>{renderNavItem}</NavLi>;
}

// ----------------------------------------------------------------------

function NavSubList({ data, subheader, sx, ...other }) {
  const pathname = usePathname();
  const items = Array.isArray(data) ? data : [];
  const currentPath = removeLastSlash(pathname);

  const isDashboard = subheader === 'Dashboard';

  return (
    <Stack
      component={NavLi}
      alignItems="flex-start"
      sx={{
        width: 1,
        ...(isDashboard && { maxWidth: { md: 1 / 3, lg: 540 } }),
        ...sx,
      }}
      {...other}
    >
      <NavUl sx={{ width: 1 }}>
        {subheader && (
          <ListSubheader
            disableSticky
            disableGutters
            sx={{ fontSize: 11, color: 'text.primary', typography: 'overline' }}
          >
            {subheader}
          </ListSubheader>
        )}

        {items.map((item) =>
          isDashboard ? (
            <NavLi key={item.title} sx={{ mt: 1.5 }}>
              <NavItemDashboard path={item.path} />
            </NavLi>
          ) : (
            <NavLi key={item.title} sx={{ mt: 1.5, width: 1 }}>
              <NavItem
                sx={{
                  width: 1,
                  py: 0.5,
                  px: 2.5,
                }}
                subItem
                title={item.title}
                path={item.path}
                active={isPathActive(currentPath, item.path)}
              />
            </NavLi>
          )
        )}
      </NavUl>
    </Stack>
  );
}
