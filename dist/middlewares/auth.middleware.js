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
exports.AuthMiddleware = void 0;
const tsyringe_1 = require("tsyringe");
const auth_model_1 = __importDefault(require("../modules/auth/auth.model"));
const tokens_1 = require("../shared/di/tokens");
let AuthMiddleware = class AuthMiddleware {
    _jwtService;
    constructor(_jwtService) {
        this._jwtService = _jwtService;
    }
    protect = async (req, res, next) => {
        try {
            const token = req.cookies?.access_token;
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: "Access Denied. No token provided",
                });
            }
            let decodedToken;
            try {
                decodedToken = await this._jwtService.verifyAccessToken(token);
            }
            catch (error) {
                if (error instanceof Error && error.name === "TokenExpiredError") {
                    return res.status(401).json({
                        success: false,
                        message: "Token expired",
                        code: "TOKEN_EXPIRED",
                    });
                }
                return res.status(401).json({
                    success: false,
                    message: "Invalid Token",
                });
            }
            const id = typeof decodedToken === "string" ? decodedToken : decodedToken.userId;
            const user = await auth_model_1.default.findById(id);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "User Not Found",
                });
            }
            req.user = user;
            req.userId = String(user._id);
            next();
        }
        catch (error) {
            next(error);
        }
    };
    authenticateSocket = async (socket, next) => {
        try {
            let token = socket.handshake.auth?.token;
            if (!token && socket.handshake.headers.cookie) {
                const cookies = socket.handshake.headers.cookie.split(";").reduce((acc, cookie) => {
                    const parts = cookie.trim().split("=");
                    if (parts.length >= 2) {
                        const key = parts[0];
                        const val = parts.slice(1).join("=");
                        acc[key] = val;
                    }
                    return acc;
                }, {});
                token = cookies["access_token"];
            }
            if (!token) {
                return next(new Error("Unauthenticated"));
            }
            let decodedToken;
            try {
                decodedToken = await this._jwtService.verifyAccessToken(token);
            }
            catch {
                return next(new Error("Invalid Token"));
            }
            const id = typeof decodedToken === "string" ? decodedToken : decodedToken.userId;
            const user = await auth_model_1.default.findById(id);
            if (!user) {
                return next(new Error("User Not Found"));
            }
            socket.user = user;
            socket.userId = String(user._id);
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.AuthMiddleware = AuthMiddleware;
exports.AuthMiddleware = AuthMiddleware = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.JwtService)),
    __metadata("design:paramtypes", [Object])
], AuthMiddleware);
