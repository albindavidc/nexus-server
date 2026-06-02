import { injectable, inject } from "tsyringe";
import { Response, Request } from "express";
import crypto from "crypto";
import {
  IAuthService,
  RegisterUserDto,
  LoginDto,
} from "../../shared/interfaces/services/auth-service.interface";
import { IAuthRepository } from "../../shared/interfaces/repository/auth-repository.interface";
import { IUser } from "./auth.model";
import Otp from "./otp.model";
import jwt from "jsonwebtoken";
import { JwtService } from "../../shared/utils/jwt.util";
import { sendOtpEmail } from "../../shared/utils/email.util";
import { TOKENS } from "../../shared/di/tokens";

@injectable()
export default class AuthService implements IAuthService {
  constructor(
    @inject(TOKENS.JwtService) private _jwtService: JwtService,
    @inject(TOKENS.AuthRepository) private _authRepo: IAuthRepository,
  ) {}

  async registerUser(
    res: Response,
    { firstName, lastName, username, email, password }: RegisterUserDto,
  ): Promise<IUser | Response> {
    const existingUser = await this._authRepo.findByUsernameOrEmail(
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

    const user = await this._authRepo.createUser({
      firstName,
      lastName,
      username,
      email,
      password,
    });

    await this.sendOtp(email);

    return user;
  }

  async login(
    res: Response,
    { email, password }: LoginDto,
  ): Promise<IUser | Response> {
    const user = await this._authRepo.findByEmailWithPassword(email);

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

    if (!user.isVerified) {
      await this.sendOtp(email);
      return res.status(403).json({
        success: false,
        message: "Email not verified. A new OTP has been sent to your email.",
        data: { requiresVerification: true, email },
      });
    }

    const accessToken = this._jwtService.generateAccessToken(String(user._id));
    const refreshToken = this._jwtService.generateRefreshToken(
      String(user._id),
    );

    user.refreshToken = refreshToken;
    await this._authRepo.saveUser(user);

    this._jwtService.setCookies(res, accessToken, refreshToken);

    return user;
  }

  async sendOtp(email: string): Promise<void> {
    const otp = crypto.randomInt(100000, 999999).toString();

    await Otp.deleteMany({ email });

    await Otp.create({ email, otp });

    console.log(`this is the otp ${otp}`);

    await sendOtpEmail(email, otp);
  }

  async verifyOtp(
    res: Response,
    email: string,
    otp: string,
  ): Promise<IUser | Response> {
    const otpRecord = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    const isValid = await otpRecord.compareOtp(otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    await Otp.deleteMany({ email });

    const user = await this._authRepo.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isVerified = true;
    await this._authRepo.saveUser(user);

    const accessToken = this._jwtService.generateAccessToken(String(user._id));
    const refreshToken = this._jwtService.generateRefreshToken(
      String(user._id),
    );

    user.refreshToken = refreshToken;
    await this._authRepo.saveUser(user);

    this._jwtService.setCookies(res, accessToken, refreshToken);

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
      decoded = await this._jwtService.verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const userId = typeof decoded === "string" ? decoded : decoded.userId;
    const user = await this._authRepo.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newAccessToken = this._jwtService.generateAccessToken(
      String(user._id),
    );
    const newRefreshToken = this._jwtService.generateRefreshToken(
      String(user._id),
    );

    user.refreshToken = newRefreshToken;
    await this._authRepo.saveUser(user);

    this._jwtService.setCookies(res, newAccessToken, newRefreshToken);

    return user;
  }

  async logout(res: Response, userId: string): Promise<boolean> {
    await this._authRepo.updateUser(userId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      refreshToken: null as any,
      status: "inactive",
    });

    this._jwtService.clearCookies(res);
    return true;
  }

  async getCurrentUser(userId: string): Promise<IUser | null> {
    return this._authRepo.findById(userId);
  }

  async searchUsers(query: string, excludeUserId: string): Promise<IUser[]> {
    return this._authRepo.searchUsers(query, excludeUserId);
  }
}
