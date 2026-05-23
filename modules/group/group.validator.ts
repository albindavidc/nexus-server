import { NextFunction } from "express";
import { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import AppError from "../../shared/errors/AppError";

const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(" , ");
    return next(new AppError(message, 400));
  }
  next();
};

export const groupIdParam = [
  param("groupId").isMongoId().withMessage("Invalid group ID"),
  validate,
];

export const userIdParam = [
  param("userId").isMongoId().withMessage("Invalid user ID"),
  validate,
];

export const createGroupValidator = [
  body("name").notEmpty().withMessage("Group name is required"),
  body("description").optional().isString().withMessage("Description must be a string"),
  body("participantIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Participants must be an array of at least one ID"),
  body("participantIds.*")
    .isMongoId()
    .withMessage("Each participant must be a valid user ID"),
  body("avatarUrl").optional().isURL().withMessage("Avatar URL must be a valid URL"),
  validate,
];

export const updateGroupValidator = [
  body("name").optional().notEmpty().withMessage("Group name cannot be empty"),
  body("description").optional().isString().withMessage("Description must be a string"),
  body("avatarUrl").optional().isURL().withMessage("Avatar URL must be a valid URL"),
  validate,
];

export const addMembersValidator = [
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("userIds must be an array of at least one ID"),
  body("userIds.*")
    .isMongoId()
    .withMessage("Each userIds entry must be a valid user ID"),
  validate,
];

export const transferOwnershipValidator = [
  body("newOwnerId")
    .isMongoId()
    .notEmpty()
    .withMessage("newOwnerId must be a valid user ID"),
  validate,
];
