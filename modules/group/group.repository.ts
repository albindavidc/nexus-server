import { Types } from "mongoose";
import { GroupRole } from "../../shared/constants";
import { IGroupRepository } from "../../shared/interfaces/repository/group-repository.interface";
import {
  IConversationDocument,
  IGroupMember,
  IPopulatedGroupMember,
} from "../../shared/types/group.types";
import Group from "./group.model";
import Message from "../chat/message.model";

const MEMBERS_POPULATE = {
  path: "members.user",
  select: "username email avatar status lastSeen",
};

const LAST_MESSAGE_POPULATE = {
  path: "lastMessage",
  populate: { path: "sender", select: "username avatar" },
};

const CREATOR_POPULATE = {
  path: "creator",
  select: "username email avatar status lastSeen",
};

export class GroupRepository implements IGroupRepository {
  async create(
    data: Partial<IConversationDocument>,
  ): Promise<IConversationDocument> {
    const group = await Group.create(data);
    return this._populate(group as unknown as IConversationDocument);
  }

  async findById(groupId: string): Promise<IConversationDocument | null> {
    return Group.findOne({ _id: groupId, isDeleted: false })
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .populate(CREATOR_POPULATE)
      .lean()
      .exec() as Promise<IConversationDocument | null>;
  }

  async findByIdAsParticipant(
    id: string,
    userId: string,
  ): Promise<IConversationDocument | null> {
    return Group.findOne({
      _id: id,
      "members.user": new Types.ObjectId(userId),
      isDeleted: false,
    })
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .populate(CREATOR_POPULATE)
      .lean()
      .exec() as Promise<IConversationDocument | null>;
  }

  async findAllByParticipants(
    userId: string,
  ): Promise<IConversationDocument[]> {
    return Group.find({
      "members.user": new Types.ObjectId(userId),
      isDeleted: false,
    })
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .populate(CREATOR_POPULATE)
      .sort({ updatedAt: -1 })
      .lean()
      .exec() as unknown as Promise<IConversationDocument[]>;
  }

  async searchGroups(query: string): Promise<IConversationDocument[]> {
    return Group.find({
      isDeleted: false,
      privacy: "public",
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    })
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .populate(CREATOR_POPULATE)
      .limit(20)
      .lean()
      .exec() as unknown as Promise<IConversationDocument[]>;
  }

  async updateById(
    id: string,
    data: Partial<IConversationDocument>,
  ): Promise<IConversationDocument | null> {
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: id },
      data,
      {
        new: true,
        runValidators: true,
      },
    )
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .populate(CREATOR_POPULATE)
      .lean()
      .exec();

    return updatedGroup as unknown as IConversationDocument | null;
  }

  async deleteById(id: string): Promise<void> {
    await Group.updateOne(
      { _id: id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    await Message.updateMany(
      { groupRef: id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
  }

  async addMembers(
    groupId: string,
    members: IGroupMember[],
  ): Promise<IConversationDocument | null> {
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: groupId },
      {
        $push: { members: { $each: members } },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .populate(CREATOR_POPULATE)
      .lean()
      .exec();

    return updatedGroup as unknown as IConversationDocument | null;
  }

  async removeMember(
    groupId: string,
    userId: Types.ObjectId,
  ): Promise<IConversationDocument | null> {
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: groupId },
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
      .populate(CREATOR_POPULATE)
      .lean()
      .exec();

    return updatedGroup as unknown as IConversationDocument | null;
  }

  async updateMemberRole(
    groupId: string,
    userId: Types.ObjectId,
    role: GroupRole,
  ): Promise<IConversationDocument | null> {
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: groupId, "members.user": userId },
      {
        $set: { "members.$[member].role": role },
      },
      {
        new: true,
        runValidators: true,
        arrayFilters: [{ "member.user": userId }],
      },
    )
      .populate(MEMBERS_POPULATE)
      .populate(LAST_MESSAGE_POPULATE)
      .populate(CREATOR_POPULATE)
      .lean()
      .exec();

    return updatedGroup as unknown as IConversationDocument | null;
  }

  async isMember(groupId: string, userId: Types.ObjectId): Promise<boolean> {
    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
      isDeleted: false,
    })
      .lean()
      .exec();
    return !!group;
  }

  async getMember(
    groupId: string,
    userId: Types.ObjectId,
  ): Promise<IGroupMember | null> {
    const group = await Group.findOne({
      _id: groupId,
    })
      .populate(MEMBERS_POPULATE)
      .lean()
      .exec();

    if (!group) {
      return null;
    }

    const members = group.members as unknown as IPopulatedGroupMember[];
    return (
      members.find(
        (m) => {
          const mUserId = m.user?._id || m.user?.id || (m.user as unknown as Types.ObjectId);
          return mUserId && mUserId.toString() === userId.toString();
        },
      ) as unknown as IGroupMember || null
    );
  }

  private async _populate(
    group: IConversationDocument,
  ): Promise<IConversationDocument> {
    return group.populate([MEMBERS_POPULATE, LAST_MESSAGE_POPULATE, CREATOR_POPULATE]);
  }
}
