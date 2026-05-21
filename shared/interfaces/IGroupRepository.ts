import { Types } from "mongoose";
import { GroupRole } from "../constants";
import { IConversationDocument, IGroupMember } from "../types/group.types";

export interface IGroupRepository {
  create(data: Partial<IConversationDocument>): Promise<IConversationDocument>;
  findById(groupId: string): Promise<IConversationDocument | null>;
  findByIdAsParticipant(
    id: string,
    userId: string,
  ): Promise<IConversationDocument | null>;
  findAllByParticipants(userId: string): Promise<IConversationDocument[]>;
  updateById(
    id: string,
    data: Partial<IConversationDocument>,
  ): Promise<IConversationDocument | null>;
  deleteById(id: string): Promise<void>;

  addMembers(
    groupId: string,
    members: IGroupMember[],
  ): Promise<IConversationDocument | null>;
  removeMember(
    groupId: string,
    userId: Types.ObjectId,
  ): Promise<IConversationDocument | null>;
  updateMemberRole(
    groupId: string,
    userId: Types.ObjectId,
    role: GroupRole,
  ): Promise<IConversationDocument | null>;
  isMember(groupId: string, userId: Types.ObjectId): Promise<boolean>;
  getMember(
    groupId: string,
    userId: Types.ObjectId,
  ): Promise<IGroupMember | null>;
}
