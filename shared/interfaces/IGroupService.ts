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
    creatorId: string,
    data: ICreateGroupDto,
  ): Promise<IConversationDocument>;
  getGroupById(groupId: string, userId: string): Promise<IConversationDocument>;
  getMyGroups(userId: string): Promise<IConversationDocument[]>;
  updateGroup(
    groupId: string,
    userId: string,
    data: IUpdateGroupDto,
  ): Promise<IConversationDocument>;
  deleteGroup(groupId: string, userId: string): Promise<void>;

  addMembers(
    groupId: string,
    requesterId: string,
    userIds: string[],
  ): Promise<IConversationDocument>;
  removeMembers(
    groupId: string,
    requesterId: string,
    userIds: string[],
  ): Promise<IConversationDocument>;
  leaveGroup(groupId: string, userId: string): Promise<void>;

  promoteMember(
    groupId: string,
    requesterId: string,
    userId: string,
  ): Promise<IConversationDocument>;
  demoteMember(
    groupId: string,
    requesterId: string,
    userId: string,
  ): Promise<IConversationDocument>;
  transferOwner(
    groupId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<IConversationDocument>;
}
