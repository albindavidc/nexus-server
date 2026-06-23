"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
const express_1 = __importDefault(require("express"));
const tsyringe_1 = require("tsyringe");
const auth_controller_1 = __importDefault(require("./auth.controller"));
const auth_validator_1 = require("./auth.validator");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
function authRoutes() {
    const router = express_1.default.Router();
    const authCtrl = tsyringe_1.container.resolve(auth_controller_1.default);
    const authMiddleware = tsyringe_1.container.resolve(auth_middleware_1.AuthMiddleware);
    router.post("/register", auth_validator_1.AuthValidator.registerRules, authCtrl.register);
    router.post("/login", auth_validator_1.AuthValidator.loginRules, authCtrl.login);
    router.post("/refresh-token", authCtrl.refreshToken);
    router.post("/send-otp", auth_validator_1.AuthValidator.resendOtpRules, authCtrl.sendOtp);
    router.post("/verify-otp", auth_validator_1.AuthValidator.verifyOtpRules, authCtrl.verifyOtp);
    router.post("/logout", authMiddleware.protect, authCtrl.logout);
    router.get("/user", authMiddleware.protect, authCtrl.getUser);
    router.get("/users/search", authMiddleware.protect, authCtrl.searchUsers);
    return router;
}
