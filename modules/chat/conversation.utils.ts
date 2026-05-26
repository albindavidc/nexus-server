import { IConversation } from "../../shared/types/group.types";
import { CONVERSATION_TYPE, GROUP_ROLES } from "../../shared/constants";

/**
 * Returns the role of a user in a conversation.
 * Returns null if not a member.
 */
export const getUserRoleInConversation = (
  conversation: IConversation,
  userId: string
): string | null => {
  if (conversation.type !== CONVERSATION_TYPE.GROUP) return null;

  const member = conversation.members.find(
    (m) => m.user.toString() === userId
  );
  return member?.role ?? null;
};

export const isGroupAdmin = (
  conversation: IConversation,
  userId: string
): boolean => getUserRoleInConversation(conversation, userId) === GROUP_ROLES.ADMIN;
