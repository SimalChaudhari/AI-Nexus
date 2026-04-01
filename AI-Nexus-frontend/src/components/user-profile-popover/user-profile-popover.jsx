import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export function UserProfilePopover({ user, children }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  if (!user) {
    return children;
  }

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{ cursor: 'pointer', display: 'inline-flex' }}
      >
        {children}
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              width: 280,
              bgcolor: 'background.paper',
              boxShadow: theme.shadows[20],
              border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
            },
          },
        }}
      >
        <Stack spacing={2} alignItems="center">
            {/* Avatar */}
            <Avatar
              src={user.avatarUrl}
              alt={user.name}
              sx={{
                width: 80,
                height: 80,
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              {user.name?.charAt(0) || '?'}
            </Avatar>

            {/* Name */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {user.name || 'Unknown User'}
              </Typography>

              {user.role && (
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    mb: 1,
                  }}
                >
                  {user.role}
                </Typography>
              )}

              {/* Status or Bio */}
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  px: 2,
                }}
              >
                {user.status || user.bio || "This user's public profile is hidden."}
              </Typography>
            </Box>

            {/* Stats (Optional) */}
            {(user.posts || user.reputation) && (
              <Stack
                direction="row"
                spacing={3}
                sx={{
                  pt: 1.5,
                  borderTop: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                {user.posts !== undefined && (
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {user.posts}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Posts
                    </Typography>
                  </Box>
                )}
                {user.reputation !== undefined && (
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {user.reputation}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Reputation
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}
        </Stack>
      </Popover>
    </>
  );
}

