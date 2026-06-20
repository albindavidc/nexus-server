import webpush from "web-push";
import {
  PushNotification,
  IPushNotification,
} from "../../modules/push-notification/notification.model";
import logger from "./logger";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export interface IPushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export const sendPushNotification = async (
  subscription: IPushNotification,
  payload: IPushNotificationPayload,
) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      const statusCode = (error as { statusCode: number }).statusCode;

      if (statusCode === 404 || statusCode === 410) {
        logger.warn(
          `Push Subscription ${subscription.endpoint} not found or expired, deleting`,
        );
        await PushNotification.deleteOne({ endpoint: subscription.endpoint });
        return false;
      }
    }
    logger.error(`Error sending push notification`, error);

    throw error;
  }
};
