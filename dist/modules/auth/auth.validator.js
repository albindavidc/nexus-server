"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginValidator = exports.registerValidator = exports.AuthValidator = void 0;
const express_validator_1 = require("express-validator");
class AuthValidator {
    static get registerRules() {
        return [
            (0, express_validator_1.body)("firstName").trim().notEmpty().withMessage("First name is required"),
            (0, express_validator_1.body)("lastName").trim().notEmpty().withMessage("Last name is required"),
            (0, express_validator_1.body)("username").trim().notEmpty().withMessage("Username is required"),
            (0, express_validator_1.body)("email")
                .trim()
                .notEmpty()
                .withMessage("Email is required")
                .isEmail()
                .withMessage("Please provide a valid email address"),
            (0, express_validator_1.body)("password")
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
    static get loginRules() {
        return [
            (0, express_validator_1.body)("email").trim().notEmpty().withMessage("Email is required"),
            (0, express_validator_1.body)("password").trim().notEmpty().withMessage("Password is required"),
        ];
    }
    static get verifyOtpRules() {
        return [
            (0, express_validator_1.body)("email")
                .trim()
                .notEmpty()
                .withMessage("Email is required")
                .isEmail()
                .withMessage("Please provide a valid email address"),
            (0, express_validator_1.body)("otp")
                .trim()
                .notEmpty()
                .withMessage("OTP is required")
                .isLength({ min: 6, max: 6 })
                .withMessage("OTP must be exactly 6 digits")
                .isNumeric()
                .withMessage("OTP must contain only numbers"),
        ];
    }
    static get resendOtpRules() {
        return [
            (0, express_validator_1.body)("email")
                .trim()
                .notEmpty()
                .withMessage("Email is required")
                .isEmail()
                .withMessage("Please provide a valid email address"),
        ];
    }
}
exports.AuthValidator = AuthValidator;
exports.registerValidator = AuthValidator.registerRules;
exports.loginValidator = AuthValidator.loginRules;
