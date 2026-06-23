"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
exports.initSocket = initSocket;
const tsyringe_1 = require("tsyringe");
const socket_io_1 = require("socket.io");
const group_gateway_1 = require("../group/group.gateway");
const chatbot_gateway_1 = require("../chatbot/chatbot.gateway");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const tokens_1 = require("../../shared/di/tokens");
const index_1 = require("../../shared/constants/index");
const logger_1 = __importDefault(require("../../shared/utils/logger"));
const auth_model_1 = __importDefault(require("../auth/auth.model"));
let ChatGateway = class ChatGateway {
    _chatRepo;
    _chatService;
    _io;
    constructor(_chatRepo, _chatService) {
        this._chatRepo = _chatRepo;
        this._chatService = _chatService;
    }
    initialize(httpServer, clientUrl, expressApp) {
        this._io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: ["http://localhost:4200", clientUrl].filter(Boolean),
                methods: ["GET", "POST"],
                credentials: true,
            },
            pingInterval: 10_000,
            pingTimeout: 15_000,
        });
        if (expressApp) {
            expressApp.set("io", this._io);
        }
        const authMiddleware = tsyringe_1.container.resolve(auth_middleware_1.AuthMiddleware);
        this._io.use(authMiddleware.authenticateSocket);
        this._io.on(index_1.SOCKET_EVENTS.CONNECT, (socket) => {
            this.handleConnection(socket);
        });
    }
    handleConnection(socket) {
        const userId = socket.userId;
        logger_1.default.debug(`User ${userId} connected`);
        this.onUserConnect(socket, userId);
        socket.join(userId);
        const groupGateway = tsyringe_1.container.resolve(group_gateway_1.GroupGateway);
        groupGateway.registerHandlers(socket, this._io);
        const chatBotGateway = new chatbot_gateway_1.ChatBotGateway();
        chatBotGateway.registerHandlers(socket, this._io);
        socket.on(index_1.SOCKET_EVENTS.JOIN_CONVERSATION, (data) => this.handleJoinConversation(socket, data));
        socket.on(index_1.SOCKET_EVENTS.LEAVE_CONVERSATION, (data) => this.handleLeaveConversation(socket, data));
        socket.on(index_1.SOCKET_EVENTS.GET_MY_CONVERSATIONS, (data, callback) => this.handleGetMyConversations(socket, data, callback));
        socket.on(index_1.SOCKET_EVENTS.GET_CONVERSATION_BY_ID, (data, callback) => this.handleGetConversationById(socket, data, callback));
        socket.on(index_1.SOCKET_EVENTS.START_DIRECT_CONVERSATION, (data, callback) => this.handleStartDirectConversation(socket, data, callback));
        socket.on(index_1.SOCKET_EVENTS.GET_MESSAGES, (data, callback) => this.handleGetMessages(socket, data, callback));
        socket.on(index_1.SOCKET_EVENTS.MARK_CONVERSATION_READ, (data, callback) => this.handleMarkConversationRead(socket, data, callback));
        socket.on(index_1.SOCKET_EVENTS.DELETE_MESSAGE, (data, callback) => this.handleDeleteMessage(socket, data, callback));
        socket.on(index_1.SOCKET_EVENTS.CLEAR_CONVERSATION, (data, callback) => this.handleClearConversation(socket, data, callback));
        socket.on(index_1.SOCKET_EVENTS.SEND_MESSAGE, (data, callback) => this.handleSendMessage(socket, data, callback));
        socket.on(index_1.SOCKET_EVENTS.MESSAGE_READ, (data) => this.handleReadMessageLegacy(socket, data));
        socket.on(index_1.SOCKET_EVENTS.TYPING_START, (data) => this.handleTyping(socket, data, true));
        socket.on(index_1.SOCKET_EVENTS.TYPING_STOP, (data) => this.handleTyping(socket, data, false));
        socket.on(index_1.SOCKET_EVENTS.DISCONNECT, () => this.onUserDisconnect(socket, userId));
    }
    async onUserConnect(socket, userId) {
        try {
            const user = await auth_model_1.default.findByIdAndUpdate(userId, {
                status: index_1.USER_STATUS.ONLINE,
                $addToSet: { socketIds: socket.id },
            });
            if (!user) {
                logger_1.default.warn(`onUserConnect: User ${userId} not found`);
                return;
            }
            await this.broadcastPresence(userId, index_1.USER_STATUS.ONLINE);
        }
        catch (error) {
            logger_1.default.error(`onUserConnect failed for ${userId}:`, error);
        }
    }
    async onUserDisconnect(socket, userId) {
        try {
            logger_1.default.debug(`User ${userId} disconnected`);
            await auth_model_1.default.findByIdAndUpdate(userId, { $pull: { socketIds: socket.id } });
            const updatedUser = await auth_model_1.default.findById(userId).select("socketIds");
            if (updatedUser?.socketIds?.length === 0) {
                await auth_model_1.default.findByIdAndUpdate(userId, {
                    status: index_1.USER_STATUS.OFFLINE,
                    lastSeen: new Date(),
                });
                await this.broadcastPresence(userId, index_1.USER_STATUS.OFFLINE);
            }
        }
        catch (error) {
            logger_1.default.error(`onUserDisconnect failed for ${userId}:`, error);
        }
    }
    async broadcastPresence(userId, status) {
        try {
            const conversations = await this._chatRepo.findConversationsByUser(userId);
            const uniqueParticipants = new Set();
            conversations.forEach((conversation) => {
                conversation.participants.forEach((p) => {
                    const pId = p._id ? p._id.toString() : p.toString();
                    if (pId !== userId) {
                        uniqueParticipants.add(pId);
                    }
                });
            });
            uniqueParticipants.forEach((targetId) => {
                this._io
                    .to(targetId)
                    .emit(status === index_1.USER_STATUS.ONLINE
                    ? index_1.SOCKET_EVENTS.USER_ONLINE
                    : index_1.SOCKET_EVENTS.USER_OFFLINE, { userId });
            });
            logger_1.default.debug(`Broadcasted ${status} presence for user ${userId} to ${uniqueParticipants.size} users`);
        }
        catch (error) {
            logger_1.default.error(`broadcastPresence failed for ${userId}:`, error);
        }
    }
    async handleJoinConversation(socket, { conversationId }) {
        try {
            if (!conversationId)
                return this.emitError(socket, "Conversation ID is required");
            const conversation = await this._chatRepo.findConversationById(conversationId, socket.userId);
            if (!conversation)
                return this.emitError(socket, "Conversation not found");
            socket.join(conversationId);
            logger_1.default.debug(`User ${socket.userId} joined conversation ${conversationId}`);
        }
        catch (error) {
            logger_1.default.error(`handleJoinConversation failed for ${socket.userId}:`, error);
        }
    }
    async handleLeaveConversation(socket, { conversationId }) {
        try {
            if (!conversationId)
                return this.emitError(socket, "Conversation ID is required");
            const conversation = await this._chatRepo.findConversationById(conversationId, socket.userId);
            if (!conversation)
                return this.emitError(socket, "Conversation not found");
            socket.leave(conversationId);
            logger_1.default.debug(`User ${socket.userId} left conversation ${conversationId}`);
        }
        catch (error) {
            logger_1.default.error(`handleLeaveConversation failed for ${socket.userId}:`, error);
        }
    }
    async handleGetMyConversations(socket, data, callback) {
        try {
            const conversations = await this._chatService.getMyConversations(socket.userId);
            if (typeof callback === "function")
                callback({ success: true, data: { conversations } });
        }
        catch (error) {
            logger_1.default.error(`handleGetMyConversations failed:`, error);
            const msg = error instanceof Error
                ? error.message
                : "Failed to fetch conversations";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
        }
    }
    async handleGetConversationById(socket, data, callback) {
        try {
            if (!data?.conversationId)
                throw new Error("Conversation ID is required");
            const conversation = await this._chatService.getConversationById(String(data.conversationId), socket.userId);
            if (typeof callback === "function")
                callback({ success: true, data: { conversation } });
        }
        catch (error) {
            logger_1.default.error(`handleGetConversationById failed:`, error);
            const msg = error instanceof Error ? error.message : "Failed to fetch conversation";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
        }
    }
    async handleStartDirectConversation(socket, data, callback) {
        try {
            if (!data?.userId)
                throw new Error("User ID is required");
            const conversation = await this._chatService.getOrCreateDirectConversation(socket.userId, String(data.userId));
            if (typeof callback === "function")
                callback({ success: true, data: { conversation } });
        }
        catch (error) {
            logger_1.default.error(`handleStartDirectConversation failed:`, error);
            const msg = error instanceof Error ? error.message : "Failed to start conversation";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
        }
    }
    async handleGetMessages(socket, data, callback) {
        try {
            if (!data?.conversationId)
                throw new Error("Conversation ID is required");
            const options = {
                before: data.before,
                limit: data.limit ? parseInt(String(data.limit), 10) : undefined,
            };
            const messages = await this._chatService.getMessages(String(data.conversationId), socket.userId, options);
            if (typeof callback === "function")
                callback({ success: true, data: { messages } });
        }
        catch (error) {
            logger_1.default.error(`handleGetMessages failed:`, error);
            const msg = error instanceof Error ? error.message : "Failed to fetch messages";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
        }
    }
    async handleSendMessage(socket, data, callback) {
        try {
            if (!data?.conversationId)
                throw new Error("Conversation ID is required");
            if (!data?.content)
                throw new Error("Message content is required");
            const message = await this._chatService.sendMessage(socket.userId, data.conversationId, data);
            const conversation = await this._chatService.getConversationById(data.conversationId, socket.userId);
            this.broadcastToConversation(data.conversationId, index_1.SOCKET_EVENTS.NEW_MESSAGE, message);
            if (conversation && conversation.participants) {
                conversation.participants.forEach((p) => {
                    const participantId = ("_id" in p ? p._id : p).toString();
                    if (participantId !== String(socket.userId)) {
                        this.broadcastToConversation(participantId, index_1.SOCKET_EVENTS.NEW_MESSAGE, message);
                    }
                });
            }
            if (typeof callback === "function") {
                callback({ success: true, data: { message } });
                return;
            }
        }
        catch (error) {
            logger_1.default.error(`handleSendMessage failed for ${socket.userId}:`, error);
            const msg = error instanceof Error ? error.message : "Failed to send message";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
            else
                this.emitError(socket, msg);
        }
    }
    async handleMarkConversationRead(socket, data, callback) {
        try {
            if (!data?.conversationId)
                throw new Error("Conversation ID is required");
            await this._chatService.markAsRead(String(data.conversationId), socket.userId);
            if (typeof callback === "function")
                callback({ success: true });
        }
        catch (error) {
            logger_1.default.error(`handleMarkConversationRead failed:`, error);
            const msg = error instanceof Error ? error.message : "Failed to mark as read";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
        }
    }
    async handleDeleteMessage(socket, data, callback) {
        try {
            if (!data?.messageId)
                throw new Error("Message ID is required");
            await this._chatService.deleteMessage(String(data.messageId), socket.userId);
            if (typeof callback === "function")
                callback({ success: true });
        }
        catch (error) {
            logger_1.default.error(`handleDeleteMessage failed:`, error);
            const msg = error instanceof Error ? error.message : "Failed to delete message";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
        }
    }
    async handleClearConversation(socket, data, callback) {
        try {
            if (!data?.conversationId)
                throw new Error("Conversation ID is required");
            await this._chatService.clearConversation(String(data.conversationId), socket.userId);
            if (typeof callback === "function")
                callback({ success: true });
        }
        catch (error) {
            logger_1.default.error(`handleClearConversation failed:`, error);
            const msg = error instanceof Error ? error.message : "Failed to clear conversation";
            if (typeof callback === "function")
                callback({ success: false, error: msg });
        }
    }
    async handleReadMessageLegacy(socket, { conversationId }) {
        try {
            if (!conversationId)
                return this.emitError(socket, "Conversation ID is required");
            const result = await this._chatRepo.markConversationRead(conversationId, socket.userId);
            this._io.to(conversationId).emit(index_1.SOCKET_EVENTS.MESSAGE_READ, result);
        }
        catch (error) {
            logger_1.default.error(`handleReadMessageLegacy failed for ${socket.userId}:`, error);
            this.emitError(socket, "Failed to mark as read");
        }
    }
    handleTyping(socket, { conversationId }, isTyping) {
        if (!conversationId)
            return;
        socket
            .to(conversationId)
            .emit(isTyping ? index_1.SOCKET_EVENTS.TYPING_START : index_1.SOCKET_EVENTS.TYPING_STOP, {
            conversationId,
            userId: socket.userId,
            isTyping,
        });
    }
    emitError(socket, message) {
        socket.emit(index_1.SOCKET_EVENTS.SOCKET_ERROR, { message });
        logger_1.default.debug(`Error emitted to ${socket.userId}: ${message}`);
    }
    broadcastToConversation(conversationId, event, data) {
        if (this._io) {
            this._io.to(conversationId).emit(event, data);
        }
    }
};
exports.ChatGateway = ChatGateway;
exports.ChatGateway = ChatGateway = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.ChatRepository)),
    __param(1, (0, tsyringe_1.inject)(tokens_1.TOKENS.ChatService)),
    __metadata("design:paramtypes", [Object, Object])
], ChatGateway);
function initSocket(httpServer, clientUrl, expressApp) {
    const gateway = tsyringe_1.container.resolve(ChatGateway);
    gateway.initialize(httpServer, clientUrl, expressApp);
}
