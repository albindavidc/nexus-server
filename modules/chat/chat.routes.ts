import express, { RequestHandler } from "express";
import { container } from "tsyringe";
import ChatController from "./chat.controller";
import { ChatValidator } from "./chat.validator";
import { AuthMiddleware } from "../../middlewares/auth.middleware";

const router = express.Router();
const ctrl = container.resolve(ChatController);
const authMiddleware = container.resolve(AuthMiddleware);

router.use(authMiddleware.protect);

router.get("/conversations", ctrl.getMyConversations as RequestHandler);
router.get("/conversations/:conversationId", ChatValidator.conversationIdRules, ctrl.getConversationById as RequestHandler);
router.post("/conversations/direct/:userId", ChatValidator.userIdRules, ctrl.startDirectConversation as RequestHandler);
router.post("/conversations/group", ChatValidator.createGroupRules, ctrl.createGroupConversation as RequestHandler);

router.get(
  "/conversations/:conversationId/messages",
  [
    ...ChatValidator.conversationIdRules.slice(0, -1),
    ...ChatValidator.paginationRules,
  ],
  ctrl.getMessages as RequestHandler,
);

router.post(
  "/conversations/:conversationId/messages",
  [
    ...ChatValidator.conversationIdRules.slice(0, -1),
    ...ChatValidator.sendMessageRules,
  ],
  ctrl.sendMessage as RequestHandler,
);

router.patch(
  "/conversations/:conversationId/read",
  ChatValidator.conversationIdRules,
  ctrl.markConversationRead as RequestHandler,
);

router.delete("/messages/:messageId", ChatValidator.messageIdRules, ctrl.deleteMessage as RequestHandler);
router.delete("/conversations/:conversationId/clear", ChatValidator.conversationIdRules, ctrl.clearConversation as RequestHandler);

export default router;
