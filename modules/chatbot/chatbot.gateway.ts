import { Server } from "socket.io";
import { ChatBotService } from "./chatbot.service";
import { container } from "tsyringe";
import {
  BOT_USER_ID,
  BOT_USER_NAME,
  SOCKET_EVENTS,
} from "../../shared/constants";
import logger from "../../shared/utils/logger";
import { TOKENS } from "../../shared/di/tokens";
import { IBulkChatRequestDto, IChatBotRequestDto } from "../../shared/types/chatbot.types";
import { CustomSocket } from "../../middlewares/auth.middleware";

interface BotMessagePayload {
  conversationId: string;
  message: string;
  history?: { role: "user" | "assistant"; message: string }[];
}

type AckCallback = (response: Record<string, unknown>) => void;


export class ChatBotGateway {
  private readonly _chatBotService: ChatBotService;

  constructor() {
    this._chatBotService = container.resolve<ChatBotService>(TOKENS.ChatBotService);
  }


  registerHandlers(socket: CustomSocket, io: Server): void {
    socket.on(SOCKET_EVENTS.BOT_MESSAGE, (payload: BotMessagePayload) => {
      this.handleBotMessage(socket, io, payload);
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

  private getUserId(socket: CustomSocket): string {
    return String(socket.user?._id ?? socket.userId);
  }

  private async handleGetHistory(socket: CustomSocket, _payload: Record<string, unknown>, callback?: AckCallback): Promise<void> {
    try {
      const messages = await this._chatBotService.getHistory(this.getUserId(socket));
      if (typeof callback === "function") callback({ success: true, data: { messages } });
    } catch (error: unknown) {
      logger.error(`handleGetHistory failed:`, error);
      const msg = error instanceof Error ? error.message : "Failed to fetch bot history";
      if (typeof callback === "function") callback({ success: false, error: msg });
    }
  }

  private async handleClearHistory(socket: CustomSocket, _payload: Record<string, unknown>, callback?: AckCallback): Promise<void> {
    try {
      await this._chatBotService.clearHistory(this.getUserId(socket));
      if (typeof callback === "function") callback({ success: true, data: { message: "History cleared." } });
    } catch (error: unknown) {
      logger.error(`handleClearHistory failed:`, error);
      const msg = error instanceof Error ? error.message : "Failed to clear bot history";
      if (typeof callback === "function") callback({ success: false, error: msg });
    }
  }

  private async handleBulkMessage(socket: CustomSocket, payload: IBulkChatRequestDto, callback?: AckCallback): Promise<void> {
    try {
      const result = await this._chatBotService.bulkChat(this.getUserId(socket), payload);
      if (typeof callback === "function") callback({ success: true, data: result });
    } catch (error: unknown) {
      logger.error(`handleBulkMessage failed:`, error);
      const msg = error instanceof Error ? error.message : "Failed to generate bulk messages";
      if (typeof callback === "function") callback({ success: false, error: msg });
    }
  }

  private async handleChatDirect(socket: CustomSocket, payload: IChatBotRequestDto, callback?: AckCallback): Promise<void> {
    try {
      const result = await this._chatBotService.chat(this.getUserId(socket), payload);
      if (typeof callback === "function") callback({ success: true, data: result });
    } catch (error: unknown) {
      logger.error(`handleChatDirect failed:`, error);
      const msg = error instanceof Error ? error.message : "Failed to generate reply";
      if (typeof callback === "function") callback({ success: false, error: msg });
    }
  }

  private async handleBotMessage(
    socket: CustomSocket,
    io: Server,
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

      const userId = this.getUserId(socket);
      logger.debug(
        `User ${userId} requesting bot message for conversation ${conversationId}`,
      );

      this.emitTyping(io, conversationId, true);
      let fullReplay = "";

      await this._chatBotService.chatStream(
        userId,
        { message: message.trim(), history },

        (chunk: string) => {
          fullReplay += chunk;
          io.to(conversationId).emit(SOCKET_EVENTS.BOT_CHUNK, {
            conversationId,
            chunk,
          });
        },

        () => {
          this.emitTyping(io, conversationId, false);
          io.to(conversationId).emit(SOCKET_EVENTS.BOT_DONE, {
            conversationId,
            fullReplay,
          });
          logger.debug(
            `Bot message completed for conversation ${conversationId}`,
          );
        },

        (err: Error) => {
          this.emitTyping(io, conversationId, false);
          io.to(conversationId).emit(SOCKET_EVENTS.BOT_ERROR, {
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

  private emitTyping(io: Server, conversationId: string, isTyping: boolean): void {
    if (!conversationId) return;
    io.to(conversationId).emit(SOCKET_EVENTS.BOT_TYPING, {
      conversationId,
      userId: BOT_USER_ID,
      username: BOT_USER_NAME,
      isTyping,
    });
  }
}
