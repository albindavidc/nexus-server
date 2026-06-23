"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireGroupAdmin = void 0;
const group_model_1 = __importDefault(require("../modules/group/group.model"));
const constants_1 = require("../shared/constants");
const requireGroupAdmin = async (req, res, next) => {
    try {
        const { groupId, conversationId } = req.params;
        const targetId = groupId || conversationId;
        const groupReq = req;
        const user = groupReq.user;
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const userId = user._id.toString();
        const group = await group_model_1.default.findById(targetId);
        if (!group || group.isDeleted) {
            res.status(404).json({ message: "Group not found" });
            return;
        }
        const member = group.members.find((m) => {
            const mUserId = m.user?._id || m.user?.id || m.user;
            return mUserId && mUserId.toString() === userId;
        });
        if (!member || member.role !== constants_1.GROUP_ROLES.ADMIN) {
            res.status(403).json({
                message: "Only group admins can perform this action",
            });
            return;
        }
        // Attach to req for use in controller
        groupReq.group = group;
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.requireGroupAdmin = requireGroupAdmin;
