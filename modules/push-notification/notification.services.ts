import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../shared/di/tokens";
import { IPushNotificationRepository } from "../../shared/interfaces/repository/push-notification-repository.interface";
import {
  IPushNotificationPayload,
  sendPushNotification,
} from "../../shared/utils/push.util";
import logger from "../../shared/utils/logger";

@injectable()
export class PushNotificationService {
  constructor(
    @inject(TOKENS.PushNotificationRepository)
    private _pushRepo: IPushNotificationRepository,
  ) {}

  async sendPushNotification(
    userId: string,
    payload: IPushNotificationPayload,
  ): Promise<void> {
    const subscription = await this._pushRepo.getUserById(userId);

    const results = await Promise.allSettled(
      subscription.map((sub) => sendPushNotification(sub, payload)),
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value === false) {
        this._pushRepo
          .deleteByEndpoint(subscription[index].endpoint)
          .catch(logger.error);
      }

      if (result.status === "rejected") {
        logger.error(
          `[notification.services.ts] Error sending push notification to user ${userId}`,
          result.reason,
        );
      }
    });
  }
}
