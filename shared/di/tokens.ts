export const TOKENS = {
  IJwtService: "IJwtService",
  IAuthService: "IAuthService",
  IChatRepository: "IChatRepository",
  IChatService: "IChatService",
} as const;

export type TokenKeys = keyof typeof TOKENS;
