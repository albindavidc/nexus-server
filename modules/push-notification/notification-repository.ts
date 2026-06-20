import { IPushNotificationRepository } from "../../shared/interfaces/repository/push-notification-repository.interface";
import { IPushNotification, PushNotification } from "./notification.model";

export class PushNotificationRepository implements IPushNotificationRepository {
  async getUserById(userId: string): Promise<IPushNotification[]> {
    return await PushNotification.find({ userId });
  }

  async upsertByEndpoint(
    endpoint: string,
    data: Partial<IPushNotification>,
  ): Promise<IPushNotification> {
    return await PushNotification.findOneAndUpdate({ endpoint }, data, {
      new: true,
      upsert: true,
    });
  }

  async deleteByEndpoint(endpoint: string): Promise<boolean> {
    return await PushNotification.deleteOne({ endpoint }).then(
      (res) => res.deletedCount === 1,
    );
  }
}
