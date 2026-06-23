"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const tsyringe_1 = require("tsyringe");
const notification_model_1 = require("./notification.model");
let NotificationRepository = class NotificationRepository {
    async createNotification(data) {
        const notification = new notification_model_1.AppNotification(data);
        return notification.save();
    }
    async getUserNotifications(userId) {
        return notification_model_1.AppNotification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .exec();
    }
    async markAsRead(notificationId, userId) {
        return notification_model_1.AppNotification.findOneAndUpdate({ _id: notificationId, userId }, { $set: { isRead: true } }, { new: true }).exec();
    }
    async markAllAsRead(userId) {
        await notification_model_1.AppNotification.updateMany({ userId, isRead: false }, { $set: { isRead: true } }).exec();
    }
    async deleteNotification(notificationId, userId) {
        await notification_model_1.AppNotification.deleteOne({ _id: notificationId, userId }).exec();
    }
};
exports.NotificationRepository = NotificationRepository;
exports.NotificationRepository = NotificationRepository = __decorate([
    (0, tsyringe_1.injectable)()
], NotificationRepository);
