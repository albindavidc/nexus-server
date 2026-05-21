import { Types } from "mongoose";
import { IConversationDocument } from "../types/group.types";

export interface ICreateGroupDto {
  name: string;
  description?: string;
  participantsIds?: string[];
  avatarUrl?: string;
}

export interface IUpdateGroupDto {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface IGroupService {
  createGroup(
    creatorId: Types.ObjectId,
    data: ICreateGroupDto,
  ): Promise<IConversationDocument>;
  getGroup(
    groupId: string,
    userId: Types.ObjectId,
  ): Promise<IConversationDocument>;
  getMyGroups(userId: Types.ObjectId): Promise<IConversationDocument[]>;
  updateGroup(
    groupId: string,
    userId: Types.ObjectId,
    data: IUpdateGroupDto,
  ): Promise<IConversationDocument>;
  deleteGroup(groupId: string, userId: Types.ObjectId): Promise<void>;

  addMembers(
    groupId: string,
    requesterId: Types.ObjectId,
    userIds: Types.ObjectId[],
  ): Promise<IConversationDocument>;
  removeMembers(
    groupId: string,
    requesterId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<IConversationDocument>;
  leaveGroup(groupId: string, userId: Types.ObjectId): Promise<void>;

  promoteMember(
    groupId: string,
    requesterId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<IConversationDocument>;
  demoteMember(
    groupId: string,
    requesterId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<IConversationDocument>;
  transferOwnership(
    groupId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<IConversationDocument>;
}
