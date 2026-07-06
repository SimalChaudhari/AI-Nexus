import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

import { paths } from 'src/routes/paths';
import { CONFIG } from 'src/config-global';
import { getSocketUrl, isSocketEnabled } from 'src/utils/socket-config';
import {
  ensureBrowserNotificationPermission,
  showAnnouncementBrowserNotification,
} from 'src/utils/browser-notification';

async function hasActivePushSubscription() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}

/**
 * Fallback desktop notification when Web Push is not subscribed yet.
 * If the user has a push subscription, the service worker handles popups (avoids duplicates).
 */
export function useAnnouncementBrowserNotifications({ enabled = true } = {}) {
  const permissionRequestedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isSocketEnabled()) return undefined;

    if (!permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      ensureBrowserNotificationPermission();
    }

    const socket = io(getSocketUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      socket.emit('joinAnnouncementsList');
    });

    socket.on('announcement:created', async (announcement) => {
      if (await hasActivePushSubscription()) return;

      showAnnouncementBrowserNotification(announcement, {
        icon: `${CONFIG.site.basePath || ''}/favicon.ico`,
        onClickUrl: paths.announcements,
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled]);
}
