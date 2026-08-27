import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

const ANNOUNCEMENTS_LIST_ROOM = 'announcements:list';

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/socket.io',
  namespace: '/',
})
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
