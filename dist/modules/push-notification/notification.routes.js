"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pushNotificationRoutes;
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const notification_controller_1 = require("./notification.controller");
function pushNotificationRoutes() {
    const router = (0, express_1.Router)();
    const controller = tsyringe_1.container.resolve(notification_controller_1.PushNotificationController);
    router.post("/subscribe", controller.subscribeToPushNotification);
    router.post("/unsubscribe", controller.unsubscribeFromPushNotification);
    return router;
}
