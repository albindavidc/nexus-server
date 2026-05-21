import { body, param, query, ValidationChain, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import AppError from "../../shared/errors/AppError";

export class ChatValidator {
  static validate(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const messages = errors.array().map((e) => e.msg).join(". ");
      return next(new AppError(messages, 422));
    }
    next();
  }

  static get sendMessageRules(): (ValidationChain | ((req: Request, res: Response, next: NextFunction) => void))[] {
    return [
      body("content")
        .if(body("type").not().equals("image").not().equals("file"))
        .notEmpty()
        .withMessage("Message content is required.")
        .isLength({ max: 2000 })
        .withMessage("Message cannot exceed 2000 characters.")
        .trim(),
      body("type")
        .optional()
        .isIn(["text", "image", "file"])
        .withMessage("Invalid message type."),
      body("replyTo")
        .optional()
        .isMongoId()
        .withMessage("replyTo must be a valid message ID."),
      ChatValidator.validate,
    ];
  }

  static get createGroupRules(): (ValidationChain | ((req: Request, res: Response, next: NextFunction) => void))[] {
    return [
      body("name")
        .notEmpty()
        .withMessage("Group name is required.")
        .isLength({ max: 80 })
        .withMessage("Group name cannot exceed 80 characters.")
        .trim(),
      body("participantIds")
        .isArray({ min: 1 })
        .withMessage("Provide at least one participant."),
      body("participantIds.*")
        .isMongoId()
        .withMessage("Each participant must be a valid user ID."),
      ChatValidator.validate,
    ];
  }

  static get conversationIdRules(): (ValidationChain | ((req: Request, res: Response, next: NextFunction) => void))[] {
    return [
      param("conversationId").isMongoId().withMessage("Invalid conversation ID."),
      ChatValidator.validate,
    ];
  }

  static get userIdRules(): (ValidationChain | ((req: Request, res: Response, next: NextFunction) => void))[] {
    return [
      param("userId").isMongoId().withMessage("Invalid user ID."),
      ChatValidator.validate,
    ];
  }

  static get messageIdRules(): (ValidationChain | ((req: Request, res: Response, next: NextFunction) => void))[] {
    return [
      param("messageId").isMongoId().withMessage("Invalid message ID."),
      ChatValidator.validate,
    ];
  }

  static get paginationRules(): (ValidationChain | ((req: Request, res: Response, next: NextFunction) => void))[] {
    return [
      query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100."),
      query("before")
        .optional()
        .isISO8601()
        .withMessage("before must be a valid ISO 8601 date."),
      ChatValidator.validate,
    ];
  }
}

export const sendMessageValidator = ChatValidator.sendMessageRules;
export const createGroupValidator = ChatValidator.createGroupRules;
export const conversationIdValidator = ChatValidator.conversationIdRules;
export const userIdValidator = ChatValidator.userIdRules;
export const messageIdValidator = ChatValidator.messageIdRules;
export const paginationValidator = ChatValidator.paginationRules;
