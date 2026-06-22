import express from "express";
import { container } from "tsyringe";
import AuthController from "./auth.controller";
import { AuthValidator } from "./auth.validator";
import { AuthMiddleware } from "../../middlewares/auth.middleware";

export default function authRoutes() {
  const router = express.Router();
  const authCtrl = container.resolve(AuthController);
  const authMiddleware = container.resolve(AuthMiddleware);

  router.post("/register", AuthValidator.registerRules, authCtrl.register);
  router.post("/login", AuthValidator.loginRules, authCtrl.login);
  router.post("/refresh-token", authCtrl.refreshToken);

  router.post("/send-otp", AuthValidator.resendOtpRules, authCtrl.sendOtp);
  router.post("/verify-otp", AuthValidator.verifyOtpRules, authCtrl.verifyOtp);

  router.post("/logout", authMiddleware.protect, authCtrl.logout);
  router.get("/user", authMiddleware.protect, authCtrl.getUser);
  router.get("/users/search", authMiddleware.protect, authCtrl.searchUsers);

  return router;
}
