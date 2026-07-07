import { useState, useCallback, useEffect, useMemo } from 'react';

import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';

import { usePathname } from 'src/routes/hooks';
import { isExternalLink, removeLastSlash } from 'src/routes/utils';
import { useActiveLink } from 'src/routes/hooks/use-active-link';
import { paths } from 'src/routes/paths';

import { varAlpha } from 'src/theme/styles';

import { NavLi, NavUl } from 'src/components/nav-section';
import { useAnnouncementUnreadCount } from 'src/hooks/use-announcement-unread-count';

import { NavItem, NavSubItem } from './nav-mobile-item';

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

function flattenChildItems(children) {
  if (!Array.isArray(children)) return [];

  return children.flatMap((group) => (Array.isArray(group?.items) ? group.items : []));
}

// ----------------------------------------------------------------------

export function NavList({ data }) {
  const pathname = usePathname();
  const currentPath = removeLastSlash(pathname);
  const subItems = flattenChildItems(data.children);
  const hasActiveSubItem = subItems.some((item) => isPathActive(currentPath, item.path));
  const tracksAnnouncements = useMemo(
    () => subItems.some((item) => item.path === paths.announcements),
    [subItems]
  );
  const { count: announcementUnreadCount } = useAnnouncementUnreadCount({
    enabled: tracksAnnouncements,
  });

  const active = useActiveLink(data.path, !!data.children || !!data.deepMatch) || hasActiveSubItem;

  const [openMenu, setOpenMenu] = useState(hasActiveSubItem);

  useEffect(() => {
    if (hasActiveSubItem) {
      setOpenMenu(true);
    }
  }, [hasActiveSubItem]);

  const handleToggleMenu = useCallback(
    (event) => {
      if (data.children) {
        event.preventDefault();
        event.stopPropagation();
        setOpenMenu((prev) => !prev);
      }
    },
    [data.children]
  );

  const renderNavItem = (
    <NavItem
      path={data.path}
      icon={data.icon}
      iconColor={data.iconColor}
      title={data.title}
      active={active}
      hasChild={!!data.children}
      open={data.children && !!openMenu}
      showDot={tracksAnnouncements && announcementUnreadCount > 0}
      externalLink={isExternalLink(data.path)}
      onClick={handleToggleMenu}
    />
  );

  if (data.children) {
    return (
      <NavLi>
        {renderNavItem}

        <Collapse in={openMenu} unmountOnExit>
          <Box
            sx={{
              mt: 0.5,
              ml: 1.75,
              pl: 1.5,
              borderLeft: (theme) =>
                `2px solid ${varAlpha(theme.vars.palette.secondary.mainChannel, 0.35)}`,
              bgcolor: (theme) => varAlpha(theme.vars.palette.secondary.mainChannel, 0.06),
              borderRadius: 1,
            }}
          >
            <NavUl sx={{ gap: 0.25, py: 0.5 }}>
              {subItems.map((item) => (
                <NavLi key={item.title}>
                  <NavSubItem
                    title={item.title}
                    path={item.path}
                    icon={item.icon}
                    iconColor={item.iconColor}
                    badge={item.path === paths.announcements ? announcementUnreadCount : 0}
                    active={isPathActive(currentPath, item.path)}
                    externalLink={isExternalLink(item.path)}
                  />
                </NavLi>
              ))}
            </NavUl>
          </Box>
        </Collapse>
      </NavLi>
    );
  }

  return <NavLi>{renderNavItem}</NavLi>;
}
