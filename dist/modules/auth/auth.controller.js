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
Object.defineProperty(exports, "__esModule", { value: true });
const tsyringe_1 = require("tsyringe");
const express_validator_1 = require("express-validator");
const tokens_1 = require("../../shared/di/tokens");
const response_1 = require("../../shared/utils/response");
let AuthController = class AuthController {
    _authService;
    constructor(_authService) {
        this._authService = _authService;
    }
    register = async (req, res, next) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }
            const { firstName, lastName, username, email, password } = req.body;
            const user = await this._authService.registerUser(res, {
                firstName,
                lastName,
                username,
                email,
                password,
            });
            if (!user)
                return;
            response_1.ResponseHelper.success(res, 201, "User registered successfully. Please verify your email.", {
                user,
                requiresVerification: true,
            });
        }
        catch (error) {
            next(error);
        }
    };
    login = async (req, res, next) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }
            const { email, password } = req.body;
            const user = await this._authService.login(res, { email, password });
            if (!user)
                return;
            response_1.ResponseHelper.success(res, 200, "User logged in successfully", { user });
        }
        catch (error) {
            next(error);
        }
    };
    sendOtp = async (req, res, next) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }
            const { email } = req.body;
            await this._authService.sendOtp(email);
            response_1.ResponseHelper.success(res, 200, "OTP sent successfully");
        }
        catch (error) {
            next(error);
        }
    };
    verifyOtp = async (req, res, next) => {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }
            const { email, otp } = req.body;
            const user = await this._authService.verifyOtp(res, email, otp);
            if (!user)
                return;
            response_1.ResponseHelper.success(res, 200, "Email verified successfully", { user });
        }
        catch (error) {
            next(error);
        }
    };
    refreshToken = async (req, res, next) => {
        try {
            const user = await this._authService.refreshToken(res, req);
            if (!user)
                return;
            response_1.ResponseHelper.success(res, 200, "Token refreshed successfully", {
                user,
            });
        }
        catch (error) {
            next(error);
        }
    };
    logout = async (req, res, next) => {
        try {
            await this._authService.logout(res, req.userId);
            response_1.ResponseHelper.success(res, 200, "User logged out successfully");
        }
        catch (error) {
            next(error);
        }
    };
    getUser = async (req, res, next) => {
        try {
            const user = await this._authService.getCurrentUser(req.userId);
            if (!user) {
                return response_1.ResponseHelper.error(res, 404, "User not found");
            }
            response_1.ResponseHelper.success(res, 200, "User fetched successfully", { user });
        }
        catch (error) {
            next(error);
        }
    };
    searchUsers = async (req, res, next) => {
        try {
            const query = req.query.q;
            if (!query) {
                return response_1.ResponseHelper.success(res, 200, "Users fetched successfully", { users: [] });
            }
            const users = await this._authService.searchUsers(query, req.userId);
            response_1.ResponseHelper.success(res, 200, "Users fetched successfully", { users });
        }
        catch (error) {
            next(error);
        }
    };
};
AuthController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.AuthService)),
    __metadata("design:paramtypes", [Object])
], AuthController);
exports.default = AuthController;
