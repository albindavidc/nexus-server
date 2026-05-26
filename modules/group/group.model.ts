import { model, Schema } from "mongoose";
import { GROUP_ROLES, GROUP_PRIVACY } from "../../shared/constants";
import { IGroup, IGroupMember } from "../../shared/types/group.types";

const groupMemberSchema = new Schema<IGroupMember>(
  {
    user: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    role: {
      type:    String,
      enum:    Object.values(GROUP_ROLES),
      default: GROUP_ROLES.MEMBER,
    },
    joinedAt: {
      type:    Date,
      default: Date.now,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref:  "User",
    },
  },
  { _id: true }
);

const groupSchema = new Schema<IGroup>(
  {
    name: {
      type:      String,
      required:  [true, "Group name is required"],
      trim:      true,
      maxlength: [80, "Group name cannot exceed 80 characters"],
    },
    description: {
      type:      String,
      trim:      true,
      maxlength: [200, "Description cannot exceed 200 characters"],
      default:   "",
    },
    avatar: {
      type:    String,
      default: "",
    },
    privacy: {
      type:    String,
      enum:    Object.values(GROUP_PRIVACY),
      default: GROUP_PRIVACY.PUBLIC,
    },
    members: {
      type:     [groupMemberSchema],
      required: true,
      default:  [],
    },
    lastMessage: {
      type:    Schema.Types.ObjectId,
      ref:     "Message",
      default: null,
    },
    isDeleted: {
      type:    Boolean,
      default: false,
      index:   true,
    },
    deletedAt: {
      type:    Date,
      default: null,
    },
    theme: {
      type:    String,
      default: "#1e1e1e",
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref:  "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
    collection: "groups",
  }
);

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
    .filter((m) => m.role === GROUP_ROLES.ADMIN)
    .map((m) => m.user);
});

const Group = model<IGroup>("Group", groupSchema, "groups");

export default Group;
