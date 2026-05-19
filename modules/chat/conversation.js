const mongoose = require("mongoose");
const { CONVERSATION_TYPES } = require("../../../shared/constants");

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(CONVERSATION_TYPES),
      required: true,
    },
    name: {
      type: String,
      trim: true,
      max: [250, "Conversation name cannot be longer than 250 characters"],
    },
    avatar: {
      type: String,
      default: "",
    },
    participants: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      required: true,
    },

    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    pins: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Message",
      default: [],
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, deletedAt: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
