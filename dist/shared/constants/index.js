"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_AVATAR = exports.BOT_USER_NAME = exports.BOT_USER_ID = exports.SOCKET_EVENTS = exports.GROUP_PRIVACY = exports.GROUP_ROLES = exports.USER_STATUS = exports.MESSAGE_TYPE = exports.CONVERSATION_TYPE = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = void 0;
exports.DEFAULT_PAGE_SIZE = 30;
exports.MAX_PAGE_SIZE = 100;
exports.CONVERSATION_TYPE = {
    DIRECT: "direct", // 1-on-1 DM — shown in CHAT tab
    GROUP: "group", // Group chat — shown in GROUPS tab
    AI: "ai", // Nexus AI coach — shown in CHAT tab
};
exports.MESSAGE_TYPE = Object.freeze({
    TEXT: "text",
    IMAGE: "image",
    FILE: "file",
    STICKER: "sticker",
    EMOJI: "emoji",
});
exports.USER_STATUS = Object.freeze({
    ONLINE: "online",
    OFFLINE: "offline",
});
exports.GROUP_ROLES = {
    ADMIN: "admin",
    MEMBER: "member",
};
exports.GROUP_PRIVACY = {
    PUBLIC: "public",
    PRIVATE: "private",
};
exports.SOCKET_EVENTS = Object.freeze({
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
exports.BOT_USER_ID = "nexus-coach-bot";
exports.BOT_USER_NAME = "Nexus Coach";
exports.BOT_AVATAR = "/assets/images/bot.svg";
