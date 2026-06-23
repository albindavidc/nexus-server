"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = void 0;
const web_push_1 = __importDefault(require("web-push"));
const notification_model_1 = require("../../modules/push-notification/notification.model");
const logger_1 = __importDefault(require("./logger"));
web_push_1.default.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
const sendPushNotification = async (subscription, payload) => {
    try {
        await web_push_1.default.sendNotification(subscription, JSON.stringify(payload));
    }
    catch (error) {
        if (typeof error === "object" && error !== null && "statusCode" in error) {
            const statusCode = error.statusCode;
            if (statusCode === 404 || statusCode === 410) {
                logger_1.default.warn(`Push Subscription ${subscription.endpoint} not found or expired, deleting`);
                await notification_model_1.PushNotification.deleteOne({ endpoint: subscription.endpoint });
                return false;
            }
        }
        logger_1.default.error(`Error sending push notification`, error);
        throw error;
    }
};
exports.sendPushNotification = sendPushNotification;
