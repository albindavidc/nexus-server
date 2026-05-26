import { model, Schema } from "mongoose";
import { CONVERSATION_TYPE, GROUP_ROLES } from "../../shared/constants";
import {
  IConversation,
  IConversationDocument,
  IGroupMember,
} from "../../shared/types/group.types";

const groupMemberSchema = new Schema<IGroupMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: Object.values(GROUP_ROLES),
      default: GROUP_ROLES.MEMBER,
    },
    joinedAt: { type: Date, default: Date.now },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
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

    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],

    creator: { type: Schema.Types.ObjectId, ref: "User", default: null },

    lastMessage: { type: Schema.Types.ObjectId, ref: "Message", default: null },
    isActive: { type: Boolean, default: true, index: true },

    pins: { type: [Schema.Types.ObjectId], ref: "Message", default: [] },
    isFavorite: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
conversationSchema.index({ "members.user": 1 });
conversationSchema.index({ participants: 1, isDeleted: 1 });
conversationSchema.index({ type: 1, createdAt: -1 }); // ← critical for type-filtered queries
conversationSchema.index({ updatedAt: 1 });

conversationSchema.virtual("membersCount").get(function (
  this: IConversationDocument,
) {
  if (this.type === CONVERSATION_TYPE.GROUP) return this.members?.length ?? 0;
  return this.participants?.length ?? 0;
});

// Single model, single collection "conversations"
const Conversation = model<IConversation>(
  "Conversation",
  conversationSchema,
  "conversations",
);

export { IConversation, IConversationDocument, IGroupMember };
export default Conversation;
