import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "./tokens";

import { JwtService } from "../utils/jwt.util";
import AuthService from "../../modules/auth/auth.service";
import AuthRepository from "../../modules/auth/auth.repository";
import ChatRepository from "../../modules/chat/chat.repository";
import ChatService from "../../modules/chat/chat.service";
import { GroupRepository } from "../../modules/group/group.repository";
import { GroupService } from "../../modules/group/group.service";
import { ChatBotService } from "../../modules/chatbot/chatbot.service";
import { ChatBotRepository } from "../../modules/chatbot/chatbot.repository";
import { EventEmitter } from "events";
import { PushNotificationRepository } from "../../modules/push-notification/notification-repository";
import { PushNotificationService } from "../../modules/push-notification/notification.services";
import { NotificationRepository } from "../../modules/notification/notification.repository";
import { NotificationService } from "../../modules/notification/notification.service";
import { ChatEvent } from "../../modules/chat/chat.event";
import { GroupEvent } from "../../modules/group/group.event";

export function registerDependencies(): void {
  container.registerSingleton<JwtService>(TOKENS.JwtService, JwtService);
  container.registerSingleton<AuthRepository>(
    TOKENS.AuthRepository,
    AuthRepository,
  );
  container.registerSingleton<AuthService>(TOKENS.AuthService, AuthService);
  container.registerSingleton<ChatRepository>(
    TOKENS.ChatRepository,
    ChatRepository,
  );
  container.registerSingleton<ChatService>(TOKENS.ChatService, ChatService);
  container.registerSingleton<GroupRepository>(
    TOKENS.GroupRepository,
    GroupRepository,
  );
  container.registerSingleton<GroupService>(TOKENS.GroupService, GroupService);

  container.registerSingleton<ChatBotService>(
    TOKENS.ChatBotService,
    ChatBotService,
  );
  container.registerSingleton<ChatBotRepository>(
    TOKENS.ChatBotRepository,
    ChatBotRepository,
  );
  
  container.registerInstance(TOKENS.EventEmitter, new EventEmitter());

  container.registerSingleton<PushNotificationRepository>(
    TOKENS.PushNotificationRepository,
    PushNotificationRepository,
  );
  container.registerSingleton<PushNotificationService>(
    TOKENS.PushNotificationService,
    PushNotificationService,
  );

  container.registerSingleton<NotificationRepository>(
    TOKENS.NotificationRepository,
    NotificationRepository,
  );
  container.registerSingleton<NotificationService>(
    TOKENS.NotificationService,
    NotificationService,
  );

  // Instantiate Events to attach listeners
  const chatEvent = container.resolve(ChatEvent);
  chatEvent.handleMessageSent();

  const groupEvent = container.resolve(GroupEvent);
  groupEvent.handleGroupCreated();
}
