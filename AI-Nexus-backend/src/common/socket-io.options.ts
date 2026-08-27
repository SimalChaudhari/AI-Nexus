/** Shared Socket.IO settings — disable compression and cap payloads to limit RAM per connection. */
export const SOCKET_IO_GATEWAY_OPTIONS = {
  cors: { origin: '*' as const },
  path: '/socket.io',
  namespace: '/',
  pingTimeout: 20_000,
  pingInterval: 25_000,
  maxHttpBufferSize: 1e6,
  perMessageDeflate: false,
  connectTimeout: 10_000,
};
