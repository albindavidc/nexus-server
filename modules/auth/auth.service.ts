import { injectable, inject } from "tsyringe";
import { Response, Request } from "express";
import User from "./auth.model";
import { IAuthService, RegisterUserDto, LoginDto } from "../../shared/interfaces/IAuthService";
import { IUser } from "./auth.model";
import jwt from "jsonwebtoken";
import { IJwtService } from "../../shared/interfaces/IJwtService";
import { TOKENS } from "../../shared/di/tokens";

@injectable()
export default class AuthService implements IAuthService {
  constructor(@inject(TOKENS.IJwtService) private jwtService: IJwtService) {}

  async registerUser(res: Response, { firstName, lastName, username, email, password }: RegisterUserDto): Promise<IUser | Response> {
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      return res.status(400).json({
        success: false,
        message: `User already exists with this ${field}`,
      });
    }

    const user = await User.create({ firstName, lastName, username, email, password });

    const accessToken = this.jwtService.generateAccessToken(String(user._id));
    const refreshToken = this.jwtService.generateRefreshToken(String(user._id));

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    this.jwtService.setCookies(res, accessToken, refreshToken);

    return user;
  }

  async login(res: Response, { email, password }: LoginDto): Promise<IUser | Response> {
    const user = await User.findOne({ email }).select("+password");

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
    await user.save({ validateBeforeSave: false });

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
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newAccessToken = this.jwtService.generateAccessToken(String(user._id));
    const newRefreshToken = this.jwtService.generateRefreshToken(String(user._id));

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    this.jwtService.setCookies(res, newAccessToken, newRefreshToken);

    return user;
  }

  async logout(res: Response, userId: string): Promise<boolean> {
    await User.findByIdAndUpdate(userId, {
      refreshToken: null,
      status: "inactive",
    });

    this.jwtService.clearCookies(res);
    return true;
  }

  async getCurrentUser(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }
}
