"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = chatRoutes;
const express_1 = require("express");
const upload_util_1 = require("../../shared/utils/upload.util");
const tsyringe_1 = require("tsyringe");
const chat_controller_1 = require("./chat.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
function chatRoutes() {
    const router = (0, express_1.Router)();
    const chatController = tsyringe_1.container.resolve(chat_controller_1.ChatController);
    const authMiddleware = tsyringe_1.container.resolve(auth_middleware_1.AuthMiddleware);
    router.post("/upload", authMiddleware.protect, upload_util_1.upload.single("media"), chatController.uploadAttachment);
    router.get("/:conversationId/chat/search", authMiddleware.protect, chatController.searchMessagesInConversation);
    router.post("/group", authMiddleware.protect, chatController.createGroup);
    return router;
}
