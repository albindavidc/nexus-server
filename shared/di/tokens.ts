/**
 * Central DI token registry.
 *
 * Using string tokens (InjectionToken pattern) keeps modules decoupled:
 * - High-level modules import ONLY the token and the interface.
 * - They never import the concrete implementation, satisfying DIP fully.
 */
export const TOKENS = {
  IJwtService: "IJwtService",
  IAuthService: "IAuthService",
  IChatRepository: "IChatRepository",
  IChatService: "IChatService",
} as const;

export type TokenKeys = keyof typeof TOKENS;
