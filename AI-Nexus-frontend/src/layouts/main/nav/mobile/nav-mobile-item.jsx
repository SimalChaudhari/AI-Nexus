import { forwardRef } from 'react';

import Box from '@mui/material/Box';
import { styled, alpha } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';

import { varAlpha } from 'src/theme/styles';

import { Iconify } from 'src/components/iconify';
import { useNavItem } from 'src/components/nav-section/hooks';

// ----------------------------------------------------------------------

function NavItemIcon({ icon, iconColor, active, open, subItem }) {
  if (!icon) {
    return null;
  }

  const iconNode =
    typeof icon === 'string' ? (
      <Iconify
        icon={icon}
        width={subItem ? 18 : 20}
        sx={{
          color: iconColor || 'inherit',
          '--iconify-color': iconColor || undefined,
        }}
      />
    ) : (
      icon
    );

  const size = subItem ? 32 : 36;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1.25,
        flexShrink: 0,
        color: iconColor || (active ? 'primary.main' : open ? 'secondary.main' : 'text.secondary'),
        ...(iconColor
          ? {
              background: `linear-gradient(145deg, ${alpha(iconColor, active ? 0.28 : 0.18)} 0%, ${alpha(iconColor, active ? 0.12 : 0.06)} 100%)`,
              border: `1px solid ${alpha(iconColor, active ? 0.36 : 0.22)}`,
              boxShadow: active ? `0 4px 10px ${alpha(iconColor, 0.22)}` : 'none',
            }
          : {
              bgcolor: (theme) =>
                active
                  ? varAlpha(theme.vars.palette.primary.mainChannel, 0.12)
                  : open
                    ? varAlpha(theme.vars.palette.secondary.mainChannel, 0.1)
                    : varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
            }),
        transition: (theme) =>
          theme.transitions.create(['background-color', 'box-shadow', 'border-color', 'color'], {
            duration: theme.transitions.duration.shorter,
          }),
      }}
    >
      {iconNode}
    </Box>
  );
}

// ----------------------------------------------------------------------

export const NavItem = forwardRef(
  ({ title, path, icon, iconColor, open, active, hasChild, externalLink, ...other }, ref) => {
    const navItem = useNavItem({
      path,
      icon,
      hasChild,
      externalLink,
    });

    return (
      <StyledNavItem
        ref={ref}
        aria-label={title}
        open={open}
        active={active}
        {...navItem.baseProps}
        {...other}
      >
        <NavItemIcon
          icon={icon || navItem.renderIcon}
          iconColor={iconColor}
          active={active}
          open={open}
        />

        <Box component="span" sx={{ flex: '1 1 auto', textAlign: 'left' }}>
          {title}
        </Box>

        {hasChild && (
          <Box
            sx={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              flexShrink: 0,
              color: open || active ? 'primary.main' : 'text.disabled',
              bgcolor: (theme) =>
                open || active
                  ? varAlpha(theme.vars.palette.primary.mainChannel, 0.08)
                  : varAlpha(theme.vars.palette.grey['500Channel'], 0.06),
            }}
          >
            <Iconify
              width={16}
              icon={open ? 'eva:arrow-ios-downward-fill' : 'eva:arrow-ios-forward-fill'}
            />
          </Box>
        )}
      </StyledNavItem>
    );
  }
);

// ----------------------------------------------------------------------

const StyledNavItem = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'open',
})(({ active, open, theme }) => ({
  ...theme.typography.subtitle2,
  fontSize: theme.typography.pxToRem(14),
  fontWeight: 600,
  letterSpacing: 0,
  textTransform: 'none',
  lineHeight: 1.4,
  gap: 12,
  minHeight: 52,
  width: '100%',
  padding: theme.spacing(1, 1.25),
  borderRadius: theme.shape.borderRadius * 1.5,
  color: theme.vars.palette.text.primary,
  justifyContent: 'flex-start',
  border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.1)}`,
  backgroundColor: theme.vars.palette.background.paper,
  transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'color'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.04),
    borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
  },
  ...(active && {
    color: theme.vars.palette.primary.main,
    backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
    borderColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.22),
    boxShadow: `0 4px 14px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.1)}`,
    '&:hover': {
      backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
    },
  }),
  ...(open && {
    color: theme.vars.palette.secondary.main,
    backgroundColor: varAlpha(theme.vars.palette.secondary.mainChannel, 0.06),
    borderColor: varAlpha(theme.vars.palette.secondary.mainChannel, 0.18),
  }),
}));

// ----------------------------------------------------------------------

export const NavSubItem = forwardRef(
  ({ title, path, icon, iconColor, active, externalLink, ...other }, ref) => {
    const navItem = useNavItem({
      path,
      icon,
      hasChild: false,
      externalLink,
    });

    return (
      <StyledSubNavItem
        ref={ref}
        aria-label={title}
        active={active}
        {...navItem.baseProps}
        {...other}
      >
        <NavItemIcon icon={icon} iconColor={iconColor} active={active} subItem />

        <Box component="span" sx={{ flex: '1 1 auto', textAlign: 'left' }}>
          {title}
        </Box>
      </StyledSubNavItem>
    );
  }
);

// ----------------------------------------------------------------------

const StyledSubNavItem = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'active',
})(({ active, theme }) => ({
  ...theme.typography.body2,
  fontSize: theme.typography.pxToRem(13),
  fontWeight: active ? 600 : 500,
  letterSpacing: 0,
  textTransform: 'none',
  lineHeight: 1.4,
  gap: 10,
  minHeight: 44,
  width: '100%',
  padding: theme.spacing(0.75, 1),
  borderRadius: theme.shape.borderRadius * 1.25,
  color: active ? theme.vars.palette.primary.main : theme.vars.palette.text.secondary,
  justifyContent: 'flex-start',
  backgroundColor: 'transparent',
  transition: theme.transitions.create(['background-color', 'color'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    color: theme.vars.palette.text.primary,
    backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.06),
  },
  ...(active && {
    color: theme.vars.palette.primary.main,
    backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
    '&:hover': {
      backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.1),
    },
  }),
}));
