import express from "express";
import { container } from "tsyringe";
import AuthController from "./auth.controller";
import { AuthValidator } from "./auth.validator";
import { protect } from "../../middlewares/auth.middleware";

const router = express.Router();
const authCtrl = container.resolve(AuthController);

/**
 * Auth Routes — Single Responsibility: map HTTP verbs + paths to controller methods.
 * Uses AuthValidator static getters for clean, readable validation chains.
 */
router.post("/register", AuthValidator.registerRules, authCtrl.register);
router.post("/login", AuthValidator.loginRules, authCtrl.login);
router.post("/refresh-token", authCtrl.refreshToken);

router.post("/logout", protect, authCtrl.logout);
router.get("/user", protect, authCtrl.getUser);

export default router;
