import { body, ValidationChain } from "express-validator";

export class AuthValidator {
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

  static get loginRules(): ValidationChain[] {
    return [
      body("email").trim().notEmpty().withMessage("Email is required"),
      body("password").trim().notEmpty().withMessage("Password is required"),
    ];
  }

  static get verifyOtpRules(): ValidationChain[] {
    return [
      body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address"),
      body("otp")
        .trim()
        .notEmpty()
        .withMessage("OTP is required")
        .isLength({ min: 6, max: 6 })
        .withMessage("OTP must be exactly 6 digits")
        .isNumeric()
        .withMessage("OTP must contain only numbers"),
    ];
  }

  static get resendOtpRules(): ValidationChain[] {
    return [
      body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address"),
    ];
  }
}

export const registerValidator = AuthValidator.registerRules;
export const loginValidator = AuthValidator.loginRules;
