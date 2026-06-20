import { IPushSubscriptionRepository } from "../../shared/interfaces/repository/push-subscription-repository.interface";
import { IPushSubscription, PushSubscription } from "./push-subscription.model";

export class PushSubscriptionRepository implements IPushSubscriptionRepository {
  async getUserById(userId: string): Promise<IPushSubscription[]> {
    return await PushSubscription.find({ userId });
  }

  async upsertByEndpoint(
    endpoint: string,
    data: Partial<IPushSubscription>,
  ): Promise<IPushSubscription> {
    return await PushSubscription.findOneAndUpdate({ endpoint }, data, {
      new: true,
      upsert: true,
    });
  }

  async deleteByEndpoint(endpoint: string): Promise<boolean> {
    return await PushSubscription.deleteOne({ endpoint }).then(
      (res) => res.deletedCount === 1,
    );
  }
}
