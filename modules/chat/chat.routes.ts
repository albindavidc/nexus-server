import { Router } from "express";
import { upload } from "../../shared/utils/upload.util";
import { container } from "tsyringe";
import { ChatController } from "./chat.controller";
import { AuthMiddleware } from "../../middlewares/auth.middleware";

const router = Router();
const chatController = container.resolve(ChatController);
const authMiddleware = container.resolve(AuthMiddleware);

router.post(
  "/upload",
  authMiddleware.protect,
  upload.single("media"),
  chatController.uploadAttachment,
);

router.get(
  "/:conversationId/chat/search",
  authMiddleware.protect,
  chatController.searchMessagesInConversation,
);

export default router;
