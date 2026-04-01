import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

const ANNOUNCEMENT_ROOM_PREFIX = 'announcement:';
const ANNOUNCEMENTS_LIST_ROOM = 'announcements:list';

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/socket.io',
  namespace: '/',
})
export class AnnouncementCommentsGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('joinAnnouncement')
  handleJoinAnnouncement(client: Socket, payload: { announcementId: string }): void {
    if (payload?.announcementId) {
      client.join(`${ANNOUNCEMENT_ROOM_PREFIX}${payload.announcementId}`);
    }
  }

  @SubscribeMessage('joinAnnouncementsList')
  handleJoinAnnouncementsList(client: Socket): void {
    client.join(ANNOUNCEMENTS_LIST_ROOM);
  }

  emitToAnnouncement(announcementId: string, event: string, data: unknown): void {
    this.server.to(`${ANNOUNCEMENT_ROOM_PREFIX}${announcementId}`).emit(event, data);
  }

  emitToAnnouncementsList(event: string, data: unknown): void {
    this.server.to(ANNOUNCEMENTS_LIST_ROOM).emit(event, data);
  }
}
