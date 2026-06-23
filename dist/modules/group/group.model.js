"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const constants_1 = require("../../shared/constants");
const groupMemberSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    role: {
        type: String,
        enum: Object.values(constants_1.GROUP_ROLES),
        default: constants_1.GROUP_ROLES.MEMBER,
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
    addedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
}, { _id: true });
const groupSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, "Group name is required"],
        trim: true,
        maxlength: [80, "Group name cannot exceed 80 characters"],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, "Description cannot exceed 200 characters"],
        default: "",
    },
    avatar: {
        type: String,
        default: "",
    },
    privacy: {
        type: String,
        enum: Object.values(constants_1.GROUP_PRIVACY),
        default: constants_1.GROUP_PRIVACY.PUBLIC,
    },
    members: {
        type: [groupMemberSchema],
        required: true,
        default: [],
    },
    lastMessage: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    theme: {
        type: String,
        default: "#1e1e1e",
    },
    creator: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "groups",
});
// ── Indexes ──────────────────────────────────────────────
groupSchema.index({ "members.user": 1 });
groupSchema.index({ privacy: 1, isDeleted: 1 });
groupSchema.index({ createdAt: -1 });
groupSchema.index({ name: "text", description: "text" });
// ── Virtuals ─────────────────────────────────────────────
groupSchema.virtual("membersCount").get(function () {
    return this.members?.length ?? 0;
});
groupSchema.virtual("adminIds").get(function () {
    return this.members
        .filter((m) => m.role === constants_1.GROUP_ROLES.ADMIN)
        .map((m) => m.user);
});
const Group = (0, mongoose_1.model)("Group", groupSchema, "groups");
exports.default = Group;
