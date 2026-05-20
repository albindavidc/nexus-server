import { injectable, inject } from "tsyringe";
import { Server, Socket as IOSocket } from "socket.io";
import { CustomSocket, authenticateSocket } from "../../middlewares/auth.middleware";
import { IChatRepository } from "../../shared/interfaces/IChatRepository";
import { TOKENS } from "../../shared/di/tokens";
import { SOCKET_EVENTS, USER_STATUS } from "../../shared/constants/index";
import logger from "../../shared/utils/logger";
import User from "../auth/auth.model";

/**
 * ChatGateway — Single Responsibility: manages all real-time Socket.IO events for the chat module.
 * Injects IChatRepository (DIP) — not the concrete ChatRepository.
 * Each socket event type maps to a dedicated private method (SRP for event handlers).
 */
@injectable()
export class ChatGateway {
  private io!: Server;

  constructor(@inject(TOKENS.IChatRepository) private chatRepo: IChatRepository) {}

  /**
   * Initialises the Socket.IO server and registers all event handlers.
   * Call this once from the application bootstrap.
   */
  initialize(httpServer: any, clientUrl: string): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: clientUrl,
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingInterval: 10_000,
      pingTimeout: 15_000,
    });

    this.io.use(authenticateSocket as any);

    this.io.on(SOCKET_EVENTS.CONNECT, (socket: IOSocket) => {
      this.handleConnection(socket as CustomSocket);
    });
  }

  // ─── Connection lifecycle ────────────────────────────────────────────────────

  private handleConnection(socket: CustomSocket): void {
    const userId = socket.userId as string;
    logger.debug(`User ${userId} connected`);

    this.onUserConnect(socket, userId);
    socket.join(userId);

    socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, (data: any) =>
      this.handleJoinConversation(socket, data)
    );
    socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (data: any) =>
      this.handleLeaveConversation(socket, data)
    );
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data: any) =>
      this.handleSendMessage(socket, data)
    );
    socket.on(SOCKET_EVENTS.MESSAGE_READ, (data: any) =>
      this.handleReadMessage(socket, data)
    );
    socket.on(SOCKET_EVENTS.TYPING_START, (data: any) =>
      this.handleTyping(socket, data, true)
    );
    socket.on(SOCKET_EVENTS.TYPING_STOP, (data: any) =>
      this.handleTyping(socket, data, false)
    );
    socket.on(SOCKET_EVENTS.DISCONNECT, () =>
      this.onUserDisconnect(socket, userId)
    );
  }

  // ─── Presence ────────────────────────────────────────────────────────────────

  private async onUserConnect(socket: CustomSocket, userId: string): Promise<void> {
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

  private async onUserDisconnect(socket: CustomSocket, userId: string): Promise<void> {
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

  private async broadcastPresence(userId: string, status: string): Promise<void> {
    try {
      const conversations = await this.chatRepo.findConversationsByUser(userId);
      conversations.forEach((conversation: any) => {
        const otherParticipant = conversation.participants.find(
          (p: any) => p._id?.toString() !== userId && p.toString?.() !== userId
        );
        const targetId = otherParticipant?._id?.toString() ?? otherParticipant?.toString() ?? "";
        if (!targetId) return;

        this.io.to(targetId).emit(
          status === USER_STATUS.ONLINE ? SOCKET_EVENTS.USER_ONLINE : SOCKET_EVENTS.USER_OFFLINE,
          { userId }
        );
      });

      logger.debug(`Broadcasted ${status} presence for user ${userId}`);
    } catch (error) {
      logger.error(`broadcastPresence failed for ${userId}:`, error);
    }
  }

  // ─── Conversation management ──────────────────────────────────────────────────

  private async handleJoinConversation(socket: CustomSocket, { conversationId }: any): Promise<void> {
    try {
      if (!conversationId) return this.emitError(socket, "Conversation ID is required");

      const conversation = await this.chatRepo.findConversationById(
        conversationId,
        socket.userId as string
      );
      if (!conversation) return this.emitError(socket, "Conversation not found");

      socket.join(conversationId);
      logger.debug(`User ${socket.userId} joined conversation ${conversationId}`);
    } catch (error) {
      logger.error(`handleJoinConversation failed for ${socket.userId}:`, error);
    }
  }

  private async handleLeaveConversation(socket: CustomSocket, { conversationId }: any): Promise<void> {
    try {
      if (!conversationId) return this.emitError(socket, "Conversation ID is required");

      const conversation = await this.chatRepo.findConversationById(
        conversationId,
        socket.userId as string
      );
      if (!conversation) return this.emitError(socket, "Conversation not found");

      socket.leave(conversationId);
      logger.debug(`User ${socket.userId} left conversation ${conversationId}`);
    } catch (error) {
      logger.error(`handleLeaveConversation failed for ${socket.userId}:`, error);
    }
  }

  // ─── Messaging ────────────────────────────────────────────────────────────────

  private async handleSendMessage(
    socket: CustomSocket,
    { conversationId, content, type, mediaURL, replyTo }: any
  ): Promise<void> {
    try {
      if (!conversationId) return this.emitError(socket, "Conversation ID is required");
      if (!content) return this.emitError(socket, "Message content is required");

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

  private async handleReadMessage(socket: CustomSocket, { conversationId }: any): Promise<void> {
    try {
      if (!conversationId) return this.emitError(socket, "Conversation ID is required");

      const conversation = await this.chatRepo.findConversationById(
        conversationId,
        socket.userId as string
      );
      if (!conversation) return this.emitError(socket, "Conversation not found");

      const result = await this.chatRepo.markConversationRead(
        conversationId,
        socket.userId as string
      );
      this.io.to(conversationId).emit(SOCKET_EVENTS.MESSAGE_READ, result);
    } catch (error) {
      logger.error(`handleReadMessage failed for ${socket.userId}:`, error);
      this.emitError(socket, "Failed to mark as read");
    }
  }

  // ─── Typing indicators ────────────────────────────────────────────────────────

  private handleTyping(socket: CustomSocket, { conversationId }: any, isTyping: boolean): void {
    if (!conversationId) return;
    socket.to(conversationId).emit(
      isTyping ? SOCKET_EVENTS.TYPING_START : SOCKET_EVENTS.TYPING_STOP,
      { conversationId, userId: socket.userId, isTyping }
    );
  }

  // ─── Error emitter ────────────────────────────────────────────────────────────

  private emitError(socket: CustomSocket, message: string): void {
    socket.emit(SOCKET_EVENTS.SOCKET_ERROR, { message });
    logger.debug(`Error emitted to ${socket.userId}: ${message}`);
  }
}

// Convenience factory function — used by app.ts bootstrap
export function initSocket(httpServer: any, clientUrl: string): void {
  const { container } = require("tsyringe");
  const gateway = container.resolve(ChatGateway);
  gateway.initialize(httpServer, clientUrl);
}
