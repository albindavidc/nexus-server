import webpush from "web-push";
import {
  IPushSubscription,
  PushSubscription,
} from "../../modules/push-subscription/push-subscription.model";
import logger from "./logger";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export interface IPushNotification {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export const sendPushNotification = async (
  subscription: IPushSubscription,
  payload: IPushNotification,
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
        await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
        return false;
      }
    }
    logger.error(`Error sending push notification`, error);

    throw error;
  }
};
