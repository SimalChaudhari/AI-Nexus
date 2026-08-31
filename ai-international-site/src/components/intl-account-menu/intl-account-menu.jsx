'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { useIntlAuth } from 'src/auth/intl-auth-context';
import { notifyNavigationStart } from 'src/components/navigation-progress';
import { INTL_NAVY, INTL_RED } from 'src/theme/intl-brand';
import { navigateToAuthPath } from 'src/utils/intl-auth-navigate';

// ----------------------------------------------------------------------

function getDisplayName(user) {
  if (!user) return 'User';
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (user.username) return user.username;
  if (user.email) return String(user.email).split('@')[0];
  return 'User';
}

function getInitials(user) {
  const name = getDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * Top-right account control. User comes from root IntlAuthProvider so
 * dashboard ↔ profile navigations do not remount/flash this control.
 */
function IntlAccountMenuComponent({ sx }) {
  const router = useRouter();
  const { user, ready, signOut } = useIntlAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = () => {
    handleClose();
    notifyNavigationStart();
    signOut();
    navigateToAuthPath(router, paths.auth.signIn);
  };

  useEffect(() => {
    if (!open || !user) return;
    router.prefetch(paths.profile);
    router.prefetch(paths.dashboard);
  }, [open, user, router]);

  if (!ready && !user) {
    return (
      <Box
        sx={{
          width: { xs: 44, sm: 140 },
          height: 40,
          borderRadius: 999,
          bgcolor: alpha(INTL_NAVY, 0.06),
          border: `1px solid ${alpha(INTL_NAVY, 0.08)}`,
          flexShrink: 0,
          ...sx,
        }}
      />
    );
  }

  if (!user) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, ...sx }}>
        <Button
          component={Link}
          href={paths.auth.signIn}
          prefetch={false}
          onClick={(e) => {
            e.preventDefault();
            notifyNavigationStart();
            router.push(paths.auth.signIn);
            window.setTimeout(() => {
              if (window.location.pathname !== paths.auth.signIn) {
                window.location.assign(paths.auth.signIn);
              }
            }, 700);
          }}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            color: INTL_NAVY,
            minWidth: 0,
            px: 1.5,
            py: 0.75,
            borderRadius: 999,
            border: `1px solid ${alpha(INTL_NAVY, 0.14)}`,
            bgcolor: '#fff',
            '&:hover': { bgcolor: alpha(INTL_NAVY, 0.04) },
          }}
        >
          Sign in
        </Button>
        <Button
          component={Link}
          href={paths.auth.signUp}
          prefetch={false}
          onClick={(e) => {
            e.preventDefault();
            notifyNavigationStart();
            router.push(paths.auth.signUp);
            window.setTimeout(() => {
              if (window.location.pathname !== paths.auth.signUp) {
                window.location.assign(paths.auth.signUp);
              }
            }, 700);
          }}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            color: '#fff',
            minWidth: 0,
            px: 1.5,
            py: 0.75,
            borderRadius: 999,
            bgcolor: INTL_NAVY,
            '&:hover': { bgcolor: alpha(INTL_NAVY, 0.9) },
          }}
        >
          Sign up
        </Button>
      </Stack>
    );
  }

  const displayName = getDisplayName(user);

  return (
    <Box sx={{ display: 'inline-flex', flexShrink: 0, ...sx }}>
      <Button
        onClick={handleOpen}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        sx={{
          minWidth: 0,
          px: 1,
          py: 0.5,
          borderRadius: 999,
          textTransform: 'none',
          color: INTL_NAVY,
          border: `1px solid ${alpha(INTL_NAVY, 0.14)}`,
          bgcolor: '#fff',
          boxShadow: `0 4px 14px ${alpha(INTL_NAVY, 0.06)}`,
          '&:hover': {
            bgcolor: alpha(INTL_NAVY, 0.04),
            borderColor: alpha(INTL_NAVY, 0.28),
          },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar
            src={user.avatarUrl || undefined}
            alt={displayName}
            sx={{
              width: 32,
              height: 32,
              fontSize: 13,
              fontWeight: 700,
              bgcolor: alpha(INTL_NAVY, 0.12),
              color: INTL_NAVY,
            }}
          >
            {getInitials(user)}
          </Avatar>
          <Typography
            sx={{
              display: { xs: 'none', sm: 'block' },
              fontWeight: 700,
              fontSize: 13.5,
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </Typography>
          <Iconify
            icon="eva:arrow-ios-downward-fill"
            width={16}
            sx={{
              color: alpha(INTL_NAVY, 0.55),
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </Stack>
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disableRestoreFocus
        disableScrollLock
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 220,
              p: 0,
              overflow: 'hidden',
              borderRadius: 2,
              border: `1px solid ${alpha(INTL_NAVY, 0.1)}`,
              boxShadow: `0 12px 32px ${alpha(INTL_NAVY, 0.14)}`,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" noWrap sx={{ color: INTL_NAVY, fontWeight: 700 }}>
            {displayName}
          </Typography>
          {user.email ? (
            <Typography variant="caption" noWrap sx={{ color: alpha(INTL_NAVY, 0.65), display: 'block' }}>
              {user.email}
            </Typography>
          ) : null}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <MenuList sx={{ p: 1 }}>
          <MenuItem
            component={Link}
            href={paths.profile}
            prefetch
            onClick={() => {
              notifyNavigationStart();
              handleClose();
            }}
            sx={{
              borderRadius: 1,
              py: 1,
              gap: 1.25,
              color: alpha(INTL_NAVY, 0.8),
              '&:hover': { bgcolor: alpha(INTL_NAVY, 0.06), color: INTL_NAVY },
            }}
          >
            <Iconify icon="solar:user-bold-duotone" width={20} />
            Profile
          </MenuItem>
          <MenuItem
            onClick={handleLogout}
            sx={{
              borderRadius: 1,
              py: 1,
              gap: 1.25,
              color: INTL_RED,
              '&:hover': { bgcolor: alpha(INTL_RED, 0.08), color: INTL_RED },
            }}
          >
            <Iconify icon="solar:logout-2-bold-duotone" width={20} />
            Logout
          </MenuItem>
        </MenuList>
      </Popover>
    </Box>
  );
}

export const IntlAccountMenu = memo(IntlAccountMenuComponent);
