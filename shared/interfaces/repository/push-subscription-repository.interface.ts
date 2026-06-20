import { IPushSubscription } from "../../../modules/auth/push-subscription.model";

export interface IPushSubscriptionRepository {
  getUserById(userId: string): Promise<IPushSubscription[]>;
  upsertByEndpoint(
    endpoint: string,
    data: Partial<IPushSubscription>,
  ): Promise<IPushSubscription>;
  removeByEndpoint(endpoint: string): Promise<boolean>;
}
