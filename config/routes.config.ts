import { Application } from "express";
import authRoutes from "../modules/auth/auth.routes";
import chatRoutes from "../modules/chat/chat.routes";
import pushNotificationRoutes from "../modules/push-notification/notification.routes";
import notificationRoutes from "../modules/notification/notification.routes";

export function registerRoutes(app: Application): void {
  app.use("/api/v1/auth", authRoutes());
  app.use("/api/v1/chat", chatRoutes());
  app.use("/api/v1/push-notification", pushNotificationRoutes());
  app.use("/api/v1/notifications", notificationRoutes());
}
