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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tsyringe_1 = require("tsyringe");
let JwtService = class JwtService {
    _accessSecret;
    _refreshSecret;
    _accessExpiresIn;
    _refreshExpiresIn;
    ACCESS_COOKIE_NAME = "access_token";
    REFRESH_COOKIE_NAME = "refresh_token";
    ACCESS_MAX_AGE_MS = 20 * 60 * 1000;
    REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    constructor() {
        this._accessSecret = process.env.JWT_ACCESS_TOKEN;
        this._refreshSecret = process.env.JWT_REFRESH_TOKEN;
        this._accessExpiresIn =
            process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m";
        this._refreshExpiresIn =
            process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || "7d";
    }
    generateAccessToken(userId) {
        return jsonwebtoken_1.default.sign({ userId }, this._accessSecret, {
            expiresIn: this._accessExpiresIn,
        });
    }
    generateRefreshToken(userId) {
        return jsonwebtoken_1.default.sign({ userId }, this._refreshSecret, {
            expiresIn: this._refreshExpiresIn,
        });
    }
    async verifyAccessToken(token) {
        return jsonwebtoken_1.default.verify(token, this._accessSecret);
    }
    async verifyRefreshToken(token) {
        return jsonwebtoken_1.default.verify(token, this._refreshSecret);
    }
    setCookies(res, accessToken, refreshToken) {
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
    clearCookies(res) {
        res.clearCookie(this.ACCESS_COOKIE_NAME, { path: "/" });
        res.clearCookie(this.REFRESH_COOKIE_NAME, { path: "/" });
    }
};
exports.JwtService = JwtService;
exports.JwtService = JwtService = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], JwtService);
