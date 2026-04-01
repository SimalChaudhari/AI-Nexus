import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl, isSocketEnabled } from 'src/utils/socket-config';

/**
 * Subscribe to real-time announcement list events (created, updated, deleted).
 * Join the announcements list room when enabled; cleanup on unmount.
 * Use so the user panel updates when admin creates/updates/deletes announcements.
 *
 * @param {object} callbacks - Handlers for real-time updates
 * @param {function} callbacks.onAnnouncementCreated - (announcement) => void
 * @param {function} callbacks.onAnnouncementUpdated - (announcement) => void
 * @param {function} callbacks.onAnnouncementDeleted - ({ announcementId }) => void
 * @param {object} options - { enabled?: boolean }
 */
export function useAnnouncementsListSocket(callbacks = {}, options = {}) {
  const { enabled = true } = options;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!enabled || !isSocketEnabled()) return () => {};

    const url = getSocketUrl();
    const socket = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      socket.emit('joinAnnouncementsList');
    });

    socket.on('announcement:created', (announcement) => {
      callbacksRef.current.onAnnouncementCreated?.(announcement);
    });

    socket.on('announcement:updated', (announcement) => {
      callbacksRef.current.onAnnouncementUpdated?.(announcement);
    });

    socket.on('announcement:deleted', (payload) => {
      callbacksRef.current.onAnnouncementDeleted?.(payload);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled]);

  return null;
}
