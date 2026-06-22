import { Router } from "express";
import { container } from "tsyringe";
import { PushNotificationController } from "./notification.controller";

export default function pushNotificationRoutes() {
  const router = Router();
  const controller = container.resolve(PushNotificationController);

  router.post("/subscribe", controller.subscribeToPushNotification);
  router.post("/unsubscribe", controller.unsubscribeFromPushNotification);

  return router;
}
