import { injectable, inject } from "tsyringe";
import { Response, Request } from "express";
import {
  IAuthService,
  RegisterUserDto,
  LoginDto,
} from "../../shared/interfaces/services/auth-service.interface";
import { IAuthRepository } from "../../shared/interfaces/repository/auth-repository.interface";
import { IUser } from "./auth.model";
import jwt from "jsonwebtoken";
import { JwtService } from "../../shared/utils/jwt.util";
import { TOKENS } from "../../shared/di/tokens";

@injectable()
export default class AuthService implements IAuthService {
  constructor(
    @inject(TOKENS.JwtService) private jwtService: JwtService,
    @inject(TOKENS.AuthRepository) private authRepo: IAuthRepository,
  ) {}

  async registerUser(
    res: Response,
    { firstName, lastName, username, email, password }: RegisterUserDto,
  ): Promise<IUser | Response> {
    const existingUser = await this.authRepo.findByUsernameOrEmail(
      username,
      email,
    );

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      return res.status(400).json({
        success: false,
        message: `User already exists with this ${field}`,
      });
    }

    const user = await this.authRepo.createUser({
      firstName,
      lastName,
      username,
      email,
      password,
    });

    const accessToken = this.jwtService.generateAccessToken(String(user._id));
    const refreshToken = this.jwtService.generateRefreshToken(String(user._id));

    user.refreshToken = refreshToken;
    await this.authRepo.saveUser(user);

    this.jwtService.setCookies(res, accessToken, refreshToken);

    return user;
  }

  async login(
    res: Response,
    { email, password }: LoginDto,
  ): Promise<IUser | Response> {
    const user = await this.authRepo.findByEmailWithPassword(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const accessToken = this.jwtService.generateAccessToken(String(user._id));
    const refreshToken = this.jwtService.generateRefreshToken(String(user._id));

    user.refreshToken = refreshToken;
    await this.authRepo.saveUser(user);

    this.jwtService.setCookies(res, accessToken, refreshToken);

    return user;
  }

  async refreshToken(res: Response, req: Request): Promise<IUser | Response> {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      return res.status(404).json({
        success: false,
        message: "Refresh token not found",
      });
    }

    let decoded: jwt.JwtPayload | string;
    try {
      decoded = await this.jwtService.verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const userId = typeof decoded === "string" ? decoded : decoded.userId;
    const user = await this.authRepo.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newAccessToken = this.jwtService.generateAccessToken(
      String(user._id),
    );
    const newRefreshToken = this.jwtService.generateRefreshToken(
      String(user._id),
    );

    user.refreshToken = newRefreshToken;
    await this.authRepo.saveUser(user);

    this.jwtService.setCookies(res, newAccessToken, newRefreshToken);

    return user;
  }

  async logout(res: Response, userId: string): Promise<boolean> {
    await this.authRepo.updateUser(userId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      refreshToken: null as any,
      status: "inactive",
    });

    this.jwtService.clearCookies(res);
    return true;
  }

  async getCurrentUser(userId: string): Promise<IUser | null> {
    return this.authRepo.findById(userId);
  }

  async searchUsers(query: string, excludeUserId: string): Promise<IUser[]> {
    return this.authRepo.searchUsers(query, excludeUserId);
  }
}
