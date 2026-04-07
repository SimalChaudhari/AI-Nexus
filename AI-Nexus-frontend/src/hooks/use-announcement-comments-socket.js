import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl, isSocketEnabled } from 'src/utils/socket-config';
import { transformComment } from '../services/announcement.service';

/**
 * Subscribe to real-time announcement comment events (comment, reply, delete).
 * Join the announcement room when announcementId is set.
 *
 * @param {string} announcementId - Current announcement id (falsy = no connection)
 * @param {object} callbacks - Optional handlers for real-time updates
 * @param {function} callbacks.onCommentAdded - (comment) => void
 * @param {function} callbacks.onCommentUpdated - (comment) => void
 * @param {function} callbacks.onCommentDeleted - ({ commentId, announcementId, deletedIds }) => void
 */
export function useAnnouncementCommentsSocket(announcementId, callbacks = {}) {
  const socketRef = useRef(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!announcementId || !isSocketEnabled()) return () => {};

    const url = getSocketUrl();
    const socket = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinAnnouncement', { announcementId });
    });

    socket.on('comment:added', (raw) => {
      const comment = transformComment(raw);
      callbacksRef.current.onCommentAdded?.(comment);
    });

    socket.on('comment:updated', (raw) => {
      const comment = transformComment(raw);
      callbacksRef.current.onCommentUpdated?.(comment);
    });

    socket.on('comment:deleted', (payload) => {
      callbacksRef.current.onCommentDeleted?.(payload);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [announcementId]);

  return socketRef.current;
}
