"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatBotGateway = void 0;
const tsyringe_1 = require("tsyringe");
const constants_1 = require("../../shared/constants");
const logger_1 = __importDefault(require("../../shared/utils/logger"));
const tokens_1 = require("../../shared/di/tokens");
class ChatBotGateway {
    _chatBotService;
    constructor() {
        this._chatBotService = tsyringe_1.container.resolve(tokens_1.TOKENS.ChatBotService);
    }
    registerHandlers(socket, io) {
        socket.on(constants_1.SOCKET_EVENTS.BOT_MESSAGE, (payload) => {
            this.handleBotMessage(socket, io, payload);
        });
        socket.on(constants_1.SOCKET_EVENTS.GET_BOT_HISTORY, (payload, callback) => {
            this.handleGetHistory(socket, payload, callback);
        });
        socket.on(constants_1.SOCKET_EVENTS.CLEAR_BOT_HISTORY, (payload, callback) => {
            this.handleClearHistory(socket, payload, callback);
        });
        socket.on(constants_1.SOCKET_EVENTS.BOT_BULK_MESSAGE, (payload, callback) => {
            this.handleBulkMessage(socket, payload, callback);
        });
        socket.on(constants_1.SOCKET_EVENTS.BOT_CHAT_DIRECT, (payload, callback) => {
            this.handleChatDirect(socket, payload, callback);
        });
    }
    getUserId(socket) {
        return String(socket.user?._id ?? socket.userId);
    }
    async handleGetHistory(socket, _payload, callback) {
        try {
            const messages = await this._chatBotService.getHistory(this.getUserId(socket));
            if (typeof callback === "function")
                callback({ success: true, data: { messages } });
        }
        catch (error) {
            logger_1.default.error(`handleGetHistory failed:`, error);
            const msg = error instanceof Error ? error.message : "Failed to fetch bot history";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
        }
    }
    async handleClearHistory(socket, _payload, callback) {
        try {
            await this._chatBotService.clearHistory(this.getUserId(socket));
            if (typeof callback === "function")
                callback({ success: true, data: { message: "History cleared." } });
        }
        catch (error) {
            logger_1.default.error(`handleClearHistory failed:`, error);
            const msg = error instanceof Error ? error.message : "Failed to clear bot history";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
        }
    }
    async handleBulkMessage(socket, payload, callback) {
        try {
            const result = await this._chatBotService.bulkChat(this.getUserId(socket), payload);
            if (typeof callback === "function")
                callback({ success: true, data: result });
        }
        catch (error) {
            logger_1.default.error(`handleBulkMessage failed:`, error);
            const msg = error instanceof Error ? error.message : "Failed to generate bulk messages";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
        }
    }
    async handleChatDirect(socket, payload, callback) {
        try {
            const result = await this._chatBotService.chat(this.getUserId(socket), payload);
            if (typeof callback === "function")
                callback({ success: true, data: result });
        }
        catch (error) {
            logger_1.default.error(`handleChatDirect failed:`, error);
            const msg = error instanceof Error ? error.message : "Failed to generate reply";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
        }
    }
    async handleBotMessage(socket, io, payload) {
        try {
            const { conversationId, message, history } = payload;
            if (!conversationId?.trim() || !message?.trim()) {
                socket.emit(constants_1.SOCKET_EVENTS.BOT_ERROR, {
                    conversationId,
                    message: `ConversationId and message is required`,
                });
                return;
            }
            const userId = this.getUserId(socket);
            logger_1.default.debug(`User ${userId} requesting bot message for conversation ${conversationId}`);
            this.emitTyping(io, conversationId, true);
            let fullReplay = "";
            await this._chatBotService.chatStream(userId, { message: message.trim(), history }, (chunk) => {
                fullReplay += chunk;
                io.to(conversationId).emit(constants_1.SOCKET_EVENTS.BOT_CHUNK, {
                    conversationId,
                    chunk,
                });
            }, () => {
                this.emitTyping(io, conversationId, false);
                io.to(conversationId).emit(constants_1.SOCKET_EVENTS.BOT_DONE, {
                    conversationId,
                    fullReplay,
                });
                logger_1.default.debug(`Bot message completed for conversation ${conversationId}`);
            }, (err) => {
                this.emitTyping(io, conversationId, false);
                io.to(conversationId).emit(constants_1.SOCKET_EVENTS.BOT_ERROR, {
                    conversationId,
                    message: err.message,
                });
                logger_1.default.error("Error in chatbot gateway: " + err.message);
            });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Unexpected error during bot stream";
            logger_1.default.error(`handleBotMessage failed:`, msg);
            socket.emit(constants_1.SOCKET_EVENTS.BOT_ERROR, { message: msg });
        }
    }
    emitTyping(io, conversationId, isTyping) {
        if (!conversationId)
            return;
        io.to(conversationId).emit(constants_1.SOCKET_EVENTS.BOT_TYPING, {
            conversationId,
            userId: constants_1.BOT_USER_ID,
            username: constants_1.BOT_USER_NAME,
            isTyping,
        });
    }
}
exports.ChatBotGateway = ChatBotGateway;
