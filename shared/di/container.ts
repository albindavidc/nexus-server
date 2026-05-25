import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "./tokens";

import { JwtService } from "../utils/jwt.util";
import AuthService from "../../modules/auth/auth.service";
import ChatRepository from "../../modules/chat/chat.repository";
import ChatService from "../../modules/chat/chat.service";
import { GroupRepository } from "../../modules/group/group.repository";
import { GroupService } from "../../modules/group/group.service";
import { ChatBotService } from "../../modules/chatbot/chatbot.service";
import { ChatBotRepository } from "../../modules/chatbot/chatbot.repository";

export function registerDependencies(): void {
  container.registerSingleton<JwtService>(TOKENS.JwtService, JwtService);
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
}
