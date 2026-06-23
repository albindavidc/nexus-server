"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = require("../../shared/constants/index");
const messageSchema = new mongoose_1.default.Schema({
    conversation: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Conversation",
        required: false,
        default: null,
        index: true,
    },
    groupRef: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Group",
        default: null,
        index: true,
    },
    type: {
        type: String,
        enum: Object.values(index_1.MESSAGE_TYPE),
        default: index_1.MESSAGE_TYPE.TEXT,
    },
    sender: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    mediaURL: {
        type: String,
        default: null,
    },
    mediaMeta: {
        mimeType: String,
        size: Number,
        filename: String,
    },
    replyTo: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
    },
    readBy: [
        {
            user: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "User",
            },
            readAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    deliveredTo: [
        {
            user: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "User",
            },
            deliveredAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
messageSchema.index({ content: "text" });
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ groupRef: 1, createdAt: -1 });
const Message = mongoose_1.default.model("Message", messageSchema);
exports.default = Message;
