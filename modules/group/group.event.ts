import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../shared/di/tokens";
import { PushNotificationService } from "../push-notification/notification.services";
import { INotificationService } from "../../shared/interfaces/services/notification-service.interface";
import { IConversationDocument } from "../../shared/types/group.types";
import EventEmitter from "events";

@injectable()
export class GroupEvent {
  constructor(
    @inject(TOKENS.PushNotificationService)
    private readonly _pushNotificationService: PushNotificationService,
    @inject(TOKENS.NotificationService)
    private readonly _notificationService: INotificationService,
    @inject(TOKENS.EventEmitter)
    private readonly _eventEmitter: EventEmitter,
  ) {}

  handleGroupCreated() {
    this._eventEmitter.on(
      "group.created",
      async ({
        group,
        participantIds,
      }: {
        group: IConversationDocument;
        participantIds: string[];
      }) => {
        const payload = {
          title: "New Group",
          body: `You have been added to ${group.name}`,
          url: `/chat/group/${group._id}`,
        };

        await Promise.allSettled(
          participantIds.map(async (id) => {
            this._pushNotificationService
              .sendPushNotification(id, payload)
              .catch(console.error);

            try {
              const appNotification =
                await this._notificationService.createNotification({
                  userId: id,
                  message: `You have been added to group: ${group.name}`,
                  type: "group",
                  relatedEntityId: group._id?.toString(),
                });

              this._eventEmitter.emit("notification.created", {
                userId: id,
                notification: appNotification,
              });
            } catch (error) {
              console.error("Failed to create in-app notification:", error);
            }
          }),
        );
      },
    );
  }
}
