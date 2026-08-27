import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SOCKET_IO_GATEWAY_OPTIONS } from '../common/socket-io.options';

const NOTIFICATIONS_ROOM = 'notifications:all';

@WebSocketGateway(SOCKET_IO_GATEWAY_OPTIONS)
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
