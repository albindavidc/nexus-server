"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationValidator = exports.messageIdValidator = exports.userIdValidator = exports.conversationIdValidator = exports.createGroupValidator = exports.sendMessageValidator = exports.ChatValidator = void 0;
const express_validator_1 = require("express-validator");
const AppError_1 = __importDefault(require("../../shared/errors/AppError"));
class ChatValidator {
    static validate(req, res, next) {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            const messages = errors.array().map((e) => e.msg).join(". ");
            return next(new AppError_1.default(messages, 422));
        }
        next();
    }
    static get sendMessageRules() {
        return [
            (0, express_validator_1.body)("content")
                .if((0, express_validator_1.body)("type").not().equals("image").not().equals("file"))
                .notEmpty()
                .withMessage("Message content is required.")
                .isLength({ max: 2000 })
                .withMessage("Message cannot exceed 2000 characters.")
                .trim(),
            (0, express_validator_1.body)("type")
                .optional()
                .isIn(["text", "image", "file"])
                .withMessage("Invalid message type."),
            (0, express_validator_1.body)("replyTo")
                .optional()
                .isMongoId()
                .withMessage("replyTo must be a valid message ID."),
            ChatValidator.validate,
        ];
    }
    static get createGroupRules() {
        return [
            (0, express_validator_1.body)("name")
                .notEmpty()
                .withMessage("Group name is required.")
                .isLength({ max: 80 })
                .withMessage("Group name cannot exceed 80 characters.")
                .trim(),
            (0, express_validator_1.body)("participantIds")
                .isArray({ min: 1 })
                .withMessage("Provide at least one participant."),
            (0, express_validator_1.body)("participantIds.*")
                .isMongoId()
                .withMessage("Each participant must be a valid user ID."),
            ChatValidator.validate,
        ];
    }
    static get conversationIdRules() {
        return [
            (0, express_validator_1.param)("conversationId").isMongoId().withMessage("Invalid conversation ID."),
            ChatValidator.validate,
        ];
    }
    static get userIdRules() {
        return [
            (0, express_validator_1.param)("userId").isMongoId().withMessage("Invalid user ID."),
            ChatValidator.validate,
        ];
    }
    static get messageIdRules() {
        return [
            (0, express_validator_1.param)("messageId").isMongoId().withMessage("Invalid message ID."),
            ChatValidator.validate,
        ];
    }
    static get paginationRules() {
        return [
            (0, express_validator_1.query)("limit")
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage("Limit must be between 1 and 100."),
            (0, express_validator_1.query)("before")
                .optional()
                .isISO8601()
                .withMessage("before must be a valid ISO 8601 date."),
            ChatValidator.validate,
        ];
    }
}
exports.ChatValidator = ChatValidator;
exports.sendMessageValidator = ChatValidator.sendMessageRules;
exports.createGroupValidator = ChatValidator.createGroupRules;
exports.conversationIdValidator = ChatValidator.conversationIdRules;
exports.userIdValidator = ChatValidator.userIdRules;
exports.messageIdValidator = ChatValidator.messageIdRules;
exports.paginationValidator = ChatValidator.paginationRules;
