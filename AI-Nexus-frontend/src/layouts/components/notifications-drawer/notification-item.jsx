import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';

import { fDateTimePersonal } from 'src/utils/format-time';
import { CONFIG } from 'src/config-global';

// ----------------------------------------------------------------------

export function NotificationItem({ notification, onClick }) {
  const renderAvatar = (
    <ListItemAvatar>
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'background.neutral' }}
      >
        <Box
          component="img"
          src={`${CONFIG.site.basePath}/assets/icons/notification/ic-mail.svg`}
          sx={{ width: 24, height: 24 }}
        />
      </Stack>
    </ListItemAvatar>
  );

  const renderText = (
    <ListItemText
      disableTypography
      primary={
        <Typography variant="subtitle2" sx={{ mb: 0.25 }}>
          {notification.title}
        </Typography>
      }
      secondary={
        <Stack spacing={0.25}>
          {notification.body ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {notification.body}
            </Typography>
          ) : null}
          <Stack
            direction="row"
            alignItems="center"
            sx={{ typography: 'caption', color: 'text.disabled' }}
            divider={
              <Box
                sx={{
                  width: 2,
                  height: 2,
                  bgcolor: 'currentColor',
                  mx: 0.5,
                  borderRadius: '50%',
                }}
              />
            }
          >
            <span>{fDateTimePersonal(notification.createdAt)}</span>
            {notification.category ? <span>{notification.category}</span> : null}
          </Stack>
        </Stack>
      }
    />
  );

  const renderUnReadBadge = notification.isUnRead && (
    <Box
      sx={{
        top: 26,
        width: 8,
        height: 8,
        right: 20,
        borderRadius: '50%',
        bgcolor: 'info.main',
        position: 'absolute',
      }}
    />
  );

  return (
    <ListItemButton
      disableRipple
      onClick={() => onClick?.(notification)}
      sx={{
        p: 2.5,
        alignItems: 'flex-start',
        borderBottom: (theme) => `dashed 1px ${theme.vars.palette.divider}`,
        bgcolor: notification.isUnRead ? 'action.hover' : 'transparent',
      }}
    >
      {renderUnReadBadge}
      {renderAvatar}
      <Stack sx={{ flexGrow: 1, minWidth: 0 }}>{renderText}</Stack>
    </ListItemButton>
  );
}
