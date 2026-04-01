import { m } from 'framer-motion';
import { forwardRef } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { styled } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import CardActionArea from '@mui/material/CardActionArea';

import { RouterLink } from 'src/routes/components';
import { usePathname } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';
import { useNavItem } from 'src/components/nav-section/hooks';

// ----------------------------------------------------------------------

export const NavItem = forwardRef(
  ({ title, path, open, active, hasChild, externalLink, subItem, ...other }, ref) => {
    const pathname = usePathname();
    const navItem = useNavItem({ path, hasChild, externalLink });
    const isCustomerFacingRoute =
      !pathname?.startsWith('/admin') && !pathname?.startsWith('/dashboard');

    return (
      <StyledNavItem
        disableRipple
        ref={ref}
        aria-label={title}
        open={open}
        active={active}
        subItem={subItem}
        customerHeader={isCustomerFacingRoute}
        {...navItem.baseProps}
        {...other}
      >
        {title}

        {hasChild && (
          <Iconify
            width={16}
            icon="eva:arrow-ios-downward-fill"
            sx={{
              ml: 0.75,
              transition: (theme) =>
                theme.transitions.create(['transform', 'color'], {
                  duration: theme.transitions.duration.shorter,
                }),
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              color: open || active ? 'primary.main' : 'inherit',
            }}
          />
        )}
      </StyledNavItem>
    );
  }
);

// ----------------------------------------------------------------------

const StyledNavItem = styled(ButtonBase, {
  shouldForwardProp: (prop) =>
    prop !== 'active' && prop !== 'open' && prop !== 'subItem' && prop !== 'customerHeader',
})(({ active, open, subItem, customerHeader, theme }) => {
  const rootItem = !subItem;

  const baseStyles = {
    item: {
      ...theme.typography.body2,
      fontWeight: customerHeader ? 600 : theme.typography.fontWeightMedium,
      transition: theme.transitions.create(['color', 'background-color', 'border-color', 'box-shadow'], {
        duration: theme.transitions.duration.shorter,
      }),
    },
  };

  return {
    /**
     * Root item
     */
    ...(rootItem && {
      ...baseStyles.item,
      height: '100%',
      position: 'relative',
      color: customerHeader ? theme.vars.palette.common.black : theme.vars.palette.text.primary,
      fontSize: customerHeader ? theme.typography.pxToRem(14) : undefined,
      letterSpacing: customerHeader ? '0.08em' : undefined,
      textTransform: customerHeader ? 'uppercase' : undefined,
      lineHeight: 1,
      '&:hover': {
        opacity: 1,
        color: customerHeader ? theme.vars.palette.primary.main : undefined,
      },
      ...(active && {
        color: customerHeader ? theme.vars.palette.primary.main : theme.vars.palette.primary.main,
      }),
      ...(open && {
        opacity: 1,
        color: customerHeader ? theme.vars.palette.primary.main : undefined,
      }),
    }),

    /**
     * Sub item
     */
    ...(subItem && {
      ...baseStyles.item,
      justifyContent: 'flex-start',
      color: theme.vars.palette.common.white,
      fontSize: theme.typography.pxToRem(13),
      position: 'relative',
      borderRadius: 8,
      border: '1px solid transparent',
      transition: theme.transitions.create(['background-color', 'color', 'border-color', 'box-shadow'], {
        duration: theme.transitions.duration.shorter,
      }),
      '&:hover': {
        color: theme.vars.palette.common.white,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderColor: 'rgba(255, 255, 255, 0.28)',
      },
      ...(active && {
        color: theme.vars.palette.common.white,
        fontWeight: theme.typography.fontWeightSemiBold,
        backgroundColor: 'rgba(255, 255, 255, 0.26)',
        borderColor: 'rgba(255, 255, 255, 0.45)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
      }),
    }),
  };
});

// ----------------------------------------------------------------------

export function NavItemDashboard({ path, sx, ...other }) {
  return (
    <Link component={RouterLink} href={path} sx={{ width: 1, height: 1 }} {...other}>
      <CardActionArea
        sx={{
          height: 1,
          minHeight: 360,
          borderRadius: 1.5,
          color: 'text.disabled',
          bgcolor: 'background.neutral',
          px: { md: 3, lg: 10 },
          ...sx,
        }}
      >
        <m.div
          whileTap="tap"
          whileHover="hover"
          variants={{ hover: { scale: 1.02 }, tap: { scale: 0.98 } }}
        >
          <Box
            component="img"
            alt="illustration-dashboard"
            src={`${CONFIG.site.basePath}/assets/illustrations/illustration-dashboard.webp`}
            sx={{
              width: 640,
              objectFit: 'cover',
              aspectRatio: '4/3',
            }}
          />
        </m.div>
      </CardActionArea>
    </Link>
  );
}
