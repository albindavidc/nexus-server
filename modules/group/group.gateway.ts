import { Server } from "socket.io";
import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../shared/di/tokens";
import { IGroupService } from "../../shared/interfaces/services/group-service.interface";
import { SOCKET_EVENTS, GROUP_ROLES } from "../../shared/constants";
import logger from "../../shared/utils/logger";
import { Types } from "mongoose";
import { CustomSocket } from "../../middlewares/auth.middleware";

interface CreateGroupPayload {
  name: string;
  description?: string;
  participantIds: string[];
  avatarUrl?: string;
}

interface UpdateGroupPayload {
  groupId: string;
  name?: string;
  description?: string;
  avatarUrl?: string;
}

interface AddMembersPayload {
  groupId: string;
  userIds: string[];
}

interface RemoveMemberPayload {
  groupId: string;
  targetUserId: string;
}

interface PromoteDemotePayload {
  groupId: string;
  targetUserId: string;
}

interface TransferOwnershipPayload {
  groupId: string;
  newOwnerId: string;
}

interface LeaveGroupPayload {
  groupId: string;
}

type AckCallback = (response: Record<string, unknown>) => void;

@injectable()
export class GroupGateway {
  constructor(
    @inject(TOKENS.GroupService)
    private readonly _groupService: IGroupService,
  ) {}

  public registerHandlers(socket: CustomSocket, io: Server): void {
    if (!socket.user || !socket.userId) return;
    
    const user = { _id: socket.user._id as Types.ObjectId, username: socket.user.username };
    
    const emitError = (message: string, callback?: AckCallback): void => {
      if (typeof callback === "function") {
        callback({ success: false, error: message });
      } else {
        socket.emit(SOCKET_EVENTS.SOCKET_ERROR, { message });
      }
    };

    socket.on(SOCKET_EVENTS.GROUP_GET_MY_GROUPS, async (payload: Record<string, unknown>, callback?: AckCallback) => {
      try {
        const groups = await this._groupService.getMyGroups(user._id);
        if (typeof callback === "function") callback({ success: true, data: { groups } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch groups.";
        logger.error(`GROUP_GET_MY_GROUPS error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_GET_BY_ID, async (payload: { groupId: string }, callback?: AckCallback) => {
      try {
        if (!payload?.groupId) return emitError("groupId is required.", callback);
        const group = await this._groupService.getGroup(payload.groupId, user._id);
        if (typeof callback === "function") callback({ success: true, data: { group } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch group.";
        logger.error(`GROUP_GET_BY_ID error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_SEARCH, async (payload: { q: string }, callback?: AckCallback) => {
      try {
        if (!payload?.q) {
          if (typeof callback === "function") callback({ success: true, data: { groups: [] } });
          return;
        }
        const groups = await this._groupService.searchGroups(payload.q);
        if (typeof callback === "function") callback({ success: true, data: { groups } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to search groups.";
        logger.error(`GROUP_SEARCH error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_GET_MESSAGES, async (payload: { groupId: string }, callback?: AckCallback) => {
      try {
        if (!payload?.groupId) return emitError("groupId is required.", callback);
        const messages = await this._groupService.getGroupMessages(payload.groupId, user._id.toString());
        if (typeof callback === "function") callback({ success: true, data: { messages } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch group messages.";
        logger.error(`GROUP_GET_MESSAGES error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_JOIN, async (payload: { groupId: string }, callback?: AckCallback) => {
      try {
        if (!payload?.groupId) return emitError("groupId is required.", callback);
        const group = await this._groupService.joinGroup(payload.groupId, user._id);

        io.to(payload.groupId).emit(SOCKET_EVENTS.MEMBER_ADDED, {
          groupId: payload.groupId,
          addedUserIds: [user._id.toString()],
          actorId: user._id.toString(),
          actorUserName: user.username,
        });
        io.to(user._id.toString()).emit(SOCKET_EVENTS.GROUP_CREATED, { group });

        if (typeof callback === "function") callback({ success: true, data: { group } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to join group.";
        logger.error(`GROUP_JOIN error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_SEND_MESSAGE, async (payload: { groupId: string; content: string; type?: string; mediaUrl?: string; mediaMeta?: { mimeType: string; size: number; filename: string } }, callback?: AckCallback) => {
      try {
        const { groupId, content, type, mediaUrl, mediaMeta } = payload;
        if (!groupId) return emitError("groupId is required.", callback);
        if (!content || !content.trim()) return emitError("Content cannot be empty.", callback);

        const message = await this._groupService.sendGroupMessage(groupId, user._id.toString(), content, {
          type,
          mediaUrl,
          mediaMeta,
        });
        io.to(groupId).emit(SOCKET_EVENTS.GROUP_NEW_MESSAGE, message);

        if (typeof callback === "function") callback({ success: true, data: { message } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to send group message.";
        logger.error(`GROUP_SEND_MESSAGE error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_CREATE, async (payload: CreateGroupPayload, callback?: AckCallback) => {
      try {
        const { name, description, participantIds, avatarUrl } = payload;
        if (!name?.trim()) return emitError("Group name is required.", callback);
        if (!Array.isArray(participantIds) || participantIds.length === 0)
          return emitError("At least one participant is required.", callback);

        const group = await this._groupService.createGroup(user._id, {
          name,
          description,
          participantIds,
          avatarUrl,
        });

        socket.join((group._id as Types.ObjectId).toString());

        group.members.forEach((m) => {
          io.to(m.user.toString()).emit(SOCKET_EVENTS.GROUP_CREATED, {
            group,
            actorId: user._id.toString(),
            actorUserName: user.username,
          });
        });

        logger.debug(`Group created: "${name}" by ${user.username}`);
        if (typeof callback === "function") callback({ success: true, data: { group } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create group.";
        logger.error(`GROUP_CREATE error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_UPDATE, async (payload: UpdateGroupPayload, callback?: AckCallback) => {
      try {
        const { groupId, ...dto } = payload;
        if (!groupId) return emitError("groupId is required.", callback);

        const group = await this._groupService.updateGroup(groupId, user._id, dto);

        io.to(groupId).emit(SOCKET_EVENTS.GROUP_UPDATED, {
          group,
          actorId: user._id.toString(),
          actorUserName: user.username,
        });

        logger.debug(`Group updated: ${groupId} by ${user.username}`);
        if (typeof callback === "function") callback({ success: true, data: { group } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update group.";
        logger.error(`GROUP_UPDATE error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_DELETE, async (payload: { groupId: string }, callback?: AckCallback) => {
      try {
        if (!payload?.groupId) return emitError("groupId is required.", callback);

        const group = await this._groupService.getGroup(payload.groupId, user._id);
        await this._groupService.deleteGroup(payload.groupId, user._id);

        group.members.forEach((m) => {
          io.to(m.user.toString()).emit(SOCKET_EVENTS.GROUP_DELETED, {
            groupId: payload.groupId,
            actorId: user._id.toString(),
            actorUserName: user.username,
          });
        });

        io.in(payload.groupId).socketsLeave(payload.groupId);

        logger.debug(`Group deleted: ${payload.groupId} by ${user.username}`);
        if (typeof callback === "function") callback({ success: true, data: { message: "Group deleted successfully" } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete group.";
        logger.error(`GROUP_DELETE error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_ADD_MEMBERS, async (payload: AddMembersPayload, callback?: AckCallback) => {
      try {
        const { groupId, userIds } = payload;
        if (!groupId) return emitError("groupId is required.", callback);
        if (!Array.isArray(userIds) || userIds.length === 0)
          return emitError("At least one userId is required.", callback);

        const group = await this._groupService.addMembers(groupId, user._id, userIds);

        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_ADDED, {
          groupId,
          addedUserIds: userIds,
          actorId: user._id.toString(),
          actorUserName: user.username,
        });

        userIds.forEach((uid) => {
          io.to(uid).emit(SOCKET_EVENTS.GROUP_CREATED, { group });
        });

        logger.debug(`Members added to ${groupId}: ${userIds.join(", ")}`);
        if (typeof callback === "function") callback({ success: true, data: { group } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to add members.";
        logger.error(`GROUP_ADD_MEMBERS error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_REMOVE_MEMBER, async (payload: RemoveMemberPayload, callback?: AckCallback) => {
      try {
        const { groupId, targetUserId } = payload;
        if (!groupId || !targetUserId) return emitError("groupId and targetUserId are required.", callback);

        const group = await this._groupService.removeMember(groupId, user._id, targetUserId);

        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_REMOVED, {
          groupId,
          targetUserId,
          actorId: user._id.toString(),
          actorUserName: user.username,
        });

        io.in(targetUserId).socketsLeave(groupId);

        logger.debug(`Member ${targetUserId} removed from ${groupId} by ${user.username}`);
        if (typeof callback === "function") callback({ success: true, data: { group } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to remove member.";
        logger.error(`GROUP_REMOVE_MEMBER error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_LEAVE, async (payload: LeaveGroupPayload, callback?: AckCallback) => {
      try {
        const { groupId } = payload;
        if (!groupId) return emitError("groupId is required.", callback);

        await this._groupService.leaveGroup(groupId, user._id);

        socket.to(groupId).emit(SOCKET_EVENTS.MEMBER_LEFT, {
          groupId,
          userId: user._id.toString(),
          userName: user.username,
        });

        socket.leave(groupId);

        logger.debug(`${user.username} left group ${groupId}`);
        if (typeof callback === "function") callback({ success: true, data: { message: "Left group successfully" } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to leave group.";
        logger.error(`GROUP_LEAVE error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_PROMOTE, async (payload: PromoteDemotePayload, callback?: AckCallback) => {
      try {
        const { groupId, targetUserId } = payload;
        if (!groupId || !targetUserId) return emitError("groupId and targetUserId are required.", callback);

        const group = await this._groupService.promoteMember(groupId, user._id, targetUserId);

        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_PROMOTED, {
          groupId,
          targetUserId,
          newRole: GROUP_ROLES.ADMIN,
          actorId: user._id.toString(),
          actorUserName: user.username,
        });

        logger.debug(`Member ${targetUserId} promoted in ${groupId}`);
        if (typeof callback === "function") callback({ success: true, data: { group } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to promote member.";
        logger.error(`GROUP_PROMOTE error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_DEMOTE, async (payload: PromoteDemotePayload, callback?: AckCallback) => {
      try {
        const { groupId, targetUserId } = payload;
        if (!groupId || !targetUserId) return emitError("groupId and targetUserId are required.", callback);

        const group = await this._groupService.demoteMember(groupId, user._id, targetUserId);

        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_DEMOTED, {
          groupId,
          targetUserId,
          newRole: GROUP_ROLES.MEMBER,
          actorId: user._id.toString(),
          actorUserName: user.username,
        });

        logger.debug(`Member ${targetUserId} demoted in ${groupId}`);
        if (typeof callback === "function") callback({ success: true, data: { group } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to demote member.";
        logger.error(`GROUP_DEMOTE error: ${message}`);
        emitError(message, callback);
      }
    });

    socket.on(SOCKET_EVENTS.GROUP_TRANSFER_OWNERSHIP, async (payload: TransferOwnershipPayload, callback?: AckCallback) => {
      try {
        const { groupId, newOwnerId } = payload;
        if (!groupId || !newOwnerId) return emitError("groupId and newOwnerId are required.", callback);

        const group = await this._groupService.transferOwnership(groupId, user._id, newOwnerId);

        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_PROMOTED, {
          groupId,
          targetUserId: newOwnerId,
          newRole: GROUP_ROLES.ADMIN,
          previousOwnerId: user._id.toString(),
          actorId: user._id.toString(),
          actorUserName: user.username,
          isOwnerTransfer: true,
        });

        logger.debug(`Ownership of ${groupId} transferred to ${newOwnerId}`);
        if (typeof callback === "function") callback({ success: true, data: { group } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to transfer ownership.";
        logger.error(`GROUP_TRANSFER_OWNERSHIP error: ${message}`);
        emitError(message, callback);
      }
    });
  }
}
