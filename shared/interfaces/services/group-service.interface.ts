import { Types } from "mongoose";
import { IConversationDocument } from "../../types/group.types";
import { IMessage } from "../../../modules/chat/message.model";

export interface CreateGroupDto {
  name: string;
  description?: string;
  participantIds: string[];
  avatarUrl?: string;
  theme?: string;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface IGroupService {
  createGroup(
    creatorId: Types.ObjectId,
    dto: CreateGroupDto,
  ): Promise<IConversationDocument>;

  updateGroup(
    groupId: string,
    requesterId: Types.ObjectId,
    dto: UpdateGroupDto,
  ): Promise<IConversationDocument>;

  deleteGroup(groupId: string, requesterId: Types.ObjectId): Promise<void>;

  addMembers(
    groupId: string,
    requesterId: Types.ObjectId,
    userIds: string[],
  ): Promise<IConversationDocument>;

  removeMember(
    groupId: string,
    requesterId: Types.ObjectId,
    targetUserId: string,
  ): Promise<IConversationDocument>;

  leaveGroup(groupId: string, requesterId: Types.ObjectId): Promise<void>;

  promoteMember(
    groupId: string,
    requesterId: Types.ObjectId,
    targetUserId: string,
  ): Promise<IConversationDocument>;

  demoteMember(
    groupId: string,
    requesterId: Types.ObjectId,
    targetUserId: string,
  ): Promise<IConversationDocument>;

  transferOwnership(
    groupId: string,
    currentOwnerId: Types.ObjectId,
    newOwnerId: string,
  ): Promise<IConversationDocument>;

  getGroup(
    groupId: string,
    requesterId: Types.ObjectId,
  ): Promise<IConversationDocument>;

  getMyGroups(userId: Types.ObjectId): Promise<IConversationDocument[]>;
  searchGroups(query: string): Promise<IConversationDocument[]>;
  joinGroup(groupId: string, requesterId: Types.ObjectId): Promise<IConversationDocument>;
  getGroupMessages(groupId: string, userId: string): Promise<IMessage[]>;
  sendGroupMessage(
    groupId: string,
    senderId: string,
    content: string,
  ): Promise<IMessage>;
}
