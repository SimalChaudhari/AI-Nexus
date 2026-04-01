import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { Label } from 'src/components/label';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { useMockedUser, useAuthContext } from 'src/auth/hooks';

import { AccountButton } from './account-button';
import { SignOutButton } from './sign-out-button';

// ----------------------------------------------------------------------

export function AccountPopover({ data = [], sx, ...other }) {
  const router = useRouter();

  const popover = usePopover();

  const pathname = usePathname();

  const { user: mockedUser } = useMockedUser();
  const { user: authUser } = useAuthContext();

  // Use auth user if available, otherwise use mocked user
  const user = authUser || mockedUser;

  // Format display name from auth user (firstname + lastname) or use existing displayName
  const displayName = user?.displayName ||
    (user?.firstname && user?.lastname ? `${user.firstname} ${user.lastname}` : user?.name) ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'User';

  // Get user role for navigation
  const userRole = user?.role || 'User';

  const handleClickItem = (path, label) => {
    popover.onClose();

    // If Profile is clicked, navigate to common profile page
    if (label === 'Profile') {
      router.push(paths.profile.root);
    } else {
      router.push(path);
    }
  };

  return (
    <>
      <AccountButton
        open={popover.open}
        onClick={popover.onOpen}
        photoURL={user?.photoURL}
        displayName={displayName}
        sx={sx}
        {...other}
      />

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{
          paper: { sx: { p: 0, width: 200 } },
          arrow: { offset: 20 },
        }}
      >
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {displayName}
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {user?.email}
          </Typography>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <MenuList sx={{ p: 1, my: 1 }}>
          {data.map((option) => {
            const rootLabel = pathname.includes('/dashboard') ? 'Home' : 'Dashboard';

            const rootHref = pathname.includes('/dashboard') ? '/' : paths.dashboard.root;

            return (
              <MenuItem
                key={option.label}
                onClick={() => handleClickItem(option.label === 'Home' ? rootHref : option.href, option.label)}
                sx={{
                  py: 1,
                  color: 'text.secondary',
                  '& svg': { width: 24, height: 24 },
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {option.icon}

                <Box component="span">{option.label === 'Home' ? rootLabel : option.label}</Box>

                {option.info && (
                  <Label color="error" sx={{ ml: 1 }}>
                    {option.info}
                  </Label>
                )}
              </MenuItem>
            );
          })}
        </MenuList>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ p: 1 }}>
          <SignOutButton
            size="medium"
            variant="text"
            onClose={popover.onClose}
            sx={{ display: 'block', textAlign: 'left' }}
          />
        </Box>
      </CustomPopover>
    </>
  );
}
