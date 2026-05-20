import { injectable, inject } from "tsyringe";
import { Response, NextFunction } from "express";
import { IChatService } from "../../shared/interfaces/IChatService";
import { TOKENS } from "../../shared/di/tokens";
import { CustomRequest } from "../../middlewares/auth.middleware";
import { ResponseHelper } from "../../shared/utils/response";
import { FindMessagesOptions } from "../../shared/interfaces/IChatRepository";

/**
 * ChatController — Single Responsibility: parse HTTP input → delegate to ChatService → return HTTP response.
 * Depends on IChatService abstraction (DIP).
 * Arrow-function methods preserve `this` context when passed to Express router.
 */
@injectable()
export default class ChatController {
  constructor(@inject(TOKENS.IChatService) private chatService: IChatService) {}

  getMyConversations = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversations = await this.chatService.getMyConversations(String(req.user._id));
      ResponseHelper.success(res, 200, "Conversations fetched.", { conversations });
    } catch (err) {
      next(err);
    }
  };

  getConversationById = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversation = await this.chatService.getConversationById(
        String(req.params.conversationId),
        String(req.user._id)
      );
      ResponseHelper.success(res, 200, "Conversation fetched.", { conversation });
    } catch (err) {
      next(err);
    }
  };

  startDirectConversation = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversation = await this.chatService.getOrCreateDirectConversation(
        String(req.user._id),
        String(req.params.userId)
      );
      ResponseHelper.success(res, 200, "Direct conversation ready.", { conversation });
    } catch (err) {
      next(err);
    }
  };

  createGroupConversation = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversation = await this.chatService.createGroupConversation(
        String(req.user._id),
        req.body
      );
      ResponseHelper.success(res, 201, "Group conversation created.", { conversation });
    } catch (err) {
      next(err);
    }
  };

  getMessages = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { before, limit } = req.query;
      const options: FindMessagesOptions = {
        before: before as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };
      const messages = await this.chatService.getMessages(
        String(req.params.conversationId),
        String(req.user._id),
        options
      );
      ResponseHelper.success(res, 200, "Messages fetched.", { messages });
    } catch (err) {
      next(err);
    }
  };

  sendMessage = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const message = await this.chatService.sendMessage(
        String(req.user._id),
        String(req.params.conversationId),
        req.body
      );
      ResponseHelper.success(res, 201, "Message sent.", { message });
    } catch (err) {
      next(err);
    }
  };

  markConversationRead = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.chatService.markAsRead(String(req.params.conversationId), String(req.user._id));
      ResponseHelper.success(res, 200, "Conversation marked as read.");
    } catch (err) {
      next(err);
    }
  };

  deleteMessage = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.chatService.deleteMessage(String(req.params.messageId), String(req.user._id));
      ResponseHelper.success(res, 200, "Message deleted.");
    } catch (err) {
      next(err);
    }
  };
}
