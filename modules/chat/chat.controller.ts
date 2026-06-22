import { NextFunction, Request, Response } from "express";
import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../shared/di/tokens";
import AppError from "../../shared/errors/AppError";
import { CustomRequest } from "../../middlewares/auth.middleware";
import ChatService from "./chat.service";
import { IGroupService } from "../../shared/interfaces/services/group-service.interface";
import { Types } from "mongoose";

@injectable()
export class ChatController {
  constructor(
    @inject(TOKENS.ChatService) private readonly chatService: ChatService,
    @inject(TOKENS.GroupService) private readonly groupService: IGroupService
  ) {}

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

  searchMessagesInConversation = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) => {
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

  createGroup = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.userId;
      const data = req.body;

      // Handle undefined participantIds
      if (!data.participantIds) {
        data.participantIds = [];
      }

      const conversation = await this.groupService.createGroup(
        new Types.ObjectId(userId as string),
        data,
      );

      return res.status(201).json({
        status: true,
        message: "Group created successfully",
        data: { conversation },
      });
    } catch (error) {
      next(error);
    }
  };
}
