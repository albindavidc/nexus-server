import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../shared/di/tokens";
import { ChatBotService } from "./chatbot.service";
import {
  IBulkChatRequestDto,
  IChatBotRequestDto,
} from "../../shared/types/chatbot.types";
import { sendSuccess } from "../../shared/utils/response";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";

@injectable()
export class ChatBotController {
  constructor(
    @inject(TOKENS.ChatBotService)
    private readonly chatBotService: ChatBotService,
  ) {}

  chat = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id } = (req as AuthenticatedRequest).user;
      const result = await this.chatBotService.chat(
        String(_id),
        req.body as IChatBotRequestDto,
      );
      sendSuccess(res, 200, "Reply generated.", result);
    } catch (error) {
      next(error);
    }
  };

  stream = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id } = (req as AuthenticatedRequest).user;
      const dto = req.body as IChatBotRequestDto;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const send = (event: string, data: unknown): void => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      await this.chatBotService.chatStream(
        String(_id),
        dto,
        (chunk) => send("chunk", { text: chunk }),
        () => {
          send("done", { finished: true });
          res.end();
        },
        (err) => {
          send("error", { message: err.message });
          res.end();
        },
      );

      req.on("close", () => res.end());
    } catch (error) {
      next(error);
    }
  };

  bulk = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id } = (req as AuthenticatedRequest).user;
      const result = await this.chatBotService.bulkChat(
        String(_id),
        req.body as IBulkChatRequestDto,
      );
      sendSuccess(res, 200, "Bulk replies generated.", result);
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id } = (req as AuthenticatedRequest).user;
      const messages = await this.chatBotService.getHistory(String(_id));
      sendSuccess(res, 200, "History fetched.", { messages });
    } catch (error) {
      next(error);
    }
  };

  clearHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id } = (req as AuthenticatedRequest).user;
      await this.chatBotService.clearHistory(String(_id));
      sendSuccess(res, 200, "History cleared.");
    } catch (error) {
      next(error);
    }
  };
}
