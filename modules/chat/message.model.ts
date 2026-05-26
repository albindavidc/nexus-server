import mongoose, { Document } from "mongoose";
import { MESSAGE_TYPE } from "../../shared/constants/index";

export interface IMessage extends Document {
  conversation?: mongoose.Types.ObjectId | null;
  groupRef?: mongoose.Types.ObjectId | null;
  type: string;
  sender: mongoose.Types.ObjectId;
  content: string;
  mediaURL?: string;
  replyTo?: mongoose.Types.ObjectId;
  readBy: { user: mongoose.Types.ObjectId; readAt: Date }[];
  deliveredTo: { user: mongoose.Types.ObjectId; deliveredAt: Date }[];
  isDeleted: boolean;
  deletedAt?: Date;
}

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: false,
      default: null,
      index: true,
    },
    groupRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(MESSAGE_TYPE),
      default: MESSAGE_TYPE.TEXT,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
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
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
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
          type: mongoose.Schema.Types.ObjectId,
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
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ groupRef: 1, createdAt: -1 });

const Message = mongoose.model<IMessage>("Message", messageSchema);

export default Message;
