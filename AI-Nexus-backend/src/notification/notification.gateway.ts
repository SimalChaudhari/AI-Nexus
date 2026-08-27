import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

const NOTIFICATIONS_ROOM = 'notifications:all';

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/socket.io',
  namespace: '/',
})
export class NotificationGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('joinNotifications')
  handleJoinNotifications(client: Socket): void {
    client.join(NOTIFICATIONS_ROOM);
  }

  emitToAll(event: string, data: unknown): void {
    this.server.to(NOTIFICATIONS_ROOM).emit(event, data);
  }
}
