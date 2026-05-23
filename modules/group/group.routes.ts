import { Router } from "express";
import { container } from "tsyringe";
import { GroupController } from "./group.controller";
import { protect } from "../../middlewares/auth.middleware";
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

router.use(protect);

router.get("/", ctrl.getMyGroups);
router.post("/", createGroupValidator, ctrl.createGroup);
router.get("/:groupId", groupIdParam, ctrl.getGroup);
router.patch("/:groupId", [...groupIdParam.slice(0, -1), ...updateGroupValidator], ctrl.updateGroup);
router.delete("/:groupId", groupIdParam, ctrl.deleteGroup);

router.post("/:groupId/members", [...groupIdParam.slice(0, -1), ...addMembersValidator], ctrl.addMembers);
router.delete("/:groupId/members/:userId", [...groupIdParam.slice(0, -1), ...userIdParam], ctrl.removeMember);
router.delete("/:groupId/leave", groupIdParam, ctrl.leaveGroup);
router.patch("/:groupId/members/:userId/promote", [...groupIdParam.slice(0, -1), ...userIdParam], ctrl.promoteMember);
router.patch("/:groupId/members/:userId/demote", [...groupIdParam.slice(0, -1), ...userIdParam], ctrl.demoteMember);
router.patch("/:groupId/transfer-ownership", [...groupIdParam.slice(0, -1), ...transferOwnershipValidator], ctrl.transferOwnership);

export default router;
