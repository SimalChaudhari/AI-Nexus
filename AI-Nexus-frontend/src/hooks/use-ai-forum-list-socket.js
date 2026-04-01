import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl, isSocketEnabled } from 'src/utils/socket-config';

/**
 * Subscribe to real-time post list events (created, updated, deleted).
 * Join the posts list room when enabled; cleanup on unmount.
 *
 * @param {object} options - { enabled?: boolean }
 * @param {object} callbacks - Handlers for real-time updates
 * @param {function} callbacks.onAiForumPostCreated - (post) => void
 * @param {function} callbacks.onAiForumPostUpdated - (post) => void
 * @param {function} callbacks.onAiForumPostDeleted - ({ postId }) => void
 */
export function useAiForumListSocket(callbacks = {}, options = {}) {
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
      socket.emit('joinAiForumPostsList');
    });

    socket.on('post:created', (post) => {
      callbacksRef.current.onAiForumPostCreated?.(post);
    });

    socket.on('post:updated', (post) => {
      callbacksRef.current.onAiForumPostUpdated?.(post);
    });

    socket.on('post:deleted', (payload) => {
      callbacksRef.current.onAiForumPostDeleted?.(payload);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled]);

  return null;
}




