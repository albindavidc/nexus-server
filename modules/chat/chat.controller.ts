import { NextFunction, Request, Response } from "express";
import AppError from "../../shared/errors/AppError";
import { CustomRequest } from "../../middlewares/auth.middleware";
import ChatService from "./chat.service";

export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  async uploadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError("File is required", 400);

      const file = req.file as Express.MulterS3.File;

      return res.status(200).json({
        status: true,
        message: "Attachment uploaded successfully",
        data: {
          mediaUrl: file.location,
          mediaMeta: {
            mimeType: req.file.mimetype,
            size: req.file.size,
            filename: req.file.originalname,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async searchMessagesInConversation(
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { conversationId } = req.params;
      const { query } = req.query;
      const userId = req.userId;

      if (!conversationId || !query)
        throw new AppError("Conversation ID and query are required", 400);

      const results = await this.chatService.searchMessagesInConversation(
        conversationId as string,
        userId!,
        query as string,
      );

      return res.status(200).json({
        status: true,
        message: "Messages searched successfully",
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }
}
