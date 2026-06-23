"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferOwnershipValidator = exports.addMembersValidator = exports.updateGroupValidator = exports.createGroupValidator = exports.userIdParam = exports.groupIdParam = void 0;
const express_validator_1 = require("express-validator");
const AppError_1 = __importDefault(require("../../shared/errors/AppError"));
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const message = errors
            .array()
            .map((e) => e.msg)
            .join(" , ");
        return next(new AppError_1.default(message, 400));
    }
    next();
};
exports.groupIdParam = [
    (0, express_validator_1.param)("groupId").isMongoId().withMessage("Invalid group ID"),
    validate,
];
exports.userIdParam = [
    (0, express_validator_1.param)("userId").isMongoId().withMessage("Invalid user ID"),
    validate,
];
exports.createGroupValidator = [
    (0, express_validator_1.body)("name").notEmpty().withMessage("Group name is required"),
    (0, express_validator_1.body)("description").optional().isString().withMessage("Description must be a string"),
    (0, express_validator_1.body)("participantIds")
        .optional()
        .isArray({ min: 1 })
        .withMessage("Participants must be an array of at least one ID"),
    (0, express_validator_1.body)("participantIds.*")
        .isMongoId()
        .withMessage("Each participant must be a valid user ID"),
    (0, express_validator_1.body)("avatarUrl").optional().isURL().withMessage("Avatar URL must be a valid URL"),
    (0, express_validator_1.body)("theme").optional().isString().withMessage("Theme must be a string"),
    validate,
];
exports.updateGroupValidator = [
    (0, express_validator_1.body)("name").optional().notEmpty().withMessage("Group name cannot be empty"),
    (0, express_validator_1.body)("description").optional().isString().withMessage("Description must be a string"),
    (0, express_validator_1.body)("avatarUrl").optional().isURL().withMessage("Avatar URL must be a valid URL"),
    validate,
];
exports.addMembersValidator = [
    (0, express_validator_1.body)("userIds")
        .isArray({ min: 1 })
        .withMessage("userIds must be an array of at least one ID"),
    (0, express_validator_1.body)("userIds.*")
        .isMongoId()
        .withMessage("Each userIds entry must be a valid user ID"),
    validate,
];
exports.transferOwnershipValidator = [
    (0, express_validator_1.body)("newOwnerId")
        .isMongoId()
        .notEmpty()
        .withMessage("newOwnerId must be a valid user ID"),
    validate,
];
