"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tsyringe_1 = require("tsyringe");
const crypto_1 = __importDefault(require("crypto"));
const otp_model_1 = require("./otp.model");
const jwt_util_1 = require("../../shared/utils/jwt.util");
const email_util_1 = require("../../shared/utils/email.util");
const tokens_1 = require("../../shared/di/tokens");
let AuthService = class AuthService {
    _jwtService;
    _authRepo;
    constructor(_jwtService, _authRepo) {
        this._jwtService = _jwtService;
        this._authRepo = _authRepo;
    }
    async registerUser(res, { firstName, lastName, username, email, password }) {
        const existingUser = await this._authRepo.findByUsernameOrEmail(username, email);
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
    async login(res, { email, password }) {
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
        const refreshToken = this._jwtService.generateRefreshToken(String(user._id));
        user.refreshToken = refreshToken;
        await this._authRepo.saveUser(user);
        this._jwtService.setCookies(res, accessToken, refreshToken);
        return user;
    }
    async sendOtp(email) {
        console.log(`[sendOtp] START — email: "${email}"`);
        const otp = crypto_1.default.randomInt(100000, 999999).toString();
        console.log(`[sendOtp] Generated OTP: ${otp}`);
        const deleteResult = await otp_model_1.Otp.deleteMany({ email });
        console.log(`[sendOtp] Deleted old OTPs: ${deleteResult.deletedCount}`);
        const created = await otp_model_1.Otp.create({ email, otp });
        console.log(`[sendOtp] Created OTP doc _id: ${created._id}, email: ${created.email}`);
        const verify = await otp_model_1.Otp.findOne({ email }).sort({ createdAt: -1 });
        console.log(`[sendOtp] Verify read-back: found=${!!verify}, _id=${verify?._id}`);
        await (0, email_util_1.sendOtpEmail)(email, otp);
        console.log(`[sendOtp] DONE — email sent`);
    }
    async verifyOtp(res, email, otp) {
        const otpRecord = await otp_model_1.Otp.findOne({ email }).sort({ createdAt: -1 });
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
        await otp_model_1.Otp.deleteMany({ email });
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
        const refreshToken = this._jwtService.generateRefreshToken(String(user._id));
        user.refreshToken = refreshToken;
        await this._authRepo.saveUser(user);
        this._jwtService.setCookies(res, accessToken, refreshToken);
        return user;
    }
    async refreshToken(res, req) {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) {
            return res.status(404).json({
                success: false,
                message: "Refresh token not found",
            });
        }
        let decoded;
        try {
            decoded = await this._jwtService.verifyRefreshToken(refreshToken);
        }
        catch {
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
        const newAccessToken = this._jwtService.generateAccessToken(String(user._id));
        const newRefreshToken = this._jwtService.generateRefreshToken(String(user._id));
        user.refreshToken = newRefreshToken;
        await this._authRepo.saveUser(user);
        this._jwtService.setCookies(res, newAccessToken, newRefreshToken);
        return user;
    }
    async logout(res, userId) {
        await this._authRepo.updateUser(userId, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            refreshToken: null,
            status: "inactive",
        });
        this._jwtService.clearCookies(res);
        return true;
    }
    async getCurrentUser(userId) {
        return this._authRepo.findById(userId);
    }
    async searchUsers(query, excludeUserId) {
        return this._authRepo.searchUsers(query, excludeUserId);
    }
};
AuthService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.JwtService)),
    __param(1, (0, tsyringe_1.inject)(tokens_1.TOKENS.AuthRepository)),
    __metadata("design:paramtypes", [jwt_util_1.JwtService, Object])
], AuthService);
exports.default = AuthService;
