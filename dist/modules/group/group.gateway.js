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
exports.GroupGateway = void 0;
const tsyringe_1 = require("tsyringe");
const tokens_1 = require("../../shared/di/tokens");
const constants_1 = require("../../shared/constants");
const logger_1 = __importDefault(require("../../shared/utils/logger"));
let GroupGateway = class GroupGateway {
    _groupService;
    constructor(_groupService) {
        this._groupService = _groupService;
    }
    registerHandlers(socket, io) {
        if (!socket.user || !socket.userId)
            return;
        const user = { _id: socket.user._id, username: socket.user.username };
        const emitError = (message, callback) => {
            if (typeof callback === "function") {
                callback({ success: false, error: message });
            }
            else {
                socket.emit(constants_1.SOCKET_EVENTS.SOCKET_ERROR, { message });
            }
        };
        socket.on(constants_1.SOCKET_EVENTS.GROUP_GET_MY_GROUPS, async (payload, callback) => {
            try {
                const groups = await this._groupService.getMyGroups(user._id);
                if (typeof callback === "function")
                    callback({ success: true, data: { groups } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to fetch groups.";
                logger_1.default.error(`GROUP_GET_MY_GROUPS error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_GET_BY_ID, async (payload, callback) => {
            try {
                if (!payload?.groupId)
                    return emitError("groupId is required.", callback);
                const group = await this._groupService.getGroup(payload.groupId, user._id);
                if (typeof callback === "function")
                    callback({ success: true, data: { group } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to fetch group.";
                logger_1.default.error(`GROUP_GET_BY_ID error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_SEARCH, async (payload, callback) => {
            try {
                if (!payload?.q) {
                    if (typeof callback === "function")
                        callback({ success: true, data: { groups: [] } });
                    return;
                }
                const groups = await this._groupService.searchGroups(payload.q);
                if (typeof callback === "function")
                    callback({ success: true, data: { groups } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to search groups.";
                logger_1.default.error(`GROUP_SEARCH error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_GET_MESSAGES, async (payload, callback) => {
            try {
                if (!payload?.groupId)
                    return emitError("groupId is required.", callback);
                const messages = await this._groupService.getGroupMessages(payload.groupId, user._id.toString());
                if (typeof callback === "function")
                    callback({ success: true, data: { messages } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to fetch group messages.";
                logger_1.default.error(`GROUP_GET_MESSAGES error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_JOIN, async (payload, callback) => {
            try {
                if (!payload?.groupId)
                    return emitError("groupId is required.", callback);
                const group = await this._groupService.joinGroup(payload.groupId, user._id);
                io.to(payload.groupId).emit(constants_1.SOCKET_EVENTS.MEMBER_ADDED, {
                    groupId: payload.groupId,
                    addedUserIds: [user._id.toString()],
                    actorId: user._id.toString(),
                    actorUserName: user.username,
                });
                io.to(user._id.toString()).emit(constants_1.SOCKET_EVENTS.GROUP_CREATED, { group });
                if (typeof callback === "function")
                    callback({ success: true, data: { group } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to join group.";
                logger_1.default.error(`GROUP_JOIN error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_SEND_MESSAGE, async (payload, callback) => {
            try {
                const { groupId, content, type, mediaUrl, mediaMeta } = payload;
                if (!groupId)
                    return emitError("groupId is required.", callback);
                if (!content || !content.trim())
                    return emitError("Content cannot be empty.", callback);
                const message = await this._groupService.sendGroupMessage(groupId, user._id.toString(), content, {
                    type,
                    mediaUrl,
                    mediaMeta,
                });
                io.to(groupId).emit(constants_1.SOCKET_EVENTS.GROUP_NEW_MESSAGE, message);
                if (typeof callback === "function")
                    callback({ success: true, data: { message } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to send group message.";
                logger_1.default.error(`GROUP_SEND_MESSAGE error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_CREATE, async (payload, callback) => {
            try {
                const { name, description, participantIds, avatarUrl } = payload;
                if (!name?.trim())
                    return emitError("Group name is required.", callback);
                if (!Array.isArray(participantIds) || participantIds.length === 0)
                    return emitError("At least one participant is required.", callback);
                const group = await this._groupService.createGroup(user._id, {
                    name,
                    description,
                    participantIds,
                    avatarUrl,
                });
                socket.join(group._id.toString());
                group.members.forEach((m) => {
                    io.to(m.user.toString()).emit(constants_1.SOCKET_EVENTS.GROUP_CREATED, {
                        group,
                        actorId: user._id.toString(),
                        actorUserName: user.username,
                    });
                });
                logger_1.default.debug(`Group created: "${name}" by ${user.username}`);
                if (typeof callback === "function")
                    callback({ success: true, data: { group } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to create group.";
                logger_1.default.error(`GROUP_CREATE error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_UPDATE, async (payload, callback) => {
            try {
                const { groupId, ...dto } = payload;
                if (!groupId)
                    return emitError("groupId is required.", callback);
                const group = await this._groupService.updateGroup(groupId, user._id, dto);
                io.to(groupId).emit(constants_1.SOCKET_EVENTS.GROUP_UPDATED, {
                    group,
                    actorId: user._id.toString(),
                    actorUserName: user.username,
                });
                logger_1.default.debug(`Group updated: ${groupId} by ${user.username}`);
                if (typeof callback === "function")
                    callback({ success: true, data: { group } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to update group.";
                logger_1.default.error(`GROUP_UPDATE error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_DELETE, async (payload, callback) => {
            try {
                if (!payload?.groupId)
                    return emitError("groupId is required.", callback);
                const group = await this._groupService.getGroup(payload.groupId, user._id);
                await this._groupService.deleteGroup(payload.groupId, user._id);
                group.members.forEach((m) => {
                    io.to(m.user.toString()).emit(constants_1.SOCKET_EVENTS.GROUP_DELETED, {
                        groupId: payload.groupId,
                        actorId: user._id.toString(),
                        actorUserName: user.username,
                    });
                });
                io.in(payload.groupId).socketsLeave(payload.groupId);
                logger_1.default.debug(`Group deleted: ${payload.groupId} by ${user.username}`);
                if (typeof callback === "function")
                    callback({ success: true, data: { message: "Group deleted successfully" } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to delete group.";
                logger_1.default.error(`GROUP_DELETE error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_ADD_MEMBERS, async (payload, callback) => {
            try {
                const { groupId, userIds } = payload;
                if (!groupId)
                    return emitError("groupId is required.", callback);
                if (!Array.isArray(userIds) || userIds.length === 0)
                    return emitError("At least one userId is required.", callback);
                const group = await this._groupService.addMembers(groupId, user._id, userIds);
                io.to(groupId).emit(constants_1.SOCKET_EVENTS.MEMBER_ADDED, {
                    groupId,
                    addedUserIds: userIds,
                    actorId: user._id.toString(),
                    actorUserName: user.username,
                });
                userIds.forEach((uid) => {
                    io.to(uid).emit(constants_1.SOCKET_EVENTS.GROUP_CREATED, { group });
                });
                logger_1.default.debug(`Members added to ${groupId}: ${userIds.join(", ")}`);
                if (typeof callback === "function")
                    callback({ success: true, data: { group } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to add members.";
                logger_1.default.error(`GROUP_ADD_MEMBERS error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_REMOVE_MEMBER, async (payload, callback) => {
            try {
                const { groupId, targetUserId } = payload;
                if (!groupId || !targetUserId)
                    return emitError("groupId and targetUserId are required.", callback);
                const group = await this._groupService.removeMember(groupId, user._id, targetUserId);
                io.to(groupId).emit(constants_1.SOCKET_EVENTS.MEMBER_REMOVED, {
                    groupId,
                    targetUserId,
                    actorId: user._id.toString(),
                    actorUserName: user.username,
                });
                io.in(targetUserId).socketsLeave(groupId);
                logger_1.default.debug(`Member ${targetUserId} removed from ${groupId} by ${user.username}`);
                if (typeof callback === "function")
                    callback({ success: true, data: { group } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to remove member.";
                logger_1.default.error(`GROUP_REMOVE_MEMBER error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_LEAVE, async (payload, callback) => {
            try {
                const { groupId } = payload;
                if (!groupId)
                    return emitError("groupId is required.", callback);
                await this._groupService.leaveGroup(groupId, user._id);
                socket.to(groupId).emit(constants_1.SOCKET_EVENTS.MEMBER_LEFT, {
                    groupId,
                    userId: user._id.toString(),
                    userName: user.username,
                });
                socket.leave(groupId);
                logger_1.default.debug(`${user.username} left group ${groupId}`);
                if (typeof callback === "function")
                    callback({ success: true, data: { message: "Left group successfully" } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to leave group.";
                logger_1.default.error(`GROUP_LEAVE error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_PROMOTE, async (payload, callback) => {
            try {
                const { groupId, targetUserId } = payload;
                if (!groupId || !targetUserId)
                    return emitError("groupId and targetUserId are required.", callback);
                const group = await this._groupService.promoteMember(groupId, user._id, targetUserId);
                io.to(groupId).emit(constants_1.SOCKET_EVENTS.MEMBER_PROMOTED, {
                    groupId,
                    targetUserId,
                    newRole: constants_1.GROUP_ROLES.ADMIN,
                    actorId: user._id.toString(),
                    actorUserName: user.username,
                });
                logger_1.default.debug(`Member ${targetUserId} promoted in ${groupId}`);
                if (typeof callback === "function")
                    callback({ success: true, data: { group } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to promote member.";
                logger_1.default.error(`GROUP_PROMOTE error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_DEMOTE, async (payload, callback) => {
            try {
                const { groupId, targetUserId } = payload;
                if (!groupId || !targetUserId)
                    return emitError("groupId and targetUserId are required.", callback);
                const group = await this._groupService.demoteMember(groupId, user._id, targetUserId);
                io.to(groupId).emit(constants_1.SOCKET_EVENTS.MEMBER_DEMOTED, {
                    groupId,
                    targetUserId,
                    newRole: constants_1.GROUP_ROLES.MEMBER,
                    actorId: user._id.toString(),
                    actorUserName: user.username,
                });
                logger_1.default.debug(`Member ${targetUserId} demoted in ${groupId}`);
                if (typeof callback === "function")
                    callback({ success: true, data: { group } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to demote member.";
                logger_1.default.error(`GROUP_DEMOTE error: ${message}`);
                emitError(message, callback);
            }
        });
        socket.on(constants_1.SOCKET_EVENTS.GROUP_TRANSFER_OWNERSHIP, async (payload, callback) => {
            try {
                const { groupId, newOwnerId } = payload;
                if (!groupId || !newOwnerId)
                    return emitError("groupId and newOwnerId are required.", callback);
                const group = await this._groupService.transferOwnership(groupId, user._id, newOwnerId);
                io.to(groupId).emit(constants_1.SOCKET_EVENTS.MEMBER_PROMOTED, {
                    groupId,
                    targetUserId: newOwnerId,
                    newRole: constants_1.GROUP_ROLES.ADMIN,
                    previousOwnerId: user._id.toString(),
                    actorId: user._id.toString(),
                    actorUserName: user.username,
                    isOwnerTransfer: true,
                });
                logger_1.default.debug(`Ownership of ${groupId} transferred to ${newOwnerId}`);
                if (typeof callback === "function")
                    callback({ success: true, data: { group } });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Failed to transfer ownership.";
                logger_1.default.error(`GROUP_TRANSFER_OWNERSHIP error: ${message}`);
                emitError(message, callback);
            }
        });
    }
};
exports.GroupGateway = GroupGateway;
exports.GroupGateway = GroupGateway = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.GroupService)),
    __metadata("design:paramtypes", [Object])
], GroupGateway);
