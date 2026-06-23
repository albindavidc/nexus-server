"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const constants_1 = require("../../shared/constants");
const groupMemberSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    role: {
        type: String,
        enum: Object.values(constants_1.GROUP_ROLES),
        default: constants_1.GROUP_ROLES.MEMBER,
    },
    joinedAt: { type: Date, default: Date.now },
    addedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { _id: true });
const conversationSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: Object.values(constants_1.CONVERSATION_TYPE),
        required: true,
        index: true,
    },
    name: {
        type: String,
        trim: true,
        maxlength: [80, "Name cannot exceed 80 characters"],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, "Description cannot exceed 200 characters"],
    },
    avatar: { type: String, default: "" },
    theme: { type: String, default: "#1e1e1e" },
    members: { type: [groupMemberSchema], default: [] },
    participants: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    creator: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    lastMessage: { type: mongoose_1.Schema.Types.ObjectId, ref: "Message", default: null },
    isActive: { type: Boolean, default: true, index: true },
    pins: { type: [mongoose_1.Schema.Types.ObjectId], ref: "Message", default: [] },
    isFavorite: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
conversationSchema.index({ "members.user": 1 });
conversationSchema.index({ participants: 1, isDeleted: 1 });
conversationSchema.index({ type: 1, createdAt: -1 }); // ← critical for type-filtered queries
conversationSchema.index({ updatedAt: 1 });
conversationSchema.virtual("membersCount").get(function () {
    if (this.type === constants_1.CONVERSATION_TYPE.GROUP)
        return this.members?.length ?? 0;
    return this.participants?.length ?? 0;
});
// Single model, single collection "conversations"
const Conversation = (0, mongoose_1.model)("Conversation", conversationSchema, "conversations");
exports.default = Conversation;
