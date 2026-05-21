import { inject, injectable } from "tsyringe";
import {
  IGroupService,
  IUpdateGroupDto,
} from "../../shared/interfaces/IGroupService";
import { IGroupRepository } from "../../shared/interfaces/IGroupRepository";
import { TOKENS } from "../../shared/di/tokens";
import { CreateGroupDto } from "../../shared/interfaces/IChatService";
import {
  IConversationDocument,
  IGroupMember,
} from "../../shared/types/group.types";
import User from "../auth/auth.model";
import { CONVERSATION_TYPE, GROUP_ROLES } from "../../shared/constants";
import { Types } from "mongoose";
import AppError from "../../shared/errors/AppError";

@injectable()
export class GroupService implements IGroupService {
  constructor(
    @inject(TOKENS.GroupRepository)
    private readonly groupRepository: IGroupRepository,
  ) {}
  async createGroup(
    creatorId: Types.ObjectId,
    dto: CreateGroupDto,
  ): Promise<IConversationDocument> {
    const { name, participantIds } = dto;

    if (!name.trim()) throw new Error("Group name is required");

    const uniqueIds = Array.from(new Set([...participantIds, creatorId]));
    if (uniqueIds.length < 2)
      throw new Error("Group must have at least 2 participants");

    const foundUser = await User.find({ _id: { $in: uniqueIds } });
    if (foundUser.length < 2)
      throw new Error("At least two users must exist in the group");

    const member: IGroupMember[] = uniqueIds.map((id, index) => ({
      user: new Types.ObjectId(id),
      role: index === 0 ? GROUP_ROLES.ADMIN : GROUP_ROLES.MEMBER,
      joinedAt: new Date(),
      addedBy:
        id === creatorId.toString() ? undefined : new Types.ObjectId(creatorId),
    }));

    return await this.groupRepository.create({
      ...dto,
      type: CONVERSATION_TYPE.GROUP,
      members: member,
      isActive: true,
    });
  }

  async getGroup(
    groupId: string,
    userId: Types.ObjectId,
  ): Promise<IConversationDocument> {
    const group = await this.groupRepository.findByIdAsParticipant(
      groupId,
      userId.toString(),
    );
    if (!group) {
      throw new Error("Group not found");
    }

    return group;
  }

  async getMyGroups(userId: Types.ObjectId): Promise<IConversationDocument[]> {
    return this.groupRepository.findAllByParticipants(userId.toString());
  }

  async updateGroup(
    groupId: string,
    userId: Types.ObjectId,
    dto: IUpdateGroupDto,
  ): Promise<IConversationDocument> {
    await this._assertAdminOrOwner(groupId, userId);

    const updateData: Partial<IConversationDocument> = {};
    if (dto.name?.trim() === undefined) {
      throw new Error("Group name is required");
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.avatarUrl !== undefined) {
      updateData.avatar = dto.avatarUrl;
    }

    const updatedGroup = await this.groupRepository.updateById(
      groupId,
      updateData,
    );
    if (!updatedGroup) {
      throw new Error("Failed to update group");
    }

    return updatedGroup;
  }

  async deleteGroup(
    groupId: string,
    requesterId: Types.ObjectId,
  ): Promise<void> {
    await this._assertOwner(groupId, requesterId);
    await this.groupRepository.deleteById(groupId);
  }

  async addMembers(
    groupId: string,
    requesterId: Types.ObjectId,
    userIds: Types.ObjectId[],
  ): Promise<IConversationDocument> {
    await this._assertAdminOrOwner(groupId, requesterId);

    const users = await User.find({ _id: { $in: userIds } }).select("_id");
    if (users.length !== userIds.length) {
      throw new AppError("Not all users are found", 404);
    }

    const existingGroupMember = await Promise.all(
      userIds.map((id) => this.groupRepository.isMember(groupId, id)),
    );

    if (existingGroupMember.some((isMember) => isMember)) {
      throw new AppError("One or more users are already in the group", 400);
    }

    const newMembers: IGroupMember[] = userIds.map((id) => ({
      user: new Types.ObjectId(id),
      role: GROUP_ROLES.MEMBER,
      joinedAt: new Date(),
      addedBy: new Types.ObjectId(requesterId),
    }));

    const updatedGroup = await this.groupRepository.addMembers(
      groupId,
      newMembers,
    );
    if (!updatedGroup) {
      throw new AppError("Group not found", 404);
    }

    return updatedGroup;
  }

  async removeMembers(
    groupId: string,
    requesterId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<IConversationDocument> {
    const isSelf = userId.equals(requesterId);
    if (isSelf) {
      await this._assertAdminOrOwner(groupId, requesterId);
    } else {
      await this._assertOwner(groupId, requesterId);
    }

    const targetMember = await this.groupRepository.getMember(groupId, userId);
    if (!targetMember) {
      throw new AppError("Member not found", 404);
    }
    if (targetMember.role === GROUP_ROLES.OWNER) {
      throw new AppError("Owner cannot be removed", 400);
    }

    const updatedGroup = await this.groupRepository.removeMember(
      groupId,
      userId,
    );
    if (!updatedGroup) {
      throw new AppError("Failed to remove member", 500);
    }
    return updatedGroup;
  }

  async leaveGroup(groupId: string, userId: Types.ObjectId) {
    const member = await this.groupRepository.getMember(groupId, userId);
    if (!member) throw new AppError("Member not found", 404);
    if (member.role === GROUP_ROLES.OWNER) {
      throw new AppError(
        "Owner cannot leave the group, promote someone else to owner first",
        400,
      );
    }
    await this.groupRepository.removeMember(groupId, userId);
  }

  async promoteMember(
    groupId: string,
    requesterId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<IConversationDocument> {
    await this._assertAdminOrOwner(groupId, requesterId);

    const targetUserId = new Types.ObjectId(userId);
    const targetMember = await this.groupRepository.getMember(
      groupId,
      targetUserId,
    );

    if (!targetMember) throw new AppError("Member not found", 404);
    if (targetMember.role === GROUP_ROLES.OWNER)
      throw new AppError("Owner cannot be promoted", 400);
    if (targetMember.role === GROUP_ROLES.ADMIN)
      throw new AppError("Member is already an admin", 400);

    const updatedGroup = await this.groupRepository.updateMemberRole(
      groupId,
      userId,
      GROUP_ROLES.ADMIN,
    );
    if (!updatedGroup) throw new AppError("Failed to promote member", 500);

    return updatedGroup;
  }

  async demoteMember(
    groupId: string,
    requesterId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<IConversationDocument> {
    await this._assertOwner(groupId, requesterId);

    const targetUserId = new Types.ObjectId(userId);
    const targetMember = await this.groupRepository.getMember(
      groupId,
      targetUserId,
    );

    if (!targetMember) throw new AppError("Member not found", 404);
    if (targetMember.role !== GROUP_ROLES.ADMIN)
      throw new AppError("Member is not an admin", 400);

    const updatedGroup = await this.groupRepository.updateMemberRole(
      groupId,
      userId,
      GROUP_ROLES.MEMBER,
    );
    if (!updatedGroup) throw new AppError("Failed to demote member", 500);
    return updatedGroup;
  }

  async transferOwnership(
    groupId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<IConversationDocument> {
    await this._assertOwner(groupId, new Types.ObjectId(currentOwnerId));

    const newOwnerObjectId = new Types.ObjectId(newOwnerId);
    const targetMember = await this.groupRepository.getMember(
      groupId,
      newOwnerObjectId,
    );

    if (!targetMember)
      throw new AppError("New owner not found in the existing group", 404);

    await this.groupRepository.updateMemberRole(
      groupId,
      newOwnerObjectId,
      GROUP_ROLES.ADMIN,
    );

    const updatedGroup = await this.groupRepository.updateMemberRole(
      groupId,
      newOwnerObjectId,
      GROUP_ROLES.OWNER,
    );
    if (!updatedGroup) throw new AppError("Failed to transfer ownership", 500);

    return updatedGroup;
  }
  private async _assertOwner(groupId: string, userId: Types.ObjectId) {
    const memeber = await this.groupRepository.getMember(groupId, userId);

    if (!memeber || memeber.role !== GROUP_ROLES.ADMIN) {
      throw new Error("You are not the owner of the group");
    }

    return memeber;
  }

  private async _assertAdminOrOwner(groupId: string, userId: Types.ObjectId) {
    const memeber = await this.groupRepository.getMember(groupId, userId);

    if (
      !memeber ||
      (memeber.role !== GROUP_ROLES.ADMIN && memeber.role !== GROUP_ROLES.OWNER)
    ) {
      throw new Error("You are not authorized to perform this action");
    }

    return memeber;
  }
}
