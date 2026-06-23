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
exports.NotificationController = void 0;
const tsyringe_1 = require("tsyringe");
const tokens_1 = require("../../shared/di/tokens");
let NotificationController = class NotificationController {
    _notificationService;
    constructor(_notificationService) {
        this._notificationService = _notificationService;
    }
    async getUserNotifications(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const notifications = await this._notificationService.getUserNotifications(userId);
            return res.status(200).json({ success: true, data: { notifications } });
        }
        catch (error) {
            next(error);
        }
    }
    async markAsRead(req, res, next) {
        try {
            const userId = req.user._id.toString();
            const id = req.params['id'];
            const notification = await this._notificationService.markAsRead(id, userId);
            return res.status(200).json({ success: true, data: { notification } });
        }
        catch (error) {
            next(error);
        }
    }
    async markAllAsRead(req, res, next) {
        try {
            const userId = req.user._id.toString();
            await this._notificationService.markAllAsRead(userId);
            return res.status(200).json({ success: true, message: 'All notifications marked as read' });
        }
        catch (error) {
            next(error);
        }
    }
};
exports.NotificationController = NotificationController;
exports.NotificationController = NotificationController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.NotificationService)),
    __metadata("design:paramtypes", [Object])
], NotificationController);
