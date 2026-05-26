import { Request, Response, NextFunction } from "express";
import Group from "../modules/group/group.model";
import { GROUP_ROLES } from "../shared/constants";
import { AuthenticatedRequest } from "./auth.middleware";
import { IConversationDocument } from "../shared/types/group.types";

export interface GroupRequest extends AuthenticatedRequest {
  group?: IConversationDocument;
}

export const requireGroupAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId, conversationId } = req.params;
    const targetId = groupId || conversationId;
    const groupReq = req as GroupRequest;
    const user = groupReq.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const userId = user._id.toString();

    const group = await Group.findById(targetId);

    if (!group || group.isDeleted) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    const member = group.members.find((m) => {
      const mUserId = m.user?._id || m.user?.id || m.user;
      return mUserId && mUserId.toString() === userId;
    });

    if (!member || member.role !== GROUP_ROLES.ADMIN) {
      res.status(403).json({
        message: "Only group admins can perform this action",
      });
      return;
    }

    // Attach to req for use in controller
    groupReq.group = group as unknown as IConversationDocument;
    next();
  } catch (err) {
    next(err);
  }
};
