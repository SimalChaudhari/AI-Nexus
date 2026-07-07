import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import { useAuthContext } from 'src/auth/hooks';
import { notificationService } from 'src/services/notification.service';
import { getSocketUrl, isSocketEnabled } from 'src/utils/socket-config';

const REFRESH_EVENT = 'announcement-unread-refresh';

export function refreshAnnouncementUnreadCount() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  }
}

/**
 * Unread announcement notification count for nav badge + announcements page.
 */
export function useAnnouncementUnreadCount({ enabled = true } = {}) {
  const { authenticated } = useAuthContext();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled || !authenticated) {
      setCount(0);
      return 0;
    }
    try {
      const next = await notificationService.getUnreadCount();
      setCount(next);
      return next;
    } catch (error) {
      console.error('Failed to load announcement unread count:', error);
      return 0;
    }
  }, [authenticated, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onRefresh = () => {
      refresh();
    };
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || !authenticated || !isSocketEnabled()) return undefined;

    const socket = io(getSocketUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      socket.emit('joinNotifications');
    });

    socket.on('notification:created', () => {
      refresh();
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [authenticated, enabled, refresh]);

  return { count, refresh };
}
