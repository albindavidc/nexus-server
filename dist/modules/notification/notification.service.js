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
exports.NotificationService = void 0;
const tsyringe_1 = require("tsyringe");
const tokens_1 = require("../../shared/di/tokens");
let NotificationService = class NotificationService {
    _notificationRepository;
    constructor(_notificationRepository) {
        this._notificationRepository = _notificationRepository;
    }
    async createNotification(data) {
        return this._notificationRepository.createNotification(data);
    }
    async getUserNotifications(userId) {
        return this._notificationRepository.getUserNotifications(userId);
    }
    async markAsRead(notificationId, userId) {
        return this._notificationRepository.markAsRead(notificationId, userId);
    }
    async markAllAsRead(userId) {
        return this._notificationRepository.markAllAsRead(userId);
    }
    async deleteNotification(notificationId, userId) {
        return this._notificationRepository.deleteNotification(notificationId, userId);
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.NotificationRepository)),
    __metadata("design:paramtypes", [Object])
], NotificationService);
