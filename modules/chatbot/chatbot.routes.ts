import { Router } from "express";
import { container } from "tsyringe";
import { ChatBotController } from "./chatbot.controller";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import { ChatBotValidator } from "./chatbot.validator";

const router = Router();
const ctrl = container.resolve(ChatBotController);
const authMiddleware = container.resolve(AuthMiddleware);

router.use(authMiddleware.protect);

router.post("/chat", ChatBotValidator.chatValidator(), ctrl.chat);
router.post("/stream", ChatBotValidator.chatValidator(), ctrl.stream);
router.post("/bulk", ChatBotValidator.bulkChatRules(), ctrl.bulk);
router.get("/history", ctrl.getHistory);
router.delete("/history", ctrl.clearHistory);

export default router;
