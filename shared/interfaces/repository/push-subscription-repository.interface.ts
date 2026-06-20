import { IPushSubscription } from "../../../modules/push-subscription/push-subscription.model";

export interface IPushSubscriptionRepository {
  getUserById(userId: string): Promise<IPushSubscription[]>;
  upsertByEndpoint(
    endpoint: string,
    data: Partial<IPushSubscription>,
  ): Promise<IPushSubscription>;
  deleteByEndpoint(endpoint: string): Promise<boolean>;
}
