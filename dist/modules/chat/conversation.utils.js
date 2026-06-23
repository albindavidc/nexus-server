"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGroupAdmin = exports.getUserRoleInConversation = void 0;
const constants_1 = require("../../shared/constants");
/**
 * Returns the role of a user in a conversation.
 * Returns null if not a member.
 */
const getUserRoleInConversation = (conversation, userId) => {
    if (conversation.type !== constants_1.CONVERSATION_TYPE.GROUP)
        return null;
    const member = conversation.members.find((m) => m.user.toString() === userId);
    return member?.role ?? null;
};
exports.getUserRoleInConversation = getUserRoleInConversation;
const isGroupAdmin = (conversation, userId) => (0, exports.getUserRoleInConversation)(conversation, userId) === constants_1.GROUP_ROLES.ADMIN;
exports.isGroupAdmin = isGroupAdmin;
