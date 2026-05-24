import { Server, Socket } from "socket.io";
import { container } from "tsyringe";
import { TOKENS } from "../../shared/di/tokens";
import { IGroupService } from "../../shared/interfaces/services/group-service.interface";
import { SOCKET_EVENTS, GROUP_ROLES } from "../../shared/constants";
import logger from "../../shared/utils/logger";
import { Types } from "mongoose";

interface AuthSocket extends Socket {
  user: { _id: Types.ObjectId; userName: string };
}

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

const emitError = (socket: AuthSocket, message: string): void => {
  socket.emit(SOCKET_EVENTS.SOCKET_ERROR, { message });
};

export const registerGroupHandlers = (socket: AuthSocket, io: Server): void => {
  const groupService = container.resolve<IGroupService>(
    TOKENS.GroupService as unknown as new () => IGroupService,
  );

  socket.on("group:create", async (payload: CreateGroupPayload) => {
    try {
      const { name, description, participantIds, avatarUrl } = payload;
      if (!name?.trim()) return emitError(socket, "Group name is required.");
      if (!Array.isArray(participantIds) || participantIds.length === 0)
        return emitError(socket, "At least one participant is required.");

      const group = await groupService.createGroup(socket.user._id, {
        name,
        description,
        participantIds,
        avatarUrl,
      });

      socket.join((group._id as Types.ObjectId).toString());

      group.members.forEach((m) => {
        io.to(m.user.toString()).emit(SOCKET_EVENTS.GROUP_CREATED, {
          group,
          actorId: socket.user._id,
          actorUserName: socket.user.userName,
        });
      });

      logger.debug(`Group created: "${name}" by ${socket.user.userName}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create group.";
      logger.error(`group:create error: ${message}`);
      emitError(socket, message);
    }
  });

  socket.on("group:update", async (payload: UpdateGroupPayload) => {
    try {
      const { groupId, ...dto } = payload;
      if (!groupId) return emitError(socket, "groupId is required.");

      const group = await groupService.updateGroup(
        groupId,
        socket.user._id,
        dto,
      );

      io.to(groupId).emit(SOCKET_EVENTS.GROUP_UPDATED, {
        group,
        actorId: socket.user._id,
        actorUserName: socket.user.userName,
      });

      logger.debug(`Group updated: ${groupId} by ${socket.user.userName}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update group.";
      logger.error(`group:update error: ${message}`);
      emitError(socket, message);
    }
  });

  socket.on("group:delete", async ({ groupId }: { groupId: string }) => {
    try {
      if (!groupId) return emitError(socket, "groupId is required.");

      const group = await groupService.getGroup(groupId, socket.user._id);
      await groupService.deleteGroup(groupId, socket.user._id);

      group.members.forEach((m) => {
        io.to(m.user.toString()).emit(SOCKET_EVENTS.GROUP_DELETED, {
          groupId,
          actorId: socket.user._id,
          actorUserName: socket.user.userName,
        });
      });

      io.in(groupId).socketsLeave(groupId);

      logger.debug(`Group deleted: ${groupId} by ${socket.user.userName}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete group.";
      logger.error(`group:delete error: ${message}`);
      emitError(socket, message);
    }
  });

  socket.on("group:add_members", async (payload: AddMembersPayload) => {
    try {
      const { groupId, userIds } = payload;
      if (!groupId) return emitError(socket, "groupId is required.");
      if (!Array.isArray(userIds) || userIds.length === 0)
        return emitError(socket, "At least one userId is required.");

      const group = await groupService.addMembers(
        groupId,
        socket.user._id,
        userIds,
      );

      io.to(groupId).emit(SOCKET_EVENTS.MEMBER_ADDED, {
        groupId,
        addedUserIds: userIds,
        actorId: socket.user._id,
        actorUserName: socket.user.userName,
      });

      userIds.forEach((uid) => {
        io.to(uid).emit(SOCKET_EVENTS.GROUP_CREATED, { group });
      });

      logger.debug(`Members added to ${groupId}: ${userIds.join(", ")}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to add members.";
      logger.error(`group:add_members error: ${message}`);
      emitError(socket, message);
    }
  });

  socket.on("group:remove_member", async (payload: RemoveMemberPayload) => {
    try {
      const { groupId, targetUserId } = payload;
      if (!groupId || !targetUserId)
        return emitError(socket, "groupId and targetUserId are required.");

      await groupService.removeMember(groupId, socket.user._id, targetUserId);

      io.to(groupId).emit(SOCKET_EVENTS.MEMBER_REMOVED, {
        groupId,
        targetUserId,
        actorId: socket.user._id,
        actorUserName: socket.user.userName,
      });

      io.in(targetUserId).socketsLeave(groupId);

      logger.debug(
        `Member ${targetUserId} removed from ${groupId} by ${socket.user.userName}`,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove member.";
      logger.error(`group:remove_member error: ${message}`);
      emitError(socket, message);
    }
  });

  socket.on("group:leave", async (payload: LeaveGroupPayload) => {
    try {
      const { groupId } = payload;
      if (!groupId) return emitError(socket, "groupId is required.");

      await groupService.leaveGroup(groupId, socket.user._id);

      socket.to(groupId).emit(SOCKET_EVENTS.MEMBER_LEFT, {
        groupId,
        userId: socket.user._id,
        userName: socket.user.userName,
      });

      socket.leave(groupId);

      logger.debug(`${socket.user.userName} left group ${groupId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to leave group.";
      logger.error(`group:leave error: ${message}`);
      emitError(socket, message);
    }
  });

  socket.on("group:promote", async (payload: PromoteDemotePayload) => {
    try {
      const { groupId, targetUserId } = payload;
      if (!groupId || !targetUserId)
        return emitError(socket, "groupId and targetUserId are required.");

      await groupService.promoteMember(groupId, socket.user._id, targetUserId);

      io.to(groupId).emit(SOCKET_EVENTS.MEMBER_PROMOTED, {
        groupId,
        targetUserId,
        newRole: GROUP_ROLES.ADMIN,
        actorId: socket.user._id,
        actorUserName: socket.user.userName,
      });

      logger.debug(`Member ${targetUserId} promoted in ${groupId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to promote member.";
      logger.error(`group:promote error: ${message}`);
      emitError(socket, message);
    }
  });

  socket.on("group:demote", async (payload: PromoteDemotePayload) => {
    try {
      const { groupId, targetUserId } = payload;
      if (!groupId || !targetUserId)
        return emitError(socket, "groupId and targetUserId are required.");

      await groupService.demoteMember(groupId, socket.user._id, targetUserId);

      io.to(groupId).emit(SOCKET_EVENTS.MEMBER_DEMOTED, {
        groupId,
        targetUserId,
        newRole: GROUP_ROLES.MEMBER,
        actorId: socket.user._id,
        actorUserName: socket.user.userName,
      });

      logger.debug(`Member ${targetUserId} demoted in ${groupId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to demote member.";
      logger.error(`group:demote error: ${message}`);
      emitError(socket, message);
    }
  });

  socket.on(
    "group:transfer_ownership",
    async (payload: TransferOwnershipPayload) => {
      try {
        const { groupId, newOwnerId } = payload;
        if (!groupId || !newOwnerId)
          return emitError(socket, "groupId and newOwnerId are required.");

        await groupService.transferOwnership(
          groupId,
          socket.user._id,
          newOwnerId,
        );

        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_PROMOTED, {
          groupId,
          targetUserId: newOwnerId,
          newRole: GROUP_ROLES.OWNER,
          previousOwnerId: socket.user._id,
          actorId: socket.user._id,
          actorUserName: socket.user.userName,
          isOwnerTransfer: true,
        });

        logger.debug(`Ownership of ${groupId} transferred to ${newOwnerId}`);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to transfer ownership.";
        logger.error(`group:transfer_ownership error: ${message}`);
        emitError(socket, message);
      }
    },
  );
};
