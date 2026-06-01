import { injectable, inject } from "tsyringe";
import { Response, NextFunction } from "express";
import { IChatService } from "../../shared/interfaces/services/chat-service.interface";
import { TOKENS } from "../../shared/di/tokens";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { ResponseHelper } from "../../shared/utils/response";
import { FindMessagesOptions } from "../../shared/interfaces/repository/chat-repository.interface";
import { ChatGateway } from "./chat.gateway";

@injectable()
export default class ChatController {
  constructor(
    @inject(TOKENS.ChatService) private _chatService: IChatService,
    private _chatGateway: ChatGateway,
  ) {}

  getMyConversations = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const conversations = await this._chatService.getMyConversations(
        String(req.user._id),
      );
      ResponseHelper.success(res, 200, "Conversations fetched.", {
        conversations,
      });
    } catch (err) {
      next(err);
    }
  };

  getConversationById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const conversation = await this._chatService.getConversationById(
        String(req.params.conversationId),
        String(req.user._id),
      );
      ResponseHelper.success(res, 200, "Conversation fetched.", {
        conversation,
      });
    } catch (err) {
      next(err);
    }
  };

  startDirectConversation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const conversation = await this._chatService.getOrCreateDirectConversation(
        String(req.user._id),
        String(req.params.userId),
      );
      ResponseHelper.success(res, 200, "Direct conversation ready.", {
        conversation,
      });
    } catch (err) {
      next(err);
    }
  };

  createGroupConversation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const conversation = await this._chatService.createGroupConversation(
        String(req.user._id),
        req.body,
      );
      ResponseHelper.success(res, 201, "Group conversation created.", {
        conversation,
      });
    } catch (err) {
      next(err);
    }
  };

  getMessages = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { before, limit } = req.query;
      const options: FindMessagesOptions = {
        before: before as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };
      const messages = await this._chatService.getMessages(
        String(req.params.conversationId),
        String(req.user._id),
        options,
      );
      ResponseHelper.success(res, 200, "Messages fetched.", { messages });
    } catch (err) {
      next(err);
    }
  };

  sendMessage = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const message = await this._chatService.sendMessage(
        String(req.user._id),
        String(req.params.conversationId),
        req.body,
      );
      this._chatGateway.broadcastToConversation(
        String(req.params.conversationId),
        "new_message",
        message,
      );
      ResponseHelper.success(res, 201, "Message sent.", { message });
    } catch (err) {
      next(err);
    }
  };

  markConversationRead = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this._chatService.markAsRead(
        String(req.params.conversationId),
        String(req.user._id),
      );
      ResponseHelper.success(res, 200, "Conversation marked as read.");
    } catch (err) {
      next(err);
    }
  };

  deleteMessage = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this._chatService.deleteMessage(
        String(req.params.messageId),
        String(req.user._id),
      );
      ResponseHelper.success(res, 200, "Message deleted.");
    } catch (err) {
      next(err);
    }
  };

  clearConversation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this._chatService.clearConversation(
        String(req.params.conversationId),
        String(req.user._id),
      );
      ResponseHelper.success(res, 200, "Conversation history cleared.");
    } catch (err) {
      next(err);
    }
  };
}
