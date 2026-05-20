import mongoose, { Document } from "mongoose";
import { CONVERSATION_TYPE } from "../../shared/constants/index";

export interface IConversation extends Document {
  type: string;
  name?: string;
  avatar?: string;
  participants: mongoose.Types.ObjectId[];
  admin?: mongoose.Types.ObjectId;
  lastMessage?: mongoose.Types.ObjectId;
  pins: mongoose.Types.ObjectId[];
  unreadCount: number;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
}

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(CONVERSATION_TYPE),
      required: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: [250, "Conversation name cannot be longer than 250 characters"],
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

const Conversation = mongoose.model<IConversation>("Conversation", conversationSchema);

export default Conversation;
