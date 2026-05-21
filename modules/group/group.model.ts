import { model, Schema } from "mongoose";
import { CONVERSATION_TYPE, GROUP_ROLES } from "../../shared/constants";
import {
  IConversation,
  IConversationDocument,
  IGroupMember,
} from "../../shared/types/group.types";

const groupMemberSchema = new Schema<IGroupMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(GROUP_ROLES),
      default: GROUP_ROLES.MEMBER,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: true },
);

const conversationSchema = new Schema<IConversation>(
  {
    type: {
      type: String,
      enum: Object.values(CONVERSATION_TYPE),
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: [80, "Name cannot be longer than 80 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot be longer than 200 characters"],
    },
    avatar: {
      type: String,
      default: "",
    },

    members: {
      type: [groupMemberSchema],
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

conversationSchema.index({ "members.user": 1 });
conversationSchema.index({ type: 1, createdAt: -1 });
conversationSchema.index({ updatedAt: 1 });

conversationSchema.virtual("membersCount").get(function (
  this: IConversationDocument,
) {
  return this.members?.length ?? 0;
});

const GroupConversation = model<IConversation>(
  "Conversation",
  conversationSchema,
);

export default GroupConversation;
