import { Request, Response, NextFunction } from "express";
import {
  body,
  ValidationChain,
  validationResult,
} from "express-validator";
import AppError from "../../shared/errors/AppError";

export class ChatBotValidator {
  static validate(req: Request, res: Response, next: NextFunction): void {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      const message = error
        .array()
        .map((e) => e.msg)
        .join(". ");
      return next(new AppError(message, 422));
    }
    next();
  }

  static chatValidator(): (
    | ValidationChain
    | ((req: Request, res: Response, next: NextFunction) => void)
  )[] {
    return [
      body("message").notEmpty().withMessage("Message is required"),
      body("history")
        .optional()
        .isArray()
        .withMessage("History must be an array"),
      body("history.*.role")
        .isIn(["user", "assistant"])
        .withMessage("Invalid role"),
      body("history.*.content").notEmpty().withMessage("Content is required"),
      ChatBotValidator.validate,
    ];
  }

  static bulkChatRules(): (
    | ValidationChain
    | ((req: Request, res: Response, next: NextFunction) => void)
  )[] {
    return [
      body("userId").notEmpty().withMessage("User ID is required"),
      body("messages").isArray().withMessage("Messages must be an array"),
      body("messages.*.id").notEmpty().withMessage("Item ID is required"),
      body("messages.*.message").notEmpty().withMessage("Message is required"),
      body("messages.*.history")
        .optional()
        .isArray()
        .withMessage("History must be an array"),
      body("messages.*.history.*.role")
        .isIn(["user", "assistant"])
        .withMessage("Invalid role"),
      body("messages.*.history.*.content")
        .notEmpty()
        .withMessage("Content is required"),
      ChatBotValidator.validate,
    ];
  }
}
