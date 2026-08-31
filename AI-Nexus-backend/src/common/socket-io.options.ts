import { getSocketIoCors } from './cors-origins.util';

/** Shared Socket.IO settings — disable compression and cap payloads to limit RAM per connection. */
export const SOCKET_IO_GATEWAY_OPTIONS = {
  cors: getSocketIoCors(),
  path: '/socket.io',
  namespace: '/',
  pingTimeout: 20_000,
  pingInterval: 25_000,
  maxHttpBufferSize: 1e6,
  perMessageDeflate: false,
  connectTimeout: 10_000,
};
