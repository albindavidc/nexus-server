import { IPushNotification } from "../../../modules/push-notification/notification.model";

export interface IPushNotificationRepository {
  getUserById(userId: string): Promise<IPushNotification[]>;
  upsertByEndpoint(
    endpoint: string,
    data: Partial<IPushNotification>,
  ): Promise<IPushNotification>;
  deleteByEndpoint(endpoint: string): Promise<boolean>;
}
