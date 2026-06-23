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
exports.PushNotificationController = void 0;
const tsyringe_1 = require("tsyringe");
const tokens_1 = require("../../shared/di/tokens");
let PushNotificationController = class PushNotificationController {
    notificationRepository;
    constructor(notificationRepository) {
        this.notificationRepository = notificationRepository;
    }
    async subscribeToPushNotification(req, res, next) {
        try {
            const { endpoint, keys } = req.body;
            await this.notificationRepository.upsertByEndpoint(endpoint, {
                userId: req.user._id,
                endpoint,
                keys,
            });
            return res
                .status(200)
                .json({ message: "Subscribed to push notifications" });
        }
        catch (error) {
            next(error);
        }
    }
    async unsubscribeFromPushNotification(req, res, next) {
        try {
            const { endpoint } = req.body;
            await this.notificationRepository.deleteByEndpoint(endpoint);
            return res
                .status(200)
                .json({ message: "Unsubscribed from push notifications" });
        }
        catch (error) {
            next(error);
        }
    }
};
exports.PushNotificationController = PushNotificationController;
exports.PushNotificationController = PushNotificationController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(tokens_1.TOKENS.PushNotificationRepository)),
    __metadata("design:paramtypes", [Object])
], PushNotificationController);
