import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SOCKET_IO_GATEWAY_OPTIONS } from '../common/socket-io.options';

const ANNOUNCEMENTS_LIST_ROOM = 'announcements:list';

@WebSocketGateway(SOCKET_IO_GATEWAY_OPTIONS)
export class AnnouncementCommentsGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('joinAnnouncementsList')
  handleJoinAnnouncementsList(client: Socket): void {
    client.join(ANNOUNCEMENTS_LIST_ROOM);
  }

  emitToAnnouncementsList(event: string, data: unknown): void {
    this.server.to(ANNOUNCEMENTS_LIST_ROOM).emit(event, data);
  }
}
