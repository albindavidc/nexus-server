import { Response, Request } from "express";

/**
 * Contract for JWT token management and cookie operations.
 * Follows Interface Segregation Principle — only token-related responsibilities.
 */
export interface IJwtService {
  generateAccessToken(userId: string): string;
  generateRefreshToken(userId: string): string;
  verifyAccessToken(token: string): Promise<any>;
  verifyRefreshToken(token: string): Promise<any>;
  setCookies(res: Response, accessToken: string, refreshToken: string): void;
  clearCookies(res: Response): void;
}
