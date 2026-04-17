import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({ cors: { origin: '*' }, path: '/socket.io' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('CHAT:JOIN_SESSION')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number },
  ) {
    const room = `session:${data.sessionId}`;
    client.join(room);
    client.emit('CHAT:JOINED_SESSION', { sessionId: data.sessionId });
  }

  @SubscribeMessage('CHAT:LEAVE_SESSION')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number },
  ) {
    const room = `session:${data.sessionId}`;
    client.leave(room);
    client.emit('CHAT:LEFT_SESSION', { sessionId: data.sessionId });
  }

  @SubscribeMessage('CHAT:SEND_MESSAGE')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      sessionId: number;
      senderType: string;
      senderId: number;
      text?: string;
      imageUrl?: string;
    },
  ) {
    const message = await this.prisma.astrologerChatMessage.create({
      data: {
        sessionId: data.sessionId,
        senderType: data.senderType,
        senderId: data.senderId,
        text: data.text,
        imageUrl: data.imageUrl,
      },
    });

    const room = `session:${data.sessionId}`;
    this.server.to(room).emit('CHAT:NEW_MESSAGE', message);

    // Also notify astrologer inbox
    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: data.sessionId },
    });
    if (session) {
      this.server
        .to(`astro-inbox:${session.astrologerId}`)
        .emit('ASTRO:NEW_MESSAGE', { sessionId: data.sessionId, message });
    }
  }

  @SubscribeMessage('CHAT:TYPING')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { sessionId: number; senderType: string; senderId: number },
  ) {
    const room = `session:${data.sessionId}`;
    client.to(room).emit('CHAT:TYPING', {
      sessionId: data.sessionId,
      senderType: data.senderType,
      senderId: data.senderId,
    });
  }

  @SubscribeMessage('CHAT:END')
  async handleEndChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number },
  ) {
    const endedAt = new Date();
    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: data.sessionId },
    });

    if (session && session.status !== 'ENDED') {
      let minutesBilled = 0;
      let totalCharged = 0;

      if (session.startedAt) {
        const durationMs = endedAt.getTime() - session.startedAt.getTime();
        minutesBilled = Math.ceil(durationMs / 60000);
        totalCharged = minutesBilled * session.pricePerMinute;
      }

      const updated = await this.prisma.astrologerChatSession.update({
        where: { id: data.sessionId },
        data: {
          status: 'ENDED',
          endedAt,
          minutesBilled,
          totalCharged,
          endReason: 'manual',
        },
      });

      const room = `session:${data.sessionId}`;
      this.server.to(room).emit('CHAT:SESSION_ENDED', updated);
    }
  }

  @SubscribeMessage('ASTRO:SUBSCRIBE_INBOX')
  async handleSubscribeInbox(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { astrologerId: number },
  ) {
    const room = `astro-inbox:${data.astrologerId}`;
    client.join(room);
    client.emit('ASTRO:INBOX_SUBSCRIBED', {
      astrologerId: data.astrologerId,
    });
  }

  @SubscribeMessage('ASTRO:UNSUBSCRIBE_INBOX')
  async handleUnsubscribeInbox(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { astrologerId: number },
  ) {
    const room = `astro-inbox:${data.astrologerId}`;
    client.leave(room);
    client.emit('ASTRO:INBOX_UNSUBSCRIBED', {
      astrologerId: data.astrologerId,
    });
  }

  @SubscribeMessage('LIST:SUBSCRIBE')
  async handleListSubscribe(@ConnectedSocket() client: Socket) {
    client.join('homepage-list');
    client.emit('LIST:SUBSCRIBED');
  }

  @SubscribeMessage('LIST:UNSUBSCRIBE')
  async handleListUnsubscribe(@ConnectedSocket() client: Socket) {
    client.leave('homepage-list');
    client.emit('LIST:UNSUBSCRIBED');
  }
}
