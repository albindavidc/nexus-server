"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupRepository = void 0;
const mongoose_1 = require("mongoose");
const group_model_1 = __importDefault(require("./group.model"));
const message_model_1 = __importDefault(require("../chat/message.model"));
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
class GroupRepository {
    async create(data) {
        const group = await group_model_1.default.create(data);
        return this._populate(group);
    }
    async findById(groupId) {
        return group_model_1.default.findOne({ _id: groupId, isDeleted: false })
            .populate(MEMBERS_POPULATE)
            .populate(LAST_MESSAGE_POPULATE)
            .populate(CREATOR_POPULATE)
            .lean()
            .exec();
    }
    async findByIdAsParticipant(id, userId) {
        return group_model_1.default.findOne({
            _id: id,
            "members.user": new mongoose_1.Types.ObjectId(userId),
            isDeleted: false,
        })
            .populate(MEMBERS_POPULATE)
            .populate(LAST_MESSAGE_POPULATE)
            .populate(CREATOR_POPULATE)
            .lean()
            .exec();
    }
    async findAllByParticipants(userId) {
        return group_model_1.default.find({
            "members.user": new mongoose_1.Types.ObjectId(userId),
            isDeleted: false,
        })
            .populate(MEMBERS_POPULATE)
            .populate(LAST_MESSAGE_POPULATE)
            .populate(CREATOR_POPULATE)
            .sort({ updatedAt: -1 })
            .lean()
            .exec();
    }
    async searchGroups(query) {
        return group_model_1.default.find({
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
            .exec();
    }
    async updateById(id, data) {
        const updatedGroup = await group_model_1.default.findOneAndUpdate({ _id: id }, data, {
            new: true,
            runValidators: true,
        })
            .populate(MEMBERS_POPULATE)
            .populate(LAST_MESSAGE_POPULATE)
            .populate(CREATOR_POPULATE)
            .lean()
            .exec();
        return updatedGroup;
    }
    async deleteById(id) {
        await group_model_1.default.updateOne({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date() } });
        await message_model_1.default.updateMany({ groupRef: id }, { $set: { isDeleted: true, deletedAt: new Date() } });
    }
    async addMembers(groupId, members) {
        const updatedGroup = await group_model_1.default.findOneAndUpdate({ _id: groupId }, {
            $push: { members: { $each: members } },
        }, {
            new: true,
            runValidators: true,
        })
            .populate(MEMBERS_POPULATE)
            .populate(LAST_MESSAGE_POPULATE)
            .populate(CREATOR_POPULATE)
            .lean()
            .exec();
        return updatedGroup;
    }
    async removeMember(groupId, userId) {
        const updatedGroup = await group_model_1.default.findOneAndUpdate({ _id: groupId }, {
            $pull: { members: { user: userId } },
        }, {
            new: true,
            runValidators: true,
        })
            .populate(MEMBERS_POPULATE)
            .populate(LAST_MESSAGE_POPULATE)
            .populate(CREATOR_POPULATE)
            .lean()
            .exec();
        return updatedGroup;
    }
    async updateMemberRole(groupId, userId, role) {
        const updatedGroup = await group_model_1.default.findOneAndUpdate({ _id: groupId, "members.user": userId }, {
            $set: { "members.$[member].role": role },
        }, {
            new: true,
            runValidators: true,
            arrayFilters: [{ "member.user": userId }],
        })
            .populate(MEMBERS_POPULATE)
            .populate(LAST_MESSAGE_POPULATE)
            .populate(CREATOR_POPULATE)
            .lean()
            .exec();
        return updatedGroup;
    }
    async isMember(groupId, userId) {
        const group = await group_model_1.default.findOne({
            _id: groupId,
            "members.user": userId,
            isDeleted: false,
        })
            .lean()
            .exec();
        return !!group;
    }
    async getMember(groupId, userId) {
        const group = await group_model_1.default.findOne({
            _id: groupId,
        })
            .populate(MEMBERS_POPULATE)
            .lean()
            .exec();
        if (!group) {
            return null;
        }
        const members = group.members;
        return (members.find((m) => {
            const mUserId = m.user?._id || m.user?.id || m.user;
            return mUserId && mUserId.toString() === userId.toString();
        }) || null);
    }
    async _populate(group) {
        return group.populate([MEMBERS_POPULATE, LAST_MESSAGE_POPULATE, CREATOR_POPULATE]);
    }
}
exports.GroupRepository = GroupRepository;
