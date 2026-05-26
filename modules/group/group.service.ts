import { inject, injectable } from "tsyringe";
import {
  IGroupService,
  CreateGroupDto,
  UpdateGroupDto,
} from "../../shared/interfaces/services/group-service.interface";
import { IGroupRepository } from "../../shared/interfaces/repository/group-repository.interface";
import { TOKENS } from "../../shared/di/tokens";
import {
  IConversationDocument,
  IGroupMember,
} from "../../shared/types/group.types";
import User from "../auth/auth.model";
import Message, { IMessage } from "../chat/message.model";
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
      new Set([...(participantIds || []), creatorId.toString()]),
    );
    if (uniqueIds.length < 1)
      throw new AppError("Group must have at least 1 participant", 400);

    const foundUsers = await User.find({ _id: { $in: uniqueIds } });
    if (foundUsers.length !== uniqueIds.length)
      throw new AppError("One or more participants could not be found", 400);

    const members: IGroupMember[] = uniqueIds.map((id) => ({
      user: new Types.ObjectId(id),
      role:
        id === creatorId.toString()
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
      theme: dto.theme,
      creator: creatorId,
      members,
      participants: uniqueIds.map(id => new Types.ObjectId(id)),
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
    await this._assertAdminOrOwner(groupId, requesterId);
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
    if (targetMember.role === GROUP_ROLES.ADMIN && !isSelf)
      throw new AppError("Admin cannot be removed by another member", 400);

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
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new AppError("Group not found", 404);

    const getUserId = (userObj: Types.ObjectId | { _id?: Types.ObjectId }): string => {
      if (!userObj) return "";
      return (userObj as { _id?: Types.ObjectId })._id
        ? (userObj as { _id?: Types.ObjectId })._id!.toString()
        : userObj.toString();
    };

    const reqUserIdStr = requesterId.toString();

    const memberIndex = group.members.findIndex(
      (m) => getUserId(m.user) === reqUserIdStr
    );
    if (memberIndex === -1) {
      throw new AppError("You are not a member of this group", 404);
    }

    const leavingMember = group.members[memberIndex];

    const admins = group.members.filter((m) => m.role === GROUP_ROLES.ADMIN);
    const isLastAdmin = admins.length === 1 && leavingMember.role === GROUP_ROLES.ADMIN;

    if (isLastAdmin && group.members.length > 1) {
      const nextMember = group.members.find(
        (m) => getUserId(m.user) !== reqUserIdStr
      );
      if (nextMember) {
        const nextMemberId = nextMember.user && (nextMember.user as { _id?: Types.ObjectId })._id 
          ? (nextMember.user as { _id?: Types.ObjectId })._id!
          : (nextMember.user as Types.ObjectId);

        await this.groupRepository.updateMemberRole(
          groupId,
          nextMemberId,
          GROUP_ROLES.ADMIN
        );
      }
    }

    await this.groupRepository.removeMember(groupId, requesterId);

    const updatedGroup = await this.groupRepository.findById(groupId);
    if (updatedGroup && updatedGroup.members.length === 0) {
      await this.groupRepository.deleteById(groupId);
    }
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
      throw new AppError("New admin is not a member of this group", 404);

    await this.groupRepository.updateMemberRole(
      groupId,
      currentOwnerId,
      GROUP_ROLES.MEMBER,
    );

    const updatedGroup = await this.groupRepository.updateMemberRole(
      groupId,
      newOwnerObjectId,
      GROUP_ROLES.ADMIN,
    );
    if (!updatedGroup) throw new AppError("Failed to transfer ownership", 500);

    return updatedGroup;
  }

  private async _assertOwner(groupId: string, userId: Types.ObjectId) {
    const member = await this.groupRepository.getMember(groupId, userId);
    if (!member || member.role !== GROUP_ROLES.ADMIN)
      throw new AppError("Only a group admin can perform this action", 403);
    return member;
  }

  private async _assertAdminOrOwner(groupId: string, userId: Types.ObjectId) {
    const member = await this.groupRepository.getMember(groupId, userId);
    if (!member || member.role !== GROUP_ROLES.ADMIN)
      throw new AppError(
        "Only admins can perform this action",
        403,
      );
    return member;
  }

  async searchGroups(query: string): Promise<IConversationDocument[]> {
    return this.groupRepository.searchGroups(query);
  }

  async joinGroup(groupId: string, requesterId: Types.ObjectId): Promise<IConversationDocument> {
    const existingCheck = await this.groupRepository.isMember(groupId, requesterId);
    if (existingCheck) {
      throw new AppError("You are already a member of this group", 400);
    }

    const newMembers: IGroupMember[] = [{
      user: requesterId,
      role: GROUP_ROLES.MEMBER,
      joinedAt: new Date(),
    }];

    const updatedGroup = await this.groupRepository.addMembers(
      groupId,
      newMembers,
    );
    if (!updatedGroup) throw new AppError("Group not found", 404);

    return updatedGroup;
  }

  async getGroupMessages(groupId: string, userId: string): Promise<IMessage[]> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new AppError("Group not found", 404);

    const isMember = await this.groupRepository.isMember(groupId, new Types.ObjectId(userId));
    if (!isMember) throw new AppError("Unauthorized", 403);

    return Message.find({ groupRef: groupId, isDeleted: false })
      .populate("sender", "username avatar")
      .sort({ createdAt: 1 })
      .exec() as unknown as Promise<IMessage[]>;
  }

  async sendGroupMessage(
    groupId: string,
    senderId: string,
    content: string,
  ): Promise<IMessage> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new AppError("Group not found", 404);

    const isMember = await this.groupRepository.isMember(groupId, new Types.ObjectId(senderId));
    if (!isMember) throw new AppError("Unauthorized", 403);

    const message = await Message.create({
      groupRef: groupId,
      conversation: null,
      sender: new Types.ObjectId(senderId),
      content: content.trim(),
    });

    await this.groupRepository.updateById(groupId, {
      lastMessage: message._id as Types.ObjectId,
    });

    return message.populate("sender", "username avatar") as unknown as Promise<IMessage>;
  }
}
