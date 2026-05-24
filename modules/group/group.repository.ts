import { Types } from "mongoose";
import { GroupRole } from "../../shared/constants";
import { IGroupRepository } from "../../shared/interfaces/repository/group-repository.interface";
import {
  IConversationDocument,
  IGroupMember,
} from "../../shared/types/group.types";
import GroupConversation from "./group.model";

const MEMBERS_POPULATE = {
  path: "members.user",
  select: "username email avatar status lastSeen",
};

const LAST_MESSAGE_POPULATE = {
  path: "lastMessage",
  populate: { path: "sender", select: "username avatar" },
};

export class GroupRepository implements IGroupRepository {
  async create(
    data: Partial<IConversationDocument>,
  ): Promise<IConversationDocument> {
    const groupConversation = await GroupConversation.create(data);
    return this._populate(groupConversation);
  }

  async findById(groupId: string): Promise<IConversationDocument | null> {
    return GroupConversation.findById(groupId)
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .lean<IConversationDocument>()
      .exec();
  }

  async findByIdAsParticipant(
    id: string,
    userId: string,
  ): Promise<IConversationDocument | null> {
    return GroupConversation.findById(id)
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .elemMatch("members", { user: userId })
      .lean<IConversationDocument>()
      .exec();
  }

  async findAllByParticipants(
    userId: string,
  ): Promise<IConversationDocument[]> {
    return GroupConversation.find({ participants: userId })
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .sort({ updatedAt: -1 })
      .lean<IConversationDocument[]>()
      .exec();
  }

  async updateById(
    id: string,
    data: Partial<IConversationDocument>,
  ): Promise<IConversationDocument | null> {
    const updatedConversation = await GroupConversation.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      },
    )
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .lean<IConversationDocument>()
      .exec();

    return updatedConversation;
  }

  async deleteById(id: string): Promise<void> {
    await GroupConversation.findByIdAndDelete(id);
  }

  async addMembers(
    groupId: string,
    members: IGroupMember[],
  ): Promise<IConversationDocument | null> {
    const updatedConversation = await GroupConversation.findByIdAndUpdate(
      groupId,
      {
        $push: { members: { $each: members } },
        $addToSet: { participants: { $each: members.map((m) => m.user) } },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .lean<IConversationDocument>()
      .exec();

    return updatedConversation;
  }

  async removeMember(
    groupId: string,
    userId: Types.ObjectId,
  ): Promise<IConversationDocument | null> {
    const updatedConversation = await GroupConversation.findByIdAndUpdate(
      groupId,
      {
        $pull: { members: { user: userId } },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .lean<IConversationDocument>()
      .exec();

    return updatedConversation;
  }

  async updateMemberRole(
    groupId: string,
    userId: Types.ObjectId,
    role: GroupRole,
  ): Promise<IConversationDocument | null> {
    const updatedConversation = await GroupConversation.findByIdAndUpdate(
      { id: groupId, "members.user": userId },
      {
        $set: { "members.$[member].role": role },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .lean<IConversationDocument>()
      .exec();

    return updatedConversation;
  }

  async isMember(groupId: string, userId: Types.ObjectId): Promise<boolean> {
    const conversation = await GroupConversation.findById(groupId)
      .elemMatch("members", { user: userId })
      .lean()
      .exec();
    return !!conversation;
  }

  async getMember(
    groupId: string,
    userId: Types.ObjectId,
  ): Promise<IGroupMember | null> {
    const conversation = await GroupConversation.findById(groupId)
      .populate(MEMBERS_POPULATE)
      .lean<IConversationDocument>()
      .exec();

    if (!conversation) {
      return null;
    }

    return (
      conversation.members.find(
        (m) => m.user._id.toString() === userId.toString(),
      ) || null
    );
  }

  private async _populate(
    group: IConversationDocument,
  ): Promise<IConversationDocument> {
    return group.populate([MEMBERS_POPULATE, LAST_MESSAGE_POPULATE]);
  }
}
