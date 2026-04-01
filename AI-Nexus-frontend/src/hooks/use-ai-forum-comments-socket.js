import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl, isSocketEnabled } from 'src/utils/socket-config';
import { transformComment } from '../services/ai-forum.service';

/**
 * Subscribe to real-time post comment events (comment, reply, delete, like).
 * Join the post room when postId is set; cleanup on unmount or postId change.
 *
 * @param {string} postId - Current post id (falsy = no connection)
 * @param {object} callbacks - Optional handlers for real-time updates
 * @param {function} callbacks.onCommentAdded - (comment) => void
 * @param {function} callbacks.onCommentUpdated - (comment) => void
 * @param {function} callbacks.onCommentDeleted - ({ commentId, postId, deletedIds }) => void
 * @param {function} callbacks.onCommentLikeToggled - ({ commentId, liked, likeCount }) => void
 */
export function useAiForumCommentsSocket(postId, callbacks = {}) {
  const socketRef = useRef(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!postId || !isSocketEnabled()) return () => {};

    const url = getSocketUrl();
    const socket = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinAiForumPost', { postId });
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

    socket.on('comment:likeToggled', (payload) => {
      callbacksRef.current.onCommentLikeToggled?.(payload);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [postId]);

  return socketRef.current;
}




