export const DEFAULT_PAGE_SIZE = 30;
export const MAX_PAGE_SIZE = 100;

export const CONVERSATION_TYPE = {
  DIRECT: "direct",   // 1-on-1 DM — shown in CHAT tab
  GROUP:  "group",    // Group chat — shown in GROUPS tab
  AI:     "ai",       // Nexus AI coach — shown in CHAT tab
} as const;
export type ConversationType =
  (typeof CONVERSATION_TYPE)[keyof typeof CONVERSATION_TYPE];

export const MESSAGE_TYPE = Object.freeze({
  TEXT: "text",
  IMAGE: "image",
  FILE: "file",
  STICKER: "sticker",
  EMOJI: "emoji",
});
export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];

export const USER_STATUS = Object.freeze({
  ONLINE: "online",
  OFFLINE: "offline",
});
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const GROUP_ROLES = {
  ADMIN:  "admin",
  MEMBER: "member",
} as const;
export type GroupRole = (typeof GROUP_ROLES)[keyof typeof GROUP_ROLES];

export const GROUP_PRIVACY = {
  PUBLIC:  "public",
  PRIVATE: "private",
} as const;
export type GroupPrivacy = (typeof GROUP_PRIVACY)[keyof typeof GROUP_PRIVACY];

export const SOCKET_EVENTS = Object.freeze({
  CONNECT: "connect",
  DISCONNECT: "disconnect",

  JOIN_CONVERSATION: "join_conversation",
  LEAVE_CONVERSATION: "leave_conversation",

  GET_MY_CONVERSATIONS: "get_my_conversations",
  GET_CONVERSATION_BY_ID: "get_conversation_by_id",
  START_DIRECT_CONVERSATION: "start_direct_conversation",
  CREATE_GROUP_CONVERSATION: "create_group_conversation",
  GET_MESSAGES: "get_messages",
  MARK_CONVERSATION_READ: "mark_conversation_read",
  DELETE_MESSAGE: "delete_message",
  CLEAR_CONVERSATION: "clear_conversation",

  SEND_MESSAGE: "send_message",
  NEW_MESSAGE: "new_message",
  MESSAGE_READ: "message_read",
  MESSAGE_DELETED: "message_deleted",

  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  USER_TYPING_START: "user_typing_start",
  USER_TYPING_STOP: "user_typing_stop",

  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",

  GROUP_GET_MY_GROUPS: "group:get_my_groups",
  GROUP_GET_BY_ID: "group:get_by_id",
  GROUP_SEARCH: "group:search",
  GROUP_GET_MESSAGES: "group:get_messages",
  GROUP_SEND_MESSAGE: "group:send_message",
  GROUP_NEW_MESSAGE: "group:new_message",

  GROUP_CREATE: "group:create",
  GROUP_UPDATE: "group:update",
  GROUP_DELETE: "group:delete",
  GROUP_ADD_MEMBERS: "group:add_members",
  GROUP_REMOVE_MEMBER: "group:remove_member",
  GROUP_LEAVE: "group:leave",
  GROUP_PROMOTE: "group:promote",
  GROUP_DEMOTE: "group:demote",
  GROUP_TRANSFER_OWNERSHIP: "group:transfer_ownership",
  GROUP_JOIN: "group:join",

  GROUP_CREATED: "group_created",
  GROUP_UPDATED: "group_updated",
  GROUP_DELETED: "group_deleted",
  MEMBER_ADDED: "member_added",
  MEMBER_REMOVED: "member_removed",
  MEMBER_LEFT: "member_left",
  MEMBER_PROMOTED: "member_promoted",
  MEMBER_DEMOTED: "member_demoted",

  BOT_MESSAGE: "bot_message",
  BOT_TYPING: "bot_typing",
  BOT_CHUNK: "bot_chunk",
  BOT_DONE: "bot_done",
  BOT_ERROR: "bot_error",

  GET_BOT_HISTORY: "get_bot_history",
  CLEAR_BOT_HISTORY: "clear_bot_history",
  BOT_BULK_MESSAGE: "bot_bulk_message",
  BOT_CHAT_DIRECT: "bot_chat_direct",

  SOCKET_ERROR: "socket_error",
});

export const BOT_USER_ID = "nexus-coach-bot";
export const BOT_USER_NAME = "Nexus Coach";
export const BOT_AVATAR = "/assets/images/bot.svg";

export type SocketEvents = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
