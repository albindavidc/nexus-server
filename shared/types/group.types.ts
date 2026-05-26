import { Types, Document } from "mongoose";
import { ConversationType, GroupRole, MessageType, GroupPrivacy } from "../constants";

// Conversation and Message Documents
export interface IGroupMember {
  user: Types.ObjectId;
  role: GroupRole;
  joinedAt: Date;
  addedBy?: Types.ObjectId;
}

export interface IPopulatedGroupMember extends Omit<IGroupMember, "user"> {
  user: {
    _id: Types.ObjectId;
    id?: string;
    username?: string;
    email?: string;
    avatar?: string;
    status?: string;
    lastSeen?: Date;
  };
}

export interface IConversation {
  type: ConversationType;

  name: string;
  description?: string;
  avatar: string;
  theme?: string;
  members: IGroupMember[];

  participants: Types.ObjectId[];
  admins: Types.ObjectId[];
  owner: Types.ObjectId;
  creator?: Types.ObjectId;
  lastMessage: Types.ObjectId;
  isActive: boolean;

  pins?: Types.ObjectId[];
  isFavorite?: boolean;
  isDeleted?: boolean;
  deletedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}
export interface IConversationDocument extends IConversation, Document {}

export interface IGroup {
  name: string;
  description?: string;
  avatar?: string;
  privacy: GroupPrivacy;
  members: IGroupMember[];
  lastMessage?: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  theme?: string;
  creator?: Types.ObjectId;

  // virtuals
  membersCount?: number;
  adminIds?: Types.ObjectId[];
}
export interface IGroupDocument extends IGroup, Document {}

export interface IDeliveredReceipt {
  userId: Types.ObjectId;
  deliveredAt: Date;
}

export interface IReadReceipt {
  userId: Types.ObjectId;
  readAt: Date;
}

export interface IMessage {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  replyTo?: Types.ObjectId;
  deliveredTo: IDeliveredReceipt[];
  readBy: IReadReceipt[];

  isPinned?: boolean;
  isEdited?: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageDocument extends IMessage, Document {
  softDelete(): Promise<IMessageDocument>;
}

// Request Body DTOs
export interface ICreateGroupBody {
  name: string;
  description?: string;
  participants?: string[];
  avatar?: string;
}

export interface IUpdateGroupBody {
  name?: string;
  description?: string;
  avatar?: string;
}

export interface IAddMemberBody {
  userIds: string[];
}

export interface ITransferMembershipBody {
  newOwnerId: string;
}

// Socket event payloads
export interface IGroupEventPayload {
  groupId: string;
  actorId: string;
  actorUserName: string;
}

export interface IMessageEventPayload extends IGroupEventPayload {
  targetUserId: string;
  targetUserName: string;
}
