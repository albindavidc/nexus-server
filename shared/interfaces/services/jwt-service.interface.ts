import { Response } from "express";
import jwt from "jsonwebtoken";

export interface IJwtService {
  generateAccessToken(userId: string): string;
  generateRefreshToken(userId: string): string;
  verifyAccessToken(token: string): Promise<jwt.JwtPayload | string>;
  verifyRefreshToken(token: string): Promise<jwt.JwtPayload | string>;
  setCookies(res: Response, accessToken: string, refreshToken: string): void;
  clearCookies(res: Response): void;
}
