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

interface AuthSocket extends Socket {
  user: { _id: string; username: string };
}

interface BotMessagePayload {
  conversationId: string;
  message: string;
  history?: { role: "user" | "assistant"; message: string }[];
}

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

    const authMiddleware = container.resolve(AuthMiddleware);
    io.use(authMiddleware.authenticateSocket as Parameters<Server["use"]>[0]);

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
  }

  private async handleBotMessage(
    socket: AuthSocket,
    payload: BotMessagePayload,
  ): Promise<void> {
    const { conversationId, message, history } = payload;

    if (!conversationId.trim() || !message.trim()) {
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
        logger.error("Error in chatbot gateway" + err.message);
      },
    );
  }

  private emitTyping(conversationId: string, isTyping: boolean): void {
    this._io.to(conversationId).emit(SOCKET_EVENTS.BOT_TYPING, {
      conversationId,
      userId: BOT_USER_ID,
      username: BOT_USER_NAME,
      isTyping,
    });
  }
}
