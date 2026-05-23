import { NextFunction, Request, Response } from "express";
import { Server } from "socket.io";
import { Types } from "mongoose";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../shared/di/tokens";
import { IGroupService } from "../../shared/interfaces/IGroupService";
import { sendSuccess } from "../../shared/utils/response";
import { IGroupMember } from "../../shared/types/group.types";
import { SOCKET_EVENTS } from "../../shared/constants";

interface AuthRequest extends Request {
  user: { _id: Types.ObjectId; userName: string };
}

@injectable()
export class GroupController {
  constructor(
    @inject(TOKENS.GroupService)
    private readonly groupService: IGroupService,
  ) {}

  getMyGroups = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id } = (req as AuthRequest).user;
      const groups = await this.groupService.getMyGroups(_id);
      sendSuccess(res, 200, "Groups fetched successfully", { groups });
    } catch (err) {
      next(err);
    }
  };

  getGroup = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id } = (req as AuthRequest).user;
      const groupId = req.params["groupId"] as string;
      const group = await this.groupService.getGroup(groupId, _id);
      sendSuccess(res, 200, "Group fetched successfully", { group });
    } catch (err) {
      next(err);
    }
  };

  createGroup = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id, userName } = (req as AuthRequest).user;
      const group = await this.groupService.createGroup(_id, req.body);

      const io: Server = req.app.get("io");
      if (io) {
        group.members.forEach((member: IGroupMember) => {
          io.to(member.user.toString()).emit(SOCKET_EVENTS.GROUP_CREATED, {
            group,
            actorId: _id.toString(),
            actorUserName: userName,
          });
        });
      }

      sendSuccess(res, 201, "Group created successfully", { group });
    } catch (err) {
      next(err);
    }
  };

  updateGroup = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id, userName } = (req as AuthRequest).user;
      const groupId = req.params["groupId"] as string;
      const group = await this.groupService.updateGroup(groupId, _id, req.body);

      const io: Server = req.app.get("io");
      if (io) {
        io.to(groupId).emit(SOCKET_EVENTS.GROUP_UPDATED, {
          group,
          actorId: _id.toString(),
          actorUserName: userName,
        });
      }

      sendSuccess(res, 200, "Group updated successfully", { group });
    } catch (err) {
      next(err);
    }
  };

  deleteGroup = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id, userName } = (req as AuthRequest).user;
      const groupId = req.params["groupId"] as string;

      const group = await this.groupService.getGroup(groupId, _id);
      await this.groupService.deleteGroup(groupId, _id);

      const io: Server = req.app.get("io");
      if (io) {
        group.members.forEach((member: IGroupMember) => {
          io.to(member.user.toString()).emit(SOCKET_EVENTS.GROUP_DELETED, {
            groupId,
            actorId: _id.toString(),
            actorUserName: userName,
          });
        });
        io.in(groupId).socketsLeave(groupId);
      }

      sendSuccess(res, 200, "Group deleted successfully");
    } catch (err) {
      next(err);
    }
  };

  addMembers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id, userName } = (req as AuthRequest).user;
      const groupId = req.params["groupId"] as string;
      const { userIds } = req.body as { userIds: string[] };

      const group = await this.groupService.addMembers(groupId, _id, userIds);

      const io: Server = req.app.get("io");
      if (io) {
        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_ADDED, {
          groupId,
          addedUserIds: userIds,
          actorId: _id.toString(),
          actorUserName: userName,
        });
        userIds.forEach((uid) => {
          io.to(uid).emit(SOCKET_EVENTS.GROUP_CREATED, { group });
        });
      }

      sendSuccess(res, 200, "Members added successfully", { group });
    } catch (err) {
      next(err);
    }
  };

  removeMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id, userName } = (req as AuthRequest).user;
      const groupId = req.params["groupId"] as string;
      const userId = req.params["userId"] as string;

      const group = await this.groupService.removeMember(groupId, _id, userId);

      const io: Server = req.app.get("io");
      if (io) {
        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_REMOVED, {
          groupId,
          targetUserId: userId,
          actorId: _id.toString(),
          actorUserName: userName,
        });
        io.in(userId).socketsLeave(groupId);
      }

      sendSuccess(res, 200, "Member removed successfully", { group });
    } catch (err) {
      next(err);
    }
  };

  leaveGroup = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id, userName } = (req as AuthRequest).user;
      const groupId = req.params["groupId"] as string;

      await this.groupService.leaveGroup(groupId, _id);

      const io: Server = req.app.get("io");
      if (io) {
        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_LEFT, {
          groupId,
          userId: _id.toString(),
          userName,
        });
      }

      sendSuccess(res, 200, "You have left the group successfully");
    } catch (err) {
      next(err);
    }
  };

  promoteMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id, userName } = (req as AuthRequest).user;
      const groupId = req.params["groupId"] as string;
      const userId = req.params["userId"] as string;

      const group = await this.groupService.promoteMember(groupId, _id, userId);

      const io: Server = req.app.get("io");
      if (io) {
        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_PROMOTED, {
          groupId,
          targetUserId: userId,
          actorId: _id.toString(),
          actorUserName: userName,
        });
      }

      sendSuccess(res, 200, "Member promoted to admin successfully", { group });
    } catch (err) {
      next(err);
    }
  };

  demoteMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id, userName } = (req as AuthRequest).user;
      const groupId = req.params["groupId"] as string;
      const userId = req.params["userId"] as string;

      const group = await this.groupService.demoteMember(groupId, _id, userId);

      const io: Server = req.app.get("io");
      if (io) {
        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_DEMOTED, {
          groupId,
          targetUserId: userId,
          actorId: _id.toString(),
          actorUserName: userName,
        });
      }

      sendSuccess(res, 200, "Admin demoted to member successfully", { group });
    } catch (err) {
      next(err);
    }
  };

  transferOwnership = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { _id, userName } = (req as AuthRequest).user;
      const groupId = req.params["groupId"] as string;
      const { newOwnerId } = req.body as { newOwnerId: string };

      const group = await this.groupService.transferOwnership(
        groupId,
        _id,
        newOwnerId,
      );

      const io: Server = req.app.get("io");
      if (io) {
        io.to(groupId).emit(SOCKET_EVENTS.MEMBER_PROMOTED, {
          groupId,
          targetUserId: newOwnerId,
          actorId: _id.toString(),
          actorUserName: userName,
          isOwnerTransfer: true,
        });
      }

      sendSuccess(res, 200, "Ownership transferred successfully", { group });
    } catch (err) {
      next(err);
    }
  };
}
