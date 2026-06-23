"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const aiMessageSchema = new mongoose_1.Schema({
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50000, "Message cannot be longer than 50000 characters"],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: true });
const aiConversationSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
    },
    messages: {
        type: [aiMessageSchema],
        default: [],
    },
}, { timestamps: true });
aiConversationSchema.pre("save", function () {
    if (this.messages.length > 200) {
        this.messages = this.messages.slice(-200);
    }
});
const AIConversation = (0, mongoose_1.model)("AIConversation", aiConversationSchema);
exports.default = AIConversation;
