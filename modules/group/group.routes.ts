import { Router } from "express";
import { container } from "tsyringe";
import { GroupController } from "./group.controller";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import { requireGroupAdmin } from "../../middlewares/groupAdmin.middleware";
import {
  createGroupValidator,
  updateGroupValidator,
  addMembersValidator,
  transferOwnershipValidator,
  groupIdParam,
  userIdParam,
} from "./group.validator";

const router = Router();
const ctrl = container.resolve<GroupController>(GroupController);
const authMiddleware = container.resolve(AuthMiddleware);

router.use(authMiddleware.protect);

router.get("/", ctrl.getMyGroups);
router.post("/", createGroupValidator, ctrl.createGroup);
router.get("/search", ctrl.searchGroups);
router.get("/:groupId", groupIdParam, ctrl.getGroup);
router.post("/:groupId/join", groupIdParam, ctrl.joinGroup);
router.patch(
  "/:groupId",
  [...groupIdParam.slice(0, -1), ...updateGroupValidator, requireGroupAdmin],
  ctrl.updateGroup,
);
router.delete("/:groupId", [...groupIdParam, requireGroupAdmin], ctrl.deleteGroup);

router.post(
  "/:groupId/members",
  [...groupIdParam.slice(0, -1), ...addMembersValidator],
  ctrl.addMembers,
);
router.delete(
  "/:groupId/members/:userId",
  [...groupIdParam.slice(0, -1), ...userIdParam],
  ctrl.removeMember,
);
router.delete("/:groupId/leave", groupIdParam, ctrl.leaveGroup);
router.patch(
  "/:groupId/members/:userId/promote",
  [...groupIdParam.slice(0, -1), ...userIdParam],
  ctrl.promoteMember,
);
router.patch(
  "/:groupId/members/:userId/demote",
  [...groupIdParam.slice(0, -1), ...userIdParam],
  ctrl.demoteMember,
);
router.patch(
  "/:groupId/transfer-ownership",
  [...groupIdParam.slice(0, -1), ...transferOwnershipValidator],
  ctrl.transferOwnership,
);

// ─── Messages ─────────────────────────────────────────────
router.get("/:groupId/messages", groupIdParam, ctrl.getGroupMessages);
router.post("/:groupId/messages", groupIdParam, ctrl.sendGroupMessage);

export default router;
