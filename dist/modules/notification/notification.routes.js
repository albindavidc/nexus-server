"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = notificationRoutes;
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const notification_controller_1 = require("./notification.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
function notificationRoutes() {
    const router = (0, express_1.Router)();
    const controller = tsyringe_1.container.resolve(notification_controller_1.NotificationController);
    const authMiddleware = tsyringe_1.container.resolve(auth_middleware_1.AuthMiddleware);
    router.use(authMiddleware.protect);
    router.get('/', controller.getUserNotifications.bind(controller));
    router.put('/read-all', controller.markAllAsRead.bind(controller));
    router.put('/:id/read', controller.markAsRead.bind(controller));
    return router;
}
