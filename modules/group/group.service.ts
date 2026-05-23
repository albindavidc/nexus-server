import { inject, injectable } from "tsyringe";
import {
  IGroupService,
  CreateGroupDto,
  UpdateGroupDto,
} from "../../shared/interfaces/IGroupService";
import { IGroupRepository } from "../../shared/interfaces/IGroupRepository";
import { TOKENS } from "../../shared/di/tokens";
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

    if (!name.trim()) throw new AppError("Group name is required", 400);

    const uniqueIds = Array.from(
      new Set([...participantIds, creatorId.toString()]),
    );
    if (uniqueIds.length < 2)
      throw new AppError("Group must have at least 2 participants", 400);

    const foundUsers = await User.find({ _id: { $in: uniqueIds } });
    if (foundUsers.length < 2)
      throw new AppError("At least two users must exist in the group", 400);

    const members: IGroupMember[] = uniqueIds.map((id, index) => ({
      user: new Types.ObjectId(id),
      role:
        id === creatorId.toString()
          ? GROUP_ROLES.OWNER
          : index === 0
            ? GROUP_ROLES.ADMIN
            : GROUP_ROLES.MEMBER,
      joinedAt: new Date(),
      addedBy:
        id === creatorId.toString() ? undefined : new Types.ObjectId(creatorId),
    }));

    return this.groupRepository.create({
      type: CONVERSATION_TYPE.GROUP,
      name: dto.name,
      description: dto.description,
      avatar: dto.avatarUrl,
      members,
      isActive: true,
    });
  }

  async getGroup(
    groupId: string,
    requesterId: Types.ObjectId,
  ): Promise<IConversationDocument> {
    const group = await this.groupRepository.findByIdAsParticipant(
      groupId,
      requesterId.toString(),
    );
    if (!group) throw new AppError("Group not found", 404);
    return group;
  }

  async getMyGroups(userId: Types.ObjectId): Promise<IConversationDocument[]> {
    return this.groupRepository.findAllByParticipants(userId.toString());
  }

  async updateGroup(
    groupId: string,
    requesterId: Types.ObjectId,
    dto: UpdateGroupDto,
  ): Promise<IConversationDocument> {
    await this._assertAdminOrOwner(groupId, requesterId);

    const updateData: Partial<IConversationDocument> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.avatarUrl !== undefined) updateData.avatar = dto.avatarUrl;

    const updatedGroup = await this.groupRepository.updateById(
      groupId,
      updateData,
    );
    if (!updatedGroup) throw new AppError("Failed to update group", 500);

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
    userIds: string[],
  ): Promise<IConversationDocument> {
    await this._assertAdminOrOwner(groupId, requesterId);

    const users = await User.find({ _id: { $in: userIds } }).select("_id");
    if (users.length !== userIds.length)
      throw new AppError("One or more users were not found", 404);

    const existingChecks = await Promise.all(
      userIds.map((id) =>
        this.groupRepository.isMember(groupId, new Types.ObjectId(id)),
      ),
    );
    if (existingChecks.some(Boolean))
      throw new AppError("One or more users are already in the group", 400);

    const newMembers: IGroupMember[] = userIds.map((id) => ({
      user: new Types.ObjectId(id),
      role: GROUP_ROLES.MEMBER,
      joinedAt: new Date(),
      addedBy: requesterId,
    }));

    const updatedGroup = await this.groupRepository.addMembers(
      groupId,
      newMembers,
    );
    if (!updatedGroup) throw new AppError("Group not found", 404);

    return updatedGroup;
  }

  async removeMember(
    groupId: string,
    requesterId: Types.ObjectId,
    targetUserId: string,
  ): Promise<IConversationDocument> {
    const targetObjectId = new Types.ObjectId(targetUserId);
    const isSelf = targetObjectId.equals(requesterId);

    if (isSelf) {
      await this._assertAdminOrOwner(groupId, requesterId);
    } else {
      await this._assertOwner(groupId, requesterId);
    }

    const targetMember = await this.groupRepository.getMember(
      groupId,
      targetObjectId,
    );
    if (!targetMember) throw new AppError("Member not found", 404);
    if (targetMember.role === GROUP_ROLES.OWNER)
      throw new AppError("Owner cannot be removed", 400);

    const updatedGroup = await this.groupRepository.removeMember(
      groupId,
      targetObjectId,
    );
    if (!updatedGroup) throw new AppError("Failed to remove member", 500);

    return updatedGroup;
  }

  async leaveGroup(
    groupId: string,
    requesterId: Types.ObjectId,
  ): Promise<void> {
    const member = await this.groupRepository.getMember(groupId, requesterId);
    if (!member) throw new AppError("You are not a member of this group", 404);
    if (member.role === GROUP_ROLES.OWNER)
      throw new AppError(
        "Owner cannot leave the group — transfer ownership first",
        400,
      );

    await this.groupRepository.removeMember(groupId, requesterId);
  }

  async promoteMember(
    groupId: string,
    requesterId: Types.ObjectId,
    targetUserId: string,
  ): Promise<IConversationDocument> {
    await this._assertAdminOrOwner(groupId, requesterId);

    const targetObjectId = new Types.ObjectId(targetUserId);
    const targetMember = await this.groupRepository.getMember(
      groupId,
      targetObjectId,
    );

    if (!targetMember) throw new AppError("Member not found", 404);
    if (targetMember.role === GROUP_ROLES.OWNER)
      throw new AppError("Owner cannot be promoted", 400);
    if (targetMember.role === GROUP_ROLES.ADMIN)
      throw new AppError("Member is already an admin", 400);

    const updatedGroup = await this.groupRepository.updateMemberRole(
      groupId,
      targetObjectId,
      GROUP_ROLES.ADMIN,
    );
    if (!updatedGroup) throw new AppError("Failed to promote member", 500);

    return updatedGroup;
  }

  async demoteMember(
    groupId: string,
    requesterId: Types.ObjectId,
    targetUserId: string,
  ): Promise<IConversationDocument> {
    await this._assertOwner(groupId, requesterId);

    const targetObjectId = new Types.ObjectId(targetUserId);
    const targetMember = await this.groupRepository.getMember(
      groupId,
      targetObjectId,
    );

    if (!targetMember) throw new AppError("Member not found", 404);
    if (targetMember.role !== GROUP_ROLES.ADMIN)
      throw new AppError("Member is not an admin", 400);

    const updatedGroup = await this.groupRepository.updateMemberRole(
      groupId,
      targetObjectId,
      GROUP_ROLES.MEMBER,
    );
    if (!updatedGroup) throw new AppError("Failed to demote member", 500);

    return updatedGroup;
  }

  async transferOwnership(
    groupId: string,
    currentOwnerId: Types.ObjectId,
    newOwnerId: string,
  ): Promise<IConversationDocument> {
    await this._assertOwner(groupId, currentOwnerId);

    const newOwnerObjectId = new Types.ObjectId(newOwnerId);
    const newOwnerMember = await this.groupRepository.getMember(
      groupId,
      newOwnerObjectId,
    );
    if (!newOwnerMember)
      throw new AppError("New owner is not a member of this group", 404);

    await this.groupRepository.updateMemberRole(
      groupId,
      currentOwnerId,
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
    const member = await this.groupRepository.getMember(groupId, userId);
    if (!member || member.role !== GROUP_ROLES.OWNER)
      throw new AppError("Only the group owner can perform this action", 403);
    return member;
  }

  private async _assertAdminOrOwner(groupId: string, userId: Types.ObjectId) {
    const member = await this.groupRepository.getMember(groupId, userId);
    if (
      !member ||
      (member.role !== GROUP_ROLES.ADMIN && member.role !== GROUP_ROLES.OWNER)
    )
      throw new AppError(
        "Only admins or the owner can perform this action",
        403,
      );
    return member;
  }
}
