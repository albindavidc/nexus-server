import { injectable, inject, container } from "tsyringe";
import { Server, Socket as IOSocket } from "socket.io";
import * as http from "http";
import {
  CustomSocket,
  AuthMiddleware,
} from "../../middlewares/auth.middleware";
import { IChatRepository } from "../../shared/interfaces/repository/chat-repository.interface";
import { TOKENS } from "../../shared/di/tokens";
import { SOCKET_EVENTS, USER_STATUS } from "../../shared/constants/index";
import logger from "../../shared/utils/logger";
import User from "../auth/auth.model";

@injectable()
export class ChatGateway {
  private io!: Server;

  constructor(
    @inject(TOKENS.ChatRepository) private chatRepo: IChatRepository,
  ) {}

  initialize(httpServer: http.Server, clientUrl: string): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: clientUrl,
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingInterval: 10_000,
      pingTimeout: 15_000,
    });

    const authMiddleware = container.resolve(AuthMiddleware);
    this.io.use(authMiddleware.authenticateSocket as Parameters<Server["use"]>[0]);

    this.io.on(SOCKET_EVENTS.CONNECT, (socket: IOSocket) => {
      this.handleConnection(socket as CustomSocket);
    });
  }

  private handleConnection(socket: CustomSocket): void {
    const userId = socket.userId as string;
    logger.debug(`User ${userId} connected`);

    this.onUserConnect(socket, userId);
    socket.join(userId); 

    socket.on(
      SOCKET_EVENTS.JOIN_CONVERSATION,
      (data: { conversationId: string }) =>
        this.handleJoinConversation(socket, data),
    );
    socket.on(
      SOCKET_EVENTS.LEAVE_CONVERSATION,
      (data: { conversationId: string }) =>
        this.handleLeaveConversation(socket, data),
    );
    socket.on(
      SOCKET_EVENTS.SEND_MESSAGE,
      (data: {
        conversationId: string;
        content: string;
        type?: string;
        mediaURL?: string;
        replyTo?: string;
      }) => this.handleSendMessage(socket, data),
    );
    socket.on(SOCKET_EVENTS.MESSAGE_READ, (data: { conversationId: string }) =>
      this.handleReadMessage(socket, data),
    );
    socket.on(SOCKET_EVENTS.TYPING_START, (data: { conversationId: string }) =>
      this.handleTyping(socket, data, true),
    );
    socket.on(SOCKET_EVENTS.TYPING_STOP, (data: { conversationId: string }) =>
      this.handleTyping(socket, data, false),
    );
    socket.on(SOCKET_EVENTS.DISCONNECT, () =>
      this.onUserDisconnect(socket, userId),
    );
  }

  private async onUserConnect(
    socket: CustomSocket,
    userId: string,
  ): Promise<void> {
    try {
      const user = await User.findByIdAndUpdate(userId, {
        status: USER_STATUS.ONLINE,
        $addToSet: { socketIds: socket.id },
      });

      if (!user) {
        logger.warn(`onUserConnect: User ${userId} not found`);
        return;
      }

      await this.broadcastPresence(userId, USER_STATUS.ONLINE);
    } catch (error) {
      logger.error(`onUserConnect failed for ${userId}:`, error);
    }
  }

  private async onUserDisconnect(
    socket: CustomSocket,
    userId: string,
  ): Promise<void> {
    try {
      logger.debug(`User ${userId} disconnected`);
      await User.findByIdAndUpdate(userId, { $pull: { socketIds: socket.id } });

      const updatedUser = await User.findById(userId).select("socketIds");
      if (updatedUser?.socketIds?.length === 0) {
        await User.findByIdAndUpdate(userId, {
          status: USER_STATUS.OFFLINE,
          lastSeen: new Date(),
        });
        await this.broadcastPresence(userId, USER_STATUS.OFFLINE);
      }
    } catch (error) {
      logger.error(`onUserDisconnect failed for ${userId}:`, error);
    }
  }

  private async broadcastPresence(
    userId: string,
    status: string,
  ): Promise<void> {
    try {
      const conversations = await this.chatRepo.findConversationsByUser(userId);
      conversations.forEach((conversation) => {
        const otherParticipant = conversation.participants.find(
          (p) => p.toString() !== userId,
        );
        const targetId = otherParticipant?.toString() ?? "";

        if (!targetId) return;

        this.io
          .to(targetId)
          .emit(
            status === USER_STATUS.ONLINE
              ? SOCKET_EVENTS.USER_ONLINE
              : SOCKET_EVENTS.USER_OFFLINE,
            { userId },
          );
      });

      logger.debug(`Broadcasted ${status} presence for user ${userId}`);
    } catch (error) {
      logger.error(`broadcastPresence failed for ${userId}:`, error);
    }
  }

  private async handleJoinConversation(
    socket: CustomSocket,
    { conversationId }: { conversationId: string },
  ): Promise<void> {
    try {
      if (!conversationId)
        return this.emitError(socket, "Conversation ID is required");

      const conversation = await this.chatRepo.findConversationById(
        conversationId,
        socket.userId as string,
      );
      if (!conversation)
        return this.emitError(socket, "Conversation not found");

      socket.join(conversationId);
      logger.debug(
        `User ${socket.userId} joined conversation ${conversationId}`,
      );
    } catch (error) {
      logger.error(
        `handleJoinConversation failed for ${socket.userId}:`,
        error,
      );
    }
  }

  private async handleLeaveConversation(
    socket: CustomSocket,
    { conversationId }: { conversationId: string },
  ): Promise<void> {
    try {
      if (!conversationId)
        return this.emitError(socket, "Conversation ID is required");

      const conversation = await this.chatRepo.findConversationById(
        conversationId,
        socket.userId as string,
      );
      if (!conversation)
        return this.emitError(socket, "Conversation not found");

      socket.leave(conversationId);
      logger.debug(`User ${socket.userId} left conversation ${conversationId}`);
    } catch (error) {
      logger.error(
        `handleLeaveConversation failed for ${socket.userId}:`,
        error,
      );
    }
  }

  private async handleSendMessage(
    socket: CustomSocket,
    {
      conversationId,
      content,
      type,
      mediaURL,
      replyTo,
    }: {
      conversationId: string;
      content: string;
      type?: string;
      mediaURL?: string;
      replyTo?: string;
    },
  ): Promise<void> {
    try {
      if (!conversationId)
        return this.emitError(socket, "Conversation ID is required");
      if (!content)
        return this.emitError(socket, "Message content is required");

      const message = await this.chatRepo.createMessage({
        sender: socket.userId,
        conversation: conversationId,
        content,
        type,
        mediaURL,
        replyTo,
      });

      this.io.to(conversationId).emit(SOCKET_EVENTS.NEW_MESSAGE, message);
    } catch (error) {
      logger.error(`handleSendMessage failed for ${socket.userId}:`, error);
      this.emitError(socket, "Failed to send message");
    }
  }

  private async handleReadMessage(
    socket: CustomSocket,
    { conversationId }: { conversationId: string },
  ): Promise<void> {
    try {
      if (!conversationId)
        return this.emitError(socket, "Conversation ID is required");

      const conversation = await this.chatRepo.findConversationById(
        conversationId,
        socket.userId as string,
      );
      if (!conversation)
        return this.emitError(socket, "Conversation not found");

      const result = await this.chatRepo.markConversationRead(
        conversationId,
        socket.userId as string,
      );
      this.io.to(conversationId).emit(SOCKET_EVENTS.MESSAGE_READ, result);
    } catch (error) {
      logger.error(`handleReadMessage failed for ${socket.userId}:`, error);
      this.emitError(socket, "Failed to mark as read");
    }
  }

  private handleTyping(
    socket: CustomSocket,
    { conversationId }: { conversationId: string },
    isTyping: boolean,
  ): void {
    if (!conversationId) return;
    socket
      .to(conversationId)
      .emit(isTyping ? SOCKET_EVENTS.TYPING_START : SOCKET_EVENTS.TYPING_STOP, {
        conversationId,
        userId: socket.userId,
        isTyping,
      });
  }

  private emitError(socket: CustomSocket, message: string): void {
    socket.emit(SOCKET_EVENTS.SOCKET_ERROR, { message });
    logger.debug(`Error emitted to ${socket.userId}: ${message}`);
  }
}

export function initSocket(httpServer: http.Server, clientUrl: string): void {
  const gateway = container.resolve(ChatGateway);
  gateway.initialize(httpServer, clientUrl);
}
