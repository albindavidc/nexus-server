"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tsyringe_1 = require("tsyringe");
const conversation_model_1 = __importDefault(require("./conversation.model"));
const message_model_1 = __importDefault(require("./message.model"));
const group_model_1 = __importDefault(require("../group/group.model"));
const index_1 = require("../../shared/constants/index");
let ChatRepository = class ChatRepository {
    findDirectConversation(userAId, userBId) {
        return conversation_model_1.default.findOne({
            type: index_1.CONVERSATION_TYPE.DIRECT,
            participants: { $all: [userAId, userBId], $size: 2 },
            isDeleted: false,
        })
            .populate("participants", "username avatar status lastSeen")
            .populate({
            path: "lastMessage",
            populate: { path: "sender", select: "username avatar" },
        });
    }
    createConversation(data) {
        return conversation_model_1.default.create(data);
    }
    async findConversationById(conversationId, userId) {
        let convo = await conversation_model_1.default.findOne({
            _id: conversationId,
            $or: [
                { type: index_1.CONVERSATION_TYPE.GROUP, "members.user": userId },
                {
                    type: { $in: [index_1.CONVERSATION_TYPE.DIRECT, index_1.CONVERSATION_TYPE.AI] },
                    participants: userId,
                },
            ],
            isDeleted: false,
        })
            .populate("participants", "username avatar status lastSeen")
            .populate("members.user", "username avatar status lastSeen")
            .populate("creator", "username avatar status lastSeen")
            .populate({
            path: "lastMessage",
            populate: { path: "sender", select: "username avatar" },
        });
        if (convo)
            return convo;
        // Fallback: check Group model if it was refactored into a separate collection
        try {
            convo = (await group_model_1.default.findOne({
                _id: conversationId,
                "members.user": userId,
                isDeleted: false,
            })
                .populate("members.user", "username avatar status lastSeen")
                .populate("creator", "username avatar status lastSeen")
                .populate({
                path: "lastMessage",
                populate: { path: "sender", select: "username avatar" },
            }));
        }
        catch {
            // Group model might not exist or failed to load
        }
        return convo;
    }
    findConversationsByUser(userId) {
        return conversation_model_1.default.find({
            type: { $in: [index_1.CONVERSATION_TYPE.DIRECT, index_1.CONVERSATION_TYPE.AI] },
            participants: userId,
            isDeleted: false,
        })
            .populate("participants", "username avatar status lastSeen")
            .populate("creator", "username avatar status lastSeen")
            .populate({
            path: "lastMessage",
            populate: { path: "sender", select: "username avatar" },
        })
            .sort({ updatedAt: -1 });
    }
    updateLastMessage(conversationId, messageId) {
        return conversation_model_1.default.findByIdAndUpdate(conversationId, { lastMessage: messageId, updatedAt: new Date() }, { new: true });
    }
    addParticipant(conversationId, userId) {
        return conversation_model_1.default.findByIdAndUpdate(conversationId, { $addToSet: { participants: userId } }, { new: true });
    }
    removeParticipant(conversationId, userId) {
        return conversation_model_1.default.findByIdAndUpdate(conversationId, { $pull: { participants: userId } }, { new: true });
    }
    async createMessage(data) {
        const message = await message_model_1.default.create(data);
        return message.populate([
            { path: "sender", select: "username avatar" },
            { path: "replyTo", populate: { path: "sender", select: "username" } },
        ]);
    }
    findMessages(conversationId, { before, limit = 20 } = {}) {
        const query = {
            conversation: conversationId,
            isDeleted: false,
        };
        if (before)
            query.createdAt = { $lt: new Date(before) };
        return message_model_1.default.find(query)
            .populate("sender", "username avatar")
            .populate({
            path: "replyTo",
            populate: { path: "sender", select: "username" },
        })
            .sort({ createdAt: -1 })
            .limit(Math.min(limit, 100));
    }
    findMessageById(messageId) {
        return message_model_1.default.findById(messageId).populate("sender", "username avatar");
    }
    markDelivered(messageId, userId) {
        return message_model_1.default.findByIdAndUpdate(messageId, { $addToSet: { deliveredTo: { user: userId } } }, { new: true });
    }
    markConversationRead(conversationId, userId) {
        return message_model_1.default.updateMany({
            conversation: conversationId,
            "readBy.user": { $ne: userId },
            sender: { $ne: userId },
        }, { $addToSet: { readBy: { user: userId } } });
    }
    countUnread(conversationId, userId) {
        return message_model_1.default.countDocuments({
            conversation: conversationId,
            "readBy.user": { $ne: userId },
            sender: { $ne: userId },
            isDeleted: false,
        });
    }
    async clearMessages(conversationId) {
        await message_model_1.default.updateMany({ conversation: conversationId }, { $set: { isDeleted: true, deletedAt: new Date() } });
    }
    async searchMessagesInConversation(conversationId, query) {
        return message_model_1.default.find({
            $or: [{ conversation: conversationId }, { groupRef: conversationId }],
            content: { $regex: query, $options: "i" },
        })
            .sort({ createdAt: 1 })
            .populate("sender", "username")
            .limit(10);
    }
};
ChatRepository = __decorate([
    (0, tsyringe_1.injectable)()
], ChatRepository);
exports.default = ChatRepository;
