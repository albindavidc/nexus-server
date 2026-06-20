export const TOKENS = {
  JwtService: Symbol.for("JwtService"),

  AuthService: Symbol.for("AuthService"),
  AuthRepository: Symbol.for("AuthRepository"),

  ChatRepository: Symbol.for("ChatRepository"),
  ChatService: Symbol.for("ChatService"),

  GroupRepository: Symbol.for("GroupRepository"),
  GroupService: Symbol.for("GroupService"),

  ChatBotRepository: Symbol.for("ChatBotRepository"),
  ChatBotService: Symbol.for("ChatBotService"),

  EventEmitter: Symbol.for("EventEmitter"),
  PushNotificationRepository: Symbol.for("PushNotificationRepository"),
  PushNotificationService: Symbol.for("PushNotificationService"),
} as const;
