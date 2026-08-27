import { m } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { useBoolean } from 'src/hooks/use-boolean';
import { useAuthContext } from 'src/auth/hooks';
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { varHover } from 'src/components/animate';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomTabs } from 'src/components/custom-tabs';
import { notificationService } from 'src/services/notification.service';
import { getSocketUrl, isSocketEnabled } from 'src/utils/socket-config';
import { enableWebPushForUser } from 'src/utils/web-push';

import { NotificationItem } from './notification-item';

// ----------------------------------------------------------------------

export function NotificationsDrawer({ sx, ...other }) {
  const { authenticated } = useAuthContext();
  const router = useRouter();
  const drawer = useBoolean();

  const [currentTab, setCurrentTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleChangeTab = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!authenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread notification count:', error);
    }
  }, [authenticated]);

  const loadNotifications = useCallback(async () => {
    if (!authenticated) {
      setNotifications([]);
      return;
    }
    try {
      setLoading(true);
      const response = await notificationService.getNotifications({
        page: 1,
        limit: 30,
        unreadOnly: currentTab === 'unread' ? true : undefined,
      });
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [authenticated, currentTab]);

  useEffect(() => {
    if (!authenticated) return undefined;
    refreshUnreadCount();
    enableWebPushForUser().catch(() => {});
    return undefined;
  }, [authenticated, refreshUnreadCount]);

  useEffect(() => {
    if (drawer.value) {
      loadNotifications();
    }
  }, [drawer.value, loadNotifications]);

  useEffect(() => {
    if (!authenticated || !isSocketEnabled()) return undefined;

    const socket = io(getSocketUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      socket.emit('joinNotifications');
    });

    socket.on('notification:created', () => {
      refreshUnreadCount();
      if (drawer.value) {
        loadNotifications();
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [authenticated, drawer.value, loadNotifications, refreshUnreadCount]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isUnRead: false })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (notification.isUnRead) {
        await notificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, isUnRead: false } : item
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }

    drawer.onFalse();
    router.push(notification.link || paths.announcements);
  };

  const tabs = useMemo(
    () => [
      { value: 'all', label: 'All', count: currentTab === 'all' ? notifications.length : notifications.length },
      { value: 'unread', label: 'Unread', count: unreadCount },
    ],
    [notifications.length, currentTab, unreadCount]
  );

  if (!authenticated) {
    return null;
  }

  const renderHead = (
    <Stack direction="row" alignItems="center" sx={{ py: 2, pl: 2.5, pr: 1, minHeight: 68 }}>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Notifications
      </Typography>

      {!!unreadCount && (
        <Tooltip title="Mark all as read">
          <IconButton color="primary" onClick={handleMarkAllAsRead}>
            <Iconify icon="eva:done-all-fill" />
          </IconButton>
        </Tooltip>
      )}

      <IconButton onClick={drawer.onFalse} sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
        <Iconify icon="mingcute:close-line" />
      </IconButton>
    </Stack>
  );

  const renderTabs = (
    <CustomTabs variant="fullWidth" value={currentTab} onChange={handleChangeTab}>
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          iconPosition="end"
          value={tab.value}
          label={tab.label}
          icon={
            <Label
              variant={((tab.value === 'all' || tab.value === currentTab) && 'filled') || 'soft'}
              color={(tab.value === 'unread' && 'info') || 'default'}
            >
              {tab.count}
            </Label>
          }
        />
      ))}
    </CustomTabs>
  );

  const renderList = (
    <Scrollbar>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ py: 8, px: 3, textAlign: 'center', color: 'text.secondary' }}>
          <Iconify icon="solar:bell-off-bold-duotone" width={40} sx={{ mb: 1, opacity: 0.5 }} />
          <Typography variant="body2">No notifications yet</Typography>
        </Box>
      ) : (
        <Box component="ul">
          {notifications.map((notification) => (
            <Box component="li" key={notification.id} sx={{ display: 'flex' }}>
              <NotificationItem notification={notification} onClick={handleNotificationClick} />
            </Box>
          ))}
        </Box>
      )}
    </Scrollbar>
  );

  return (
    <>
      <IconButton
        component={m.button}
        whileTap="tap"
        whileHover="hover"
        variants={varHover(1.05)}
        onClick={drawer.onTrue}
        sx={sx}
        {...other}
      >
        <Badge badgeContent={unreadCount} color="error">
          <SvgIcon>
            <path
              fill="currentColor"
              d="M18.75 9v.704c0 .845.24 1.671.692 2.374l1.108 1.723c1.011 1.574.239 3.713-1.52 4.21a25.794 25.794 0 0 1-14.06 0c-1.759-.497-2.531-2.636-1.52-4.21l1.108-1.723a4.393 4.393 0 0 0 .693-2.374V9c0-3.866 3.022-7 6.749-7s6.75 3.134 6.75 7"
              opacity="0.5"
            />
            <path
              fill="currentColor"
              d="M12.75 6a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0zM7.243 18.545a5.002 5.002 0 0 0 9.513 0c-3.145.59-6.367.59-9.513 0"
            />
          </SvgIcon>
        </Badge>
      </IconButton>

      <Drawer
        open={drawer.value}
        onClose={drawer.onFalse}
        anchor="right"
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{ sx: { width: 1, maxWidth: 420 } }}
      >
        {renderHead}
        {renderTabs}
        {renderList}
        <Box sx={{ p: 1 }}>
          <Button fullWidth size="large" onClick={() => { drawer.onFalse(); router.push(paths.announcements); }}>
            View announcements
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
