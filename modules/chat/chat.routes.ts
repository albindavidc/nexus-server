import express from "express";
import { container } from "tsyringe";
import ChatController from "./chat.controller";
import { ChatValidator } from "./chat.validator";
import { protect } from "../../middlewares/auth.middleware";

const router = express.Router();
const ctrl = container.resolve(ChatController);

/**
 * Chat Routes — Single Responsibility: HTTP route mapping for the chat module.
 * Uses ChatValidator static getters for clean, self-documenting validation chains.
 */
router.use(protect);

router.get("/conversations", ctrl.getMyConversations);
router.get("/conversations/:conversationId", ChatValidator.conversationIdRules, ctrl.getConversationById);
router.post("/conversations/direct/:userId", ChatValidator.userIdRules, ctrl.startDirectConversation);
router.post("/conversations/group", ChatValidator.createGroupRules, ctrl.createGroupConversation);

router.get(
  "/conversations/:conversationId/messages",
  [
    ...ChatValidator.conversationIdRules.slice(0, -1),
    ...ChatValidator.paginationRules,
  ],
  ctrl.getMessages
);

router.post(
  "/conversations/:conversationId/messages",
  [
    ...ChatValidator.conversationIdRules.slice(0, -1),
    ...ChatValidator.sendMessageRules,
  ],
  ctrl.sendMessage
);

router.patch(
  "/conversations/:conversationId/read",
  ChatValidator.conversationIdRules,
  ctrl.markConversationRead
);

router.delete("/messages/:messageId", ChatValidator.messageIdRules, ctrl.deleteMessage);

export default router;
