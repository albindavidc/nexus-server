import "reflect-metadata";
import { container } from "tsyringe";
import { TOKENS } from "./tokens";

// Concrete implementations
import { JwtService } from "../utils/jwt.util";
import AuthService from "../../modules/auth/auth.service";
import ChatRepository from "../../modules/chat/chat.repository";
import ChatService from "../../modules/chat/chat.service";

/**
 * Registers all DI bindings.
 * Each token maps to a concrete singleton implementation.
 * Consumers depend on tokens/interfaces — never on this file directly (DIP).
 */
export function registerDependencies(): void {
  container.registerSingleton<JwtService>(TOKENS.IJwtService, JwtService);
  container.registerSingleton<AuthService>(TOKENS.IAuthService, AuthService);
  container.registerSingleton<ChatRepository>(TOKENS.IChatRepository, ChatRepository);
  container.registerSingleton<ChatService>(TOKENS.IChatService, ChatService);
}
