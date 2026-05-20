import { body, ValidationChain } from "express-validator";

/**
 * AuthValidator — Single Responsibility: defines validation rule chains for auth routes.
 * Open/Closed: add new rule sets as static getters without modifying existing ones.
 */
export class AuthValidator {
  /**
   * Rules for POST /auth/register
   */
  static get registerRules(): ValidationChain[] {
    return [
      body("firstName").trim().notEmpty().withMessage("First name is required"),
      body("lastName").trim().notEmpty().withMessage("Last name is required"),
      body("username").trim().notEmpty().withMessage("Username is required"),
      body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address"),
      body("password")
        .trim()
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long")
        .isLength({ max: 20 })
        .withMessage("Password must be at most 20 characters long")
        .matches(/[A-Z]/)
        .withMessage("Password must contain at least one uppercase letter")
        .matches(/[a-z]/)
        .withMessage("Password must contain at least one lowercase letter")
        .matches(/[0-9]/)
        .withMessage("Password must contain at least one number")
        .matches(/[@$!%*?&]/)
        .withMessage("Password must contain at least one special character"),
    ];
  }

  /**
   * Rules for POST /auth/login
   */
  static get loginRules(): ValidationChain[] {
    return [
      body("email").trim().notEmpty().withMessage("Email is required"),
      body("password").trim().notEmpty().withMessage("Password is required"),
    ];
  }
}

// Backwards-compatible named exports
export const registerValidator = AuthValidator.registerRules;
export const loginValidator = AuthValidator.loginRules;
