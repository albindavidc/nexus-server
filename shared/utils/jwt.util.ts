import jwt from "jsonwebtoken";
import { Response } from "express";
import { injectable } from "tsyringe";
import { IJwtService } from "../interfaces/IJwtService";

/**
 * JwtService — Single Responsibility: token generation, verification, and cookie management.
 * Implements IJwtService to satisfy Dependency Inversion Principle.
 */
@injectable()
export class JwtService implements IJwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  private readonly ACCESS_COOKIE_NAME = "access_token";
  private readonly REFRESH_COOKIE_NAME = "refresh_token";
  private readonly ACCESS_MAX_AGE_MS = 20 * 60 * 1000;          // 20 minutes
  private readonly REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_TOKEN as string;
    this.refreshSecret = process.env.JWT_REFRESH_TOKEN as string;
    this.accessExpiresIn = (process.env.JWT_ACCESS_TOKEN_EXPIRES_IN as string) || "15m";
    this.refreshExpiresIn = (process.env.JWT_REFRESH_TOKEN_EXPIRES_IN as string) || "7d";
  }

  generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, this.accessSecret, {
      expiresIn: this.accessExpiresIn as any,
    });
  }

  generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn as any,
    });
  }

  async verifyAccessToken(token: string): Promise<any> {
    return jwt.verify(token, this.accessSecret);
  }

  async verifyRefreshToken(token: string): Promise<any> {
    return jwt.verify(token, this.refreshSecret);
  }

  setCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie(this.ACCESS_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: this.ACCESS_MAX_AGE_MS,
      path: "/",
    });

    res.cookie(this.REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: this.REFRESH_MAX_AGE_MS,
      path: "/",
    });
  }

  clearCookies(res: Response): void {
    res.clearCookie(this.ACCESS_COOKIE_NAME, { path: "/" });
    res.clearCookie(this.REFRESH_COOKIE_NAME, { path: "/" });
  }
}
