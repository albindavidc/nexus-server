import { Server, Socket } from "socket.io";
import { ChatBotService } from "./chatbot.service";
import * as http from "http";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import { container, inject } from "tsyringe";
import {
  BOT_USER_ID,
  BOT_USER_NAME,
  SOCKET_EVENTS,
} from "../../shared/constants";
import logger from "../../shared/utils/logger";
import { TOKENS } from "../../shared/di/tokens";
import { IBulkChatRequestDto, IChatBotRequestDto } from "../../shared/types/chatbot.types";

interface AuthSocket extends Socket {
  user: { _id: string; username: string };
}

interface BotMessagePayload {
  conversationId: string;
  message: string;
  history?: { role: "user" | "assistant"; message: string }[];
}

type AckCallback = (response: Record<string, unknown>) => void;

export class ChatBotGateway {
  private _io!: Server;

  constructor(
    @inject(TOKENS.ChatBotService)
    private readonly _chatBotService: ChatBotService,
  ) {}

  initialize(httpServer: http.Server, clientUrl: string): void {
    const io = new Server(httpServer, {
      cors: {
        origin: clientUrl,
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingInterval: 25 * 1000,
      pingTimeout: 1 * 60 * 1000,
    });

    this._io = io; // Fix: Assign server instance to class property

    const authMiddleware = container.resolve(AuthMiddleware);
    this._io.use(authMiddleware.authenticateSocket as Parameters<Server["use"]>[0]);

    this._io.on("connect", (socket: Socket) => {
      this.handleConnection(socket as AuthSocket);
    });
  }

  private handleConnection(socket: AuthSocket): void {
    const userId = socket.user._id;
    logger.debug(`User ${userId} connected`);

    socket.join(userId);

    this.registerHandlers(socket);

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      logger.debug(`User ${userId} disconnected`);
    });
  }

  registerHandlers(socket: AuthSocket): void {
    socket.on(SOCKET_EVENTS.BOT_MESSAGE, (payload: BotMessagePayload) => {
      this.handleBotMessage(socket, payload);
    });
    socket.on(SOCKET_EVENTS.GET_BOT_HISTORY, (payload: Record<string, unknown>, callback?: AckCallback) => {
      this.handleGetHistory(socket, payload, callback);
    });
    socket.on(SOCKET_EVENTS.CLEAR_BOT_HISTORY, (payload: Record<string, unknown>, callback?: AckCallback) => {
      this.handleClearHistory(socket, payload, callback);
    });
    socket.on(SOCKET_EVENTS.BOT_BULK_MESSAGE, (payload: IBulkChatRequestDto, callback?: AckCallback) => {
      this.handleBulkMessage(socket, payload, callback);
    });
    socket.on(SOCKET_EVENTS.BOT_CHAT_DIRECT, (payload: IChatBotRequestDto, callback?: AckCallback) => {
      this.handleChatDirect(socket, payload, callback);
    });
  }

  private async handleGetHistory(socket: AuthSocket, _payload: Record<string, unknown>, callback?: AckCallback): Promise<void> {
    try {
      const messages = await this._chatBotService.getHistory(socket.user._id);
      if (typeof callback === "function") callback({ success: true, data: { messages } });
    } catch (error: unknown) {
      logger.error(`handleGetHistory failed:`, error);
      const msg = error instanceof Error ? error.message : "Failed to fetch bot history";
      if (typeof callback === "function") callback({ success: false, error: msg });
    }
  }

  private async handleClearHistory(socket: AuthSocket, _payload: Record<string, unknown>, callback?: AckCallback): Promise<void> {
    try {
      await this._chatBotService.clearHistory(socket.user._id);
      if (typeof callback === "function") callback({ success: true, data: { message: "History cleared." } });
    } catch (error: unknown) {
      logger.error(`handleClearHistory failed:`, error);
      const msg = error instanceof Error ? error.message : "Failed to clear bot history";
      if (typeof callback === "function") callback({ success: false, error: msg });
    }
  }

  private async handleBulkMessage(socket: AuthSocket, payload: IBulkChatRequestDto, callback?: AckCallback): Promise<void> {
    try {
      const result = await this._chatBotService.bulkChat(socket.user._id, payload);
      if (typeof callback === "function") callback({ success: true, data: result });
    } catch (error: unknown) {
      logger.error(`handleBulkMessage failed:`, error);
      const msg = error instanceof Error ? error.message : "Failed to generate bulk messages";
      if (typeof callback === "function") callback({ success: false, error: msg });
    }
  }

  private async handleChatDirect(socket: AuthSocket, payload: IChatBotRequestDto, callback?: AckCallback): Promise<void> {
    try {
      const result = await this._chatBotService.chat(socket.user._id, payload);
      if (typeof callback === "function") callback({ success: true, data: result });
    } catch (error: unknown) {
      logger.error(`handleChatDirect failed:`, error);
      const msg = error instanceof Error ? error.message : "Failed to generate reply";
      if (typeof callback === "function") callback({ success: false, error: msg });
    }
  }

  private async handleBotMessage(
    socket: AuthSocket,
    payload: BotMessagePayload,
  ): Promise<void> {
    try {
      const { conversationId, message, history } = payload;

      if (!conversationId?.trim() || !message?.trim()) {
        socket.emit(SOCKET_EVENTS.BOT_ERROR, {
          conversationId,
          message: `ConversationId and message is required`,
        });
        return;
      }

      const userId = socket.user._id;
      logger.debug(
        `User ${userId} requesting bot message for conversation ${conversationId}`,
      );

      this.emitTyping(conversationId, true);
      let fullReplay = "";

      await this._chatBotService.chatStream(
        userId,
        { message: message.trim(), history },

        (chunk: string) => {
          fullReplay += chunk;
          this._io.to(conversationId).emit(SOCKET_EVENTS.BOT_CHUNK, {
            conversationId,
            chunk,
          });
        },

        () => {
          this.emitTyping(conversationId, false);
          this._io.to(conversationId).emit(SOCKET_EVENTS.BOT_DONE, {
            conversationId,
            fullReplay,
          });
          logger.debug(
            `Bot message completed for conversation ${conversationId}`,
          );
        },

        (err: Error) => {
          this.emitTyping(conversationId, false);
          this._io.to(conversationId).emit(SOCKET_EVENTS.BOT_ERROR, {
            conversationId,
            message: err.message,
          });
          logger.error("Error in chatbot gateway: " + err.message);
        },
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unexpected error during bot stream";
      logger.error(`handleBotMessage failed:`, msg);
      socket.emit(SOCKET_EVENTS.BOT_ERROR, { message: msg });
    }
  }

  private emitTyping(conversationId: string, isTyping: boolean): void {
    if (!conversationId) return;
    this._io.to(conversationId).emit(SOCKET_EVENTS.BOT_TYPING, {
      conversationId,
      userId: BOT_USER_ID,
      username: BOT_USER_NAME,
      isTyping,
    });
  }
}
