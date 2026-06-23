import EventEmitter from "events";
import { injectable, inject, container } from "tsyringe";
import { Server, Socket as IOSocket } from "socket.io";
import * as http from "http";
import { Application } from "express";
import { GroupGateway } from "../group/group.gateway";
import { ChatBotGateway } from "../chatbot/chatbot.gateway";
import {
  CustomSocket,
  AuthMiddleware,
} from "../../middlewares/auth.middleware";
import {
  IChatRepository,
  FindMessagesOptions,
} from "../../shared/interfaces/repository/chat-repository.interface";
import {
  IChatService,
  SendMessageDto,
} from "../../shared/interfaces/services/chat-service.interface";
import { TOKENS } from "../../shared/di/tokens";
import {
  MessageType,
  SOCKET_EVENTS,
  USER_STATUS,
} from "../../shared/constants/index";
import logger from "../../shared/utils/logger";
import User from "../auth/auth.model";
import { Types } from "mongoose";

type AckCallback = (response: Record<string, unknown>) => void;

@injectable()
export class ChatGateway {
  private _io!: Server;

  constructor(
    @inject(TOKENS.ChatRepository) private _chatRepo: IChatRepository,
    @inject(TOKENS.ChatService) private _chatService: IChatService,
    @inject(TOKENS.EventEmitter) private _eventEmitter: EventEmitter,
  ) {}

  initialize(
    httpServer: http.Server,
    clientUrl: string,
    expressApp?: Application,
  ): void {
    this._io = new Server(httpServer, {
      cors: {
        origin: ["http://localhost:4200", clientUrl].filter(Boolean),
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingInterval: 10_000,
      pingTimeout: 15_000,
    });

    if (expressApp) {
      expressApp.set("io", this._io);
    }

    // Listen for new notifications to push via sockets
    this._eventEmitter.on("notification.created", ({ userId, notification }) => {
      if (this._io) {
        this._io.to(userId).emit("new_notification", notification);
      }
    });

    const authMiddleware = container.resolve(AuthMiddleware);
    this._io.use(
      authMiddleware.authenticateSocket as Parameters<Server["use"]>[0],
    );

    this._io.on(SOCKET_EVENTS.CONNECT, (socket: IOSocket) => {
      this.handleConnection(socket as CustomSocket);
    });
  }

  private handleConnection(socket: CustomSocket): void {
    const userId = socket.userId as string;
    logger.debug(`User ${userId} connected`);

    this.onUserConnect(socket, userId);
    socket.join(userId);

    const groupGateway = container.resolve(GroupGateway);
    groupGateway.registerHandlers(socket, this._io);

    const chatBotGateway = new ChatBotGateway();
    chatBotGateway.registerHandlers(socket, this._io);

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
      SOCKET_EVENTS.GET_MY_CONVERSATIONS,
      (data: Record<string, unknown>, callback?: AckCallback) =>
        this.handleGetMyConversations(socket, data, callback),
    );
    socket.on(
      SOCKET_EVENTS.GET_CONVERSATION_BY_ID,
      (data: Record<string, unknown>, callback?: AckCallback) =>
        this.handleGetConversationById(socket, data, callback),
    );
    socket.on(
      SOCKET_EVENTS.START_DIRECT_CONVERSATION,
      (data: Record<string, unknown>, callback?: AckCallback) =>
        this.handleStartDirectConversation(socket, data, callback),
    );

    socket.on(
      SOCKET_EVENTS.GET_MESSAGES,
      (data: Record<string, unknown>, callback?: AckCallback) =>
        this.handleGetMessages(socket, data, callback),
    );
    socket.on(
      SOCKET_EVENTS.MARK_CONVERSATION_READ,
      (data: Record<string, unknown>, callback?: AckCallback) =>
        this.handleMarkConversationRead(socket, data, callback),
    );
    socket.on(
      SOCKET_EVENTS.DELETE_MESSAGE,
      (data: Record<string, unknown>, callback?: AckCallback) =>
        this.handleDeleteMessage(socket, data, callback),
    );
    socket.on(
      SOCKET_EVENTS.CLEAR_CONVERSATION,
      (data: Record<string, unknown>, callback?: AckCallback) =>
        this.handleClearConversation(socket, data, callback),
    );
    socket.on(
      SOCKET_EVENTS.SEND_MESSAGE,
      (
        data: {
          conversationId: string;
          type: MessageType;
          content: string;
          mediaUrl?: string;
          mediaMeta?: { mimeType: string; size: number; filename: string };
        },
        callback?: AckCallback,
      ) => this.handleSendMessage(socket, data, callback),
    );

    socket.on(SOCKET_EVENTS.MESSAGE_READ, (data: { conversationId: string }) =>
      this.handleReadMessageLegacy(socket, data),
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
      const conversations =
        await this._chatRepo.findConversationsByUser(userId);
      
      const uniqueParticipants = new Set<string>();
      conversations.forEach((conversation) => {
        conversation.participants.forEach((p: Types.ObjectId | { _id: Types.ObjectId }) => {
          const pId = p._id ? p._id.toString() : p.toString();
          if (pId !== userId) {
            uniqueParticipants.add(pId);
          }
        });
      });

      uniqueParticipants.forEach((targetId) => {
        this._io
          .to(targetId)
          .emit(
            status === USER_STATUS.ONLINE
              ? SOCKET_EVENTS.USER_ONLINE
              : SOCKET_EVENTS.USER_OFFLINE,
            { userId },
          );
      });

      logger.debug(`Broadcasted ${status} presence for user ${userId} to ${uniqueParticipants.size} users`);
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

      const conversation = await this._chatRepo.findConversationById(
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

      const conversation = await this._chatRepo.findConversationById(
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

  private async handleGetMyConversations(
    socket: CustomSocket,
    data: Record<string, unknown>,
    callback?: AckCallback,
  ): Promise<void> {
    try {
      const conversations = await this._chatService.getMyConversations(
        socket.userId as string,
      );
      if (typeof callback === "function")
        callback({ success: true, data: { conversations } });
    } catch (error: unknown) {
      logger.error(`handleGetMyConversations failed:`, error);
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to fetch conversations";
      if (typeof callback === "function")
        callback({ success: false, error: msg });
    }
  }

  private async handleGetConversationById(
    socket: CustomSocket,
    data: Record<string, unknown>,
    callback?: AckCallback,
  ): Promise<void> {
    try {
      if (!data?.conversationId) throw new Error("Conversation ID is required");
      const conversation = await this._chatService.getConversationById(
        String(data.conversationId),
        socket.userId as string,
      );
      if (typeof callback === "function")
        callback({ success: true, data: { conversation } });
    } catch (error: unknown) {
      logger.error(`handleGetConversationById failed:`, error);
      const msg =
        error instanceof Error ? error.message : "Failed to fetch conversation";
      if (typeof callback === "function")
        callback({ success: false, error: msg });
    }
  }

  private async handleStartDirectConversation(
    socket: CustomSocket,
    data: Record<string, unknown>,
    callback?: AckCallback,
  ): Promise<void> {
    try {
      if (!data?.userId) throw new Error("User ID is required");
      const conversation =
        await this._chatService.getOrCreateDirectConversation(
          socket.userId as string,
          String(data.userId),
        );
      if (typeof callback === "function")
        callback({ success: true, data: { conversation } });
    } catch (error: unknown) {
      logger.error(`handleStartDirectConversation failed:`, error);
      const msg =
        error instanceof Error ? error.message : "Failed to start conversation";
      if (typeof callback === "function")
        callback({ success: false, error: msg });
    }
  }



  private async handleGetMessages(
    socket: CustomSocket,
    data: Record<string, unknown>,
    callback?: AckCallback,
  ): Promise<void> {
    try {
      if (!data?.conversationId) throw new Error("Conversation ID is required");
      const options: FindMessagesOptions = {
        before: data.before as string | undefined,
        limit: data.limit ? parseInt(String(data.limit), 10) : undefined,
      };
      const messages = await this._chatService.getMessages(
        String(data.conversationId),
        socket.userId as string,
        options,
      );
      if (typeof callback === "function")
        callback({ success: true, data: { messages } });
    } catch (error: unknown) {
      logger.error(`handleGetMessages failed:`, error);
      const msg =
        error instanceof Error ? error.message : "Failed to fetch messages";
      if (typeof callback === "function")
        callback({ success: false, error: msg });
    }
  }

  private async handleSendMessage(
    socket: CustomSocket,
    data: SendMessageDto & {
      conversationId: string;
    },
    callback?: AckCallback,
  ): Promise<void> {
    try {
      if (!data?.conversationId) throw new Error("Conversation ID is required");
      if (!data?.content) throw new Error("Message content is required");

      const message = await this._chatService.sendMessage(
        socket.userId as string,
        data.conversationId,
        data,
      );
      const conversation = await this._chatService.getConversationById(
        data.conversationId,
        socket.userId as string,
      );

      this.broadcastToConversation(
        data.conversationId,
        SOCKET_EVENTS.NEW_MESSAGE,
        message,
      );

      if (conversation && conversation.participants) {
        conversation.participants.forEach(
          (p: Types.ObjectId | { _id: Types.ObjectId }) => {
            const participantId = ("_id" in p ? p._id : p).toString();
            if (participantId !== String(socket.userId)) {
              this.broadcastToConversation(
                participantId,
                SOCKET_EVENTS.NEW_MESSAGE,
                message,
              );
            }
          },
        );
      }

      if (typeof callback === "function") {
        callback({ success: true, data: { message } });
        return;
      }
    } catch (error: unknown) {
      logger.error(`handleSendMessage failed for ${socket.userId}:`, error);

      const msg =
        error instanceof Error ? error.message : "Failed to send message";
      if (typeof callback === "function")
        callback({ success: false, error: msg });
      else this.emitError(socket, msg);
    }
  }

  private async handleMarkConversationRead(
    socket: CustomSocket,
    data: Record<string, unknown>,
    callback?: AckCallback,
  ): Promise<void> {
    try {
      if (!data?.conversationId) throw new Error("Conversation ID is required");
      await this._chatService.markAsRead(
        String(data.conversationId),
        socket.userId as string,
      );
      if (typeof callback === "function") callback({ success: true });
    } catch (error: unknown) {
      logger.error(`handleMarkConversationRead failed:`, error);
      const msg =
        error instanceof Error ? error.message : "Failed to mark as read";
      if (typeof callback === "function")
        callback({ success: false, error: msg });
    }
  }

  private async handleDeleteMessage(
    socket: CustomSocket,
    data: Record<string, unknown>,
    callback?: AckCallback,
  ): Promise<void> {
    try {
      if (!data?.messageId) throw new Error("Message ID is required");
      await this._chatService.deleteMessage(
        String(data.messageId),
        socket.userId as string,
      );
      if (typeof callback === "function") callback({ success: true });
    } catch (error: unknown) {
      logger.error(`handleDeleteMessage failed:`, error);
      const msg =
        error instanceof Error ? error.message : "Failed to delete message";
      if (typeof callback === "function")
        callback({ success: false, error: msg });
    }
  }

  private async handleClearConversation(
    socket: CustomSocket,
    data: Record<string, unknown>,
    callback?: AckCallback,
  ): Promise<void> {
    try {
      if (!data?.conversationId) throw new Error("Conversation ID is required");
      await this._chatService.clearConversation(
        String(data.conversationId),
        socket.userId as string,
      );
      if (typeof callback === "function") callback({ success: true });
    } catch (error: unknown) {
      logger.error(`handleClearConversation failed:`, error);
      const msg =
        error instanceof Error ? error.message : "Failed to clear conversation";
      if (typeof callback === "function")
        callback({ success: false, error: msg });
    }
  }

  private async handleReadMessageLegacy(
    socket: CustomSocket,
    { conversationId }: { conversationId: string },
  ): Promise<void> {
    try {
      if (!conversationId)
        return this.emitError(socket, "Conversation ID is required");
      const result = await this._chatRepo.markConversationRead(
        conversationId,
        socket.userId as string,
      );
      this._io.to(conversationId).emit(SOCKET_EVENTS.MESSAGE_READ, result);
    } catch (error) {
      logger.error(
        `handleReadMessageLegacy failed for ${socket.userId}:`,
        error,
      );
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

  broadcastToConversation(
    conversationId: string,
    event: string,
    data: unknown,
  ): void {
    if (this._io) {
      this._io.to(conversationId).emit(event, data);
    }
  }
}

export function initSocket(
  httpServer: http.Server,
  clientUrl: string,
  expressApp?: Application,
): void {
  const gateway = container.resolve(ChatGateway);
  gateway.initialize(httpServer, clientUrl, expressApp);
}
