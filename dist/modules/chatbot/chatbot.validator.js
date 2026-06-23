"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatBotValidator = void 0;
const express_validator_1 = require("express-validator");
const AppError_1 = __importDefault(require("../../shared/errors/AppError"));
class ChatBotValidator {
    static validate(req, res, next) {
        const error = (0, express_validator_1.validationResult)(req);
        if (!error.isEmpty()) {
            const message = error
                .array()
                .map((e) => e.msg)
                .join(". ");
            return next(new AppError_1.default(message, 422));
        }
        next();
    }
    static chatValidator() {
        return [
            (0, express_validator_1.body)("message").notEmpty().withMessage("Message is required"),
            (0, express_validator_1.body)("history")
                .optional()
                .isArray()
                .withMessage("History must be an array"),
            (0, express_validator_1.body)("history.*.role")
                .isIn(["user", "assistant"])
                .withMessage("Invalid role"),
            (0, express_validator_1.body)("history.*.content").notEmpty().withMessage("Content is required"),
            ChatBotValidator.validate,
        ];
    }
    static bulkChatRules() {
        return [
            (0, express_validator_1.body)("userId").notEmpty().withMessage("User ID is required"),
            (0, express_validator_1.body)("messages").isArray().withMessage("Messages must be an array"),
            (0, express_validator_1.body)("messages.*.id").notEmpty().withMessage("Item ID is required"),
            (0, express_validator_1.body)("messages.*.message").notEmpty().withMessage("Message is required"),
            (0, express_validator_1.body)("messages.*.history")
                .optional()
                .isArray()
                .withMessage("History must be an array"),
            (0, express_validator_1.body)("messages.*.history.*.role")
                .isIn(["user", "assistant"])
                .withMessage("Invalid role"),
            (0, express_validator_1.body)("messages.*.history.*.content")
                .notEmpty()
                .withMessage("Content is required"),
            ChatBotValidator.validate,
        ];
    }
}
exports.ChatBotValidator = ChatBotValidator;
