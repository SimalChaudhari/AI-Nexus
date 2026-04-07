import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

const QUESTION_ROOM_PREFIX = 'post:';
const QUESTIONS_LIST_ROOM = 'posts:list';

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/socket.io',
  namespace: '/',
})
export class AiForumCommentsGateway {
  @WebSocketServer()
  server!: Server;

  /**
   * Client sends { postId } to join the room for that post.
   * All comment events for that post will be emitted to this socket.
   */
  @SubscribeMessage('joinAiForumPost')
  handleJoinAiForumPost(client: Socket, payload: { postId: string }): void {
    if (payload?.postId) {
      client.join(`${QUESTION_ROOM_PREFIX}${payload.postId}`);
    }
  }

  /**
   * Client joins the posts list room to receive post:created, post:updated, post:deleted.
   */
  @SubscribeMessage('joinAiForumPostsList')
  handleJoinAiForumPostsList(client: Socket): void {
    client.join(QUESTIONS_LIST_ROOM);
  }

  /**
   * Emit to all clients viewing this post. Call from AiForumService.
   */
  emitToAiForumPost(postId: string, event: string, data: unknown): void {
    this.server.to(`${QUESTION_ROOM_PREFIX}${postId}`).emit(event, data);
  }

  /**
   * Emit to all clients viewing the posts list (add/update/delete).
   */
  emitToAiForumPostsList(event: string, data: unknown): void {
    this.server.to(QUESTIONS_LIST_ROOM).emit(event, data);
  }
}

