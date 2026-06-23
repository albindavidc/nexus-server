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
const tsyringe_1 = require("tsyringe");
const mongoose_1 = require("mongoose");
const auth_model_1 = __importDefault(require("../auth/auth.model"));
const AppError_1 = __importDefault(require("../../shared/errors/AppError"));
const tokens_1 = require("../../shared/di/tokens");
const index_1 = require("../../shared/constants/index");
const events_1 = __importDefault(require("events"));
let ChatService = class ChatService {
    _chatRepo;
    eventEmitter;
    constructor(_chatRepo, eventEmitter) {
        this._chatRepo = _chatRepo;
        this.eventEmitter = eventEmitter;
    }
    async getOrCreateDirectConversation(requesterId, targetUserId) {
        if (requesterId === targetUserId) {
            throw new AppError_1.default("You can't start a conversation with yourself.", 400);
        }
        const targetUser = await auth_model_1.default.findById(targetUserId).select("_id username");
        if (!targetUser)
            throw new AppError_1.default("User not found.", 404);
        let conversation = await this._chatRepo.findDirectConversation(requesterId, targetUserId);
        if (!conversation) {
            conversation = await this._chatRepo.createConversation({
                type: index_1.CONVERSATION_TYPE.DIRECT,
                participants: [requesterId, targetUserId],
            });
            conversation = await this._chatRepo.findConversationById(String(conversation._id), requesterId);
        }
        return conversation;
    }
    async createGroupConversation(creatorId, { name, participantIds }) {
        if (!name?.trim()) {
            throw new AppError_1.default("Group name is required.", 400);
        }
        const uniqueIds = [...new Set([creatorId, ...participantIds.map(String)])];
        if (uniqueIds.length < 2) {
            throw new AppError_1.default("A group must have at least 2 participants.", 400);
        }
        const users = await auth_model_1.default.find({ _id: { $in: uniqueIds } }).select("_id");
        if (users.length !== uniqueIds.length) {
            throw new AppError_1.default("One or more participants not found.", 404);
        }
        const members = uniqueIds.map((id) => ({
            user: new mongoose_1.Types.ObjectId(id),
            role: id === creatorId ? index_1.GROUP_ROLES.ADMIN : index_1.GROUP_ROLES.MEMBER,
            joinedAt: new Date(),
        }));
        const conversation = await this._chatRepo.createConversation({
            type: index_1.CONVERSATION_TYPE.GROUP,
            name: name.trim(),
            participants: uniqueIds.map((id) => new mongoose_1.Types.ObjectId(id)),
            members,
            creator: new mongoose_1.Types.ObjectId(creatorId),
        });
        return this._chatRepo.findConversationById(String(conversation._id), creatorId);
    }
    async getMyConversations(userId) {
        return this._chatRepo.findConversationsByUser(userId);
    }
    async getConversationById(conversationId, userId) {
        const conversation = await this._chatRepo.findConversationById(conversationId, userId);
        if (!conversation)
            throw new AppError_1.default("Conversation not found.", 404);
        return conversation;
    }
    async sendMessage(senderId, conversationId, { content, type = index_1.MESSAGE_TYPE.TEXT, replyTo, mediaUrl }) {
        const conversation = await this._chatRepo.findConversationById(conversationId, senderId);
        if (!conversation)
            throw new AppError_1.default("Conversation not found or access denied.", 404);
        if (type === index_1.MESSAGE_TYPE.TEXT && !content?.trim()) {
            throw new AppError_1.default("Message content cannot be empty.", 400);
        }
        const message = await this._chatRepo.createMessage({
            conversation: conversationId,
            sender: senderId,
            type,
            content: content?.trim(),
            mediaUrl: mediaUrl ?? null,
            replyTo: replyTo ?? null,
        });
        const recipientIds = conversation.participants
            .map((p) => p instanceof mongoose_1.Types.ObjectId ? p.toString() : p._id.toString())
            .filter((id) => id !== senderId);
        this.eventEmitter.emit("message.sent", { message, recipientIds });
        await this._chatRepo.updateLastMessage(conversationId, String(message._id));
        return message;
    }
    async getMessages(conversationId, userId, options) {
        const conversation = await this._chatRepo.findConversationById(conversationId, userId);
        if (!conversation)
            throw new AppError_1.default("Conversation not found or access denied.", 404);
        const messages = await this._chatRepo.findMessages(conversationId, options);
        return messages.reverse();
    }
    async markAsRead(conversationId, userId) {
        const conversation = await this._chatRepo.findConversationById(conversationId, userId);
        if (!conversation)
            throw new AppError_1.default("Conversation not found.", 404);
        await this._chatRepo.markConversationRead(conversationId, userId);
    }
    async deleteMessage(messageId, userId) {
        const message = await this._chatRepo.findMessageById(messageId);
        if (!message)
            throw new AppError_1.default("Message not found.", 404);
        if (message.sender._id.toString() !== userId) {
            throw new AppError_1.default("You can only delete your own messages.", 403);
        }
        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();
        return message;
    }
    async clearConversation(conversationId, userId) {
        const conversation = await this._chatRepo.findConversationById(conversationId, userId);
        if (!conversation)
            throw new AppError_1.default("Conversation not found or access denied.", 404);
        await this._chatRepo.clearMessages(conversationId);
    }
    async searchMessagesInConversation(conversationId, userId, query) {
        const conversation = await this._chatRepo.findConversationById(conversationId, userId);
        if (!conversation)
            throw new AppError_1.default("Conversation not found or access denied.", 404);
        return this._chatRepo.searchMessagesInConversation(conversationId, query);
    }
};
ChatService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.ChatRepository)),
    __param(1, (0, tsyringe_1.inject)(tokens_1.TOKENS.EventEmitter)),
    __metadata("design:paramtypes", [Object, events_1.default])
], ChatService);
exports.default = ChatService;
