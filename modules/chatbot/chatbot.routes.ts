import { Router } from "express";
import { ChatBotValidator } from "./chatbot.validator";
import { container } from "tsyringe";
import { protect } from "../../middlewares/auth.middleware";

const router = Router();

// const chatbotController = container.resolve(ChatBotController);

router.use(protect);

// router.post(
//   "/",
//   authGuard,
//   chatValidator(),
//   chatBotController.chat,
// );

// router.post(
//   "/bulk",
//   authGuard,
//   ChatBotValidator.bulkChatRules,
//   chatBotController.bulkChat,
// );

export const chatBotRoutes = router;
