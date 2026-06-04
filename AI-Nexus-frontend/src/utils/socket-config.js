/**
 * Socket.IO client config.
 * Used by useAnnouncementsListSocket, useAiForumListSocket, useAnnouncementCommentsSocket, useAiForumCommentsSocket.
 *
 * Vercel serverless does NOT support WebSockets (no long-lived connections).
 * When backend is deployed on Vercel, set VITE_SOCKET_ENABLED=false in your frontend env
 * to disable Socket.IO and avoid connection errors. Real-time updates will not work until
 * the backend is deployed to a platform that supports WebSockets (e.g. Railway, Render, Fly.io).
 */

/**
 * Base URL for Socket.IO (backend origin, without /api).
 * @returns {string}
 */
export function getSocketUrl() {
  const apiUrl = import.meta.env.VITE_SERVER_URL || '';
  return apiUrl.replace(/\/api\/?$/, '') || 'http://localhost:3000';
}

/**
 * Whether to attempt Socket.IO connection.
 * Set VITE_SOCKET_ENABLED=false when backend is on Vercel (or any host that doesn't support WebSockets).
 * @returns {boolean}
 */
export function isSocketEnabled() {
  const v = import.meta.env.VITE_SOCKET_ENABLED;
  if (v === undefined || v === '') return true;
  return v === 'true' || v === '1';
}
