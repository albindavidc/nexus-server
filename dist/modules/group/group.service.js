"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupService = void 0;
const tsyringe_1 = require("tsyringe");
const tokens_1 = require("../../shared/di/tokens");
const auth_model_1 = __importDefault(require("../auth/auth.model"));
const message_model_1 = __importDefault(require("../chat/message.model"));
const constants_1 = require("../../shared/constants");
const mongoose_1 = require("mongoose");
const AppError_1 = __importDefault(require("../../shared/errors/AppError"));
const events_1 = __importDefault(require("events"));
let GroupService = class GroupService {
    _groupRepository;
    _eventEmitter;
    constructor(_groupRepository, _eventEmitter) {
        this._groupRepository = _groupRepository;
        this._eventEmitter = _eventEmitter;
    }
    async createGroup(creatorId, dto) {
        const { name, participantIds } = dto;
        if (!name.trim())
            throw new AppError_1.default("Group name is required", 400);
        const uniqueIds = Array.from(new Set([...(participantIds || []), creatorId.toString()]));
        if (uniqueIds.length < 1)
            throw new AppError_1.default("Group must have at least 1 participant", 400);
        const foundUsers = await auth_model_1.default.find({ _id: { $in: uniqueIds } });
        if (foundUsers.length !== uniqueIds.length)
            throw new AppError_1.default("One or more participants could not be found", 400);
        const members = uniqueIds.map((id) => ({
            user: new mongoose_1.Types.ObjectId(id),
            role: id === creatorId.toString() ? constants_1.GROUP_ROLES.ADMIN : constants_1.GROUP_ROLES.MEMBER,
            joinedAt: new Date(),
            addedBy: id === creatorId.toString() ? undefined : new mongoose_1.Types.ObjectId(creatorId),
        }));
        return this._groupRepository.create({
            type: constants_1.CONVERSATION_TYPE.GROUP,
            name: dto.name,
            description: dto.description,
            avatar: dto.avatarUrl,
            theme: dto.theme,
            creator: creatorId,
            members,
            participants: uniqueIds.map((id) => new mongoose_1.Types.ObjectId(id)),
            isActive: true,
        });
    }
    async getGroup(groupId, requesterId) {
        const group = await this._groupRepository.findByIdAsParticipant(groupId, requesterId.toString());
        if (!group)
            throw new AppError_1.default("Group not found", 404);
        return group;
    }
    async getMyGroups(userId) {
        return this._groupRepository.findAllByParticipants(userId.toString());
    }
    async updateGroup(groupId, requesterId, dto) {
        await this._assertAdminOrOwner(groupId, requesterId);
        const updateData = {};
        if (dto.name !== undefined)
            updateData.name = dto.name;
        if (dto.description !== undefined)
            updateData.description = dto.description;
        if (dto.avatarUrl !== undefined)
            updateData.avatar = dto.avatarUrl;
        const updatedGroup = await this._groupRepository.updateById(groupId, updateData);
        if (!updatedGroup)
            throw new AppError_1.default("Failed to update group", 500);
        return updatedGroup;
    }
    async deleteGroup(groupId, requesterId) {
        await this._assertAdminOrOwner(groupId, requesterId);
        await this._groupRepository.deleteById(groupId);
    }
    async addMembers(groupId, requesterId, userIds) {
        await this._assertAdminOrOwner(groupId, requesterId);
        const users = await auth_model_1.default.find({ _id: { $in: userIds } }).select("_id");
        if (users.length !== userIds.length)
            throw new AppError_1.default("One or more users were not found", 404);
        const existingChecks = await Promise.all(userIds.map((id) => this._groupRepository.isMember(groupId, new mongoose_1.Types.ObjectId(id))));
        if (existingChecks.some(Boolean))
            throw new AppError_1.default("One or more users are already in the group", 400);
        const newMembers = userIds.map((id) => ({
            user: new mongoose_1.Types.ObjectId(id),
            role: constants_1.GROUP_ROLES.MEMBER,
            joinedAt: new Date(),
            addedBy: requesterId,
        }));
        const updatedGroup = await this._groupRepository.addMembers(groupId, newMembers);
        if (!updatedGroup)
            throw new AppError_1.default("Group not found", 404);
        return updatedGroup;
    }
    async removeMember(groupId, requesterId, targetUserId) {
        const targetObjectId = new mongoose_1.Types.ObjectId(targetUserId);
        const isSelf = targetObjectId.equals(requesterId);
        if (isSelf) {
            await this._assertAdminOrOwner(groupId, requesterId);
        }
        else {
            await this._assertOwner(groupId, requesterId);
        }
        const targetMember = await this._groupRepository.getMember(groupId, targetObjectId);
        if (!targetMember)
            throw new AppError_1.default("Member not found", 404);
        if (targetMember.role === constants_1.GROUP_ROLES.ADMIN && !isSelf)
            throw new AppError_1.default("Admin cannot be removed by another member", 400);
        const updatedGroup = await this._groupRepository.removeMember(groupId, targetObjectId);
        if (!updatedGroup)
            throw new AppError_1.default("Failed to remove member", 500);
        return updatedGroup;
    }
    async leaveGroup(groupId, requesterId) {
        const group = await this._groupRepository.findById(groupId);
        if (!group)
            throw new AppError_1.default("Group not found", 404);
        const getUserId = (userObj) => {
            if (!userObj)
                return "";
            return userObj._id
                ? userObj._id.toString()
                : userObj.toString();
        };
        const reqUserIdStr = requesterId.toString();
        const memberIndex = group.members.findIndex((m) => getUserId(m.user) === reqUserIdStr);
        if (memberIndex === -1) {
            throw new AppError_1.default("You are not a member of this group", 404);
        }
        const leavingMember = group.members[memberIndex];
        const admins = group.members.filter((m) => m.role === constants_1.GROUP_ROLES.ADMIN);
        const isLastAdmin = admins.length === 1 && leavingMember.role === constants_1.GROUP_ROLES.ADMIN;
        if (isLastAdmin && group.members.length > 1) {
            const nextMember = group.members.find((m) => getUserId(m.user) !== reqUserIdStr);
            if (nextMember) {
                const nextMemberId = nextMember.user && nextMember.user._id
                    ? nextMember.user._id
                    : nextMember.user;
                await this._groupRepository.updateMemberRole(groupId, nextMemberId, constants_1.GROUP_ROLES.ADMIN);
            }
        }
        await this._groupRepository.removeMember(groupId, requesterId);
        const updatedGroup = await this._groupRepository.findById(groupId);
        if (updatedGroup && updatedGroup.members.length === 0) {
            await this._groupRepository.deleteById(groupId);
        }
    }
    async promoteMember(groupId, requesterId, targetUserId) {
        await this._assertAdminOrOwner(groupId, requesterId);
        const targetObjectId = new mongoose_1.Types.ObjectId(targetUserId);
        const targetMember = await this._groupRepository.getMember(groupId, targetObjectId);
        if (!targetMember)
            throw new AppError_1.default("Member not found", 404);
        if (targetMember.role === constants_1.GROUP_ROLES.ADMIN)
            throw new AppError_1.default("Member is already an admin", 400);
        const updatedGroup = await this._groupRepository.updateMemberRole(groupId, targetObjectId, constants_1.GROUP_ROLES.ADMIN);
        if (!updatedGroup)
            throw new AppError_1.default("Failed to promote member", 500);
        return updatedGroup;
    }
    async demoteMember(groupId, requesterId, targetUserId) {
        await this._assertOwner(groupId, requesterId);
        const targetObjectId = new mongoose_1.Types.ObjectId(targetUserId);
        const targetMember = await this._groupRepository.getMember(groupId, targetObjectId);
        if (!targetMember)
            throw new AppError_1.default("Member not found", 404);
        if (targetMember.role !== constants_1.GROUP_ROLES.ADMIN)
            throw new AppError_1.default("Member is not an admin", 400);
        const updatedGroup = await this._groupRepository.updateMemberRole(groupId, targetObjectId, constants_1.GROUP_ROLES.MEMBER);
        if (!updatedGroup)
            throw new AppError_1.default("Failed to demote member", 500);
        return updatedGroup;
    }
    async transferOwnership(groupId, currentOwnerId, newOwnerId) {
        await this._assertOwner(groupId, currentOwnerId);
        const newOwnerObjectId = new mongoose_1.Types.ObjectId(newOwnerId);
        const newOwnerMember = await this._groupRepository.getMember(groupId, newOwnerObjectId);
        if (!newOwnerMember)
            throw new AppError_1.default("New admin is not a member of this group", 404);
        await this._groupRepository.updateMemberRole(groupId, currentOwnerId, constants_1.GROUP_ROLES.MEMBER);
        const updatedGroup = await this._groupRepository.updateMemberRole(groupId, newOwnerObjectId, constants_1.GROUP_ROLES.ADMIN);
        if (!updatedGroup)
            throw new AppError_1.default("Failed to transfer ownership", 500);
        return updatedGroup;
    }
    async _assertOwner(groupId, userId) {
        const member = await this._groupRepository.getMember(groupId, userId);
        if (!member || member.role !== constants_1.GROUP_ROLES.ADMIN)
            throw new AppError_1.default("Only a group admin can perform this action", 403);
        return member;
    }
    async _assertAdminOrOwner(groupId, userId) {
        const member = await this._groupRepository.getMember(groupId, userId);
        if (!member || member.role !== constants_1.GROUP_ROLES.ADMIN)
            throw new AppError_1.default("Only admins can perform this action", 403);
        return member;
    }
    async searchGroups(query) {
        return this._groupRepository.searchGroups(query);
    }
    async joinGroup(groupId, requesterId) {
        const existingCheck = await this._groupRepository.isMember(groupId, requesterId);
        if (existingCheck) {
            throw new AppError_1.default("You are already a member of this group", 400);
        }
        const newMembers = [
            {
                user: requesterId,
                role: constants_1.GROUP_ROLES.MEMBER,
                joinedAt: new Date(),
            },
        ];
        const updatedGroup = await this._groupRepository.addMembers(groupId, newMembers);
        if (!updatedGroup)
            throw new AppError_1.default("Group not found", 404);
        return updatedGroup;
    }
    async getGroupMessages(groupId, userId) {
        const group = await this._groupRepository.findById(groupId);
        if (!group)
            throw new AppError_1.default("Group not found", 404);
        const isMember = await this._groupRepository.isMember(groupId, new mongoose_1.Types.ObjectId(userId));
        if (!isMember)
            throw new AppError_1.default("Unauthorized", 403);
        return message_model_1.default.find({ groupRef: groupId, isDeleted: false })
            .populate("sender", "username avatar")
            .sort({ createdAt: 1 })
            .exec();
    }
    async sendGroupMessage(groupId, senderId, content, options) {
        const group = await this._groupRepository.findById(groupId);
        if (!group)
            throw new AppError_1.default("Group not found", 404);
        const isMember = await this._groupRepository.isMember(groupId, new mongoose_1.Types.ObjectId(senderId));
        if (!isMember)
            throw new AppError_1.default("Unauthorized", 403);
        const messageData = {
            groupRef: groupId,
            conversation: null,
            sender: new mongoose_1.Types.ObjectId(senderId),
            content: content.trim(),
        };
        if (options?.type)
            messageData.type = options.type;
        if (options?.mediaUrl)
            messageData.mediaURL = options.mediaUrl;
        if (options?.mediaMeta)
            messageData.mediaMeta = options.mediaMeta;
        const message = await message_model_1.default.create(messageData);
        const recipientIds = group.participants
            .map((p) => p instanceof mongoose_1.Types.ObjectId ? p.toString() : p._id.toString())
            .filter((id) => id !== senderId);
        this._eventEmitter.emit("message.sent", { message, recipientIds });
        await this._groupRepository.updateById(groupId, {
            lastMessage: message._id,
        });
        return message.populate("sender", "username avatar");
    }
};
exports.GroupService = GroupService;
exports.GroupService = GroupService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.GroupRepository)),
    __param(1, (0, tsyringe_1.inject)(tokens_1.TOKENS.EventEmitter)),
    __metadata("design:paramtypes", [Object, events_1.default])
], GroupService);
