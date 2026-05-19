module.export = {
  DEFAULT_PAGE_SIZE: 30,
  MAX_PAGE_SIZE: 100,

  CONVERSATION_TYPE: Object.freeze({
    USER: "user",
    GROUP: "group",
    AI_COACH: "ai_coach",
  }),
  MESSAGE_TYPE: Object.freeze({
    TEXT: "text",
    IMAGE: "image",
    FILE: "file",
    STICKER: "sticker",
    EMOJI: "emoji",
  }),
  USER_STATUS: Object.freeze({
    ONLINE: "online",
    OFFLINE: "offline",
  }),

  SOCKET_EVENTS: Object.freeze({
    CONNECT: "connect",
    DISCONNECT: "disconnect",

    JOIN_CONVERSATION: "join_conversation",
    LEAVE_CONVERSATION: "leave_conversation",

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

    SOCKET_ERROR: "socket_error",
  }),
};
