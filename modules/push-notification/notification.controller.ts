import { NextFunction, Response } from "express";
import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../shared/di/tokens";
import { IPushNotificationRepository } from "../../shared/interfaces/repository/push-notification-repository.interface";
import { CustomRequest } from "../../middlewares/auth.middleware";

@injectable()
export class PushNotificationController {
  constructor(
    @inject(TOKENS.PushNotificationRepository)
    private notificationRepository: IPushNotificationRepository,
  ) {}

  async subscribeToPushNotification(
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { endpoint, keys } = req.body;

      await this.notificationRepository.upsertByEndpoint(endpoint, {
        userId: req.user!._id,
        endpoint,
        keys,
      });

      return res
        .status(200)
        .json({ message: "Subscribed to push notifications" });
    } catch (error) {
      next(error);
    }
  }

  async unsubscribeFromPushNotification(
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { endpoint } = req.body;

      await this.notificationRepository.deleteByEndpoint(endpoint);

      return res
        .status(200)
        .json({ message: "Unsubscribed from push notifications" });
    } catch (error) {
      next(error);
    }
  }
}
