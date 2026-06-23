import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../shared/di/tokens";
import { MESSAGE_TYPE } from "../../shared/constants/index";
import { PushNotificationService } from "../push-notification/notification.services";
import { INotificationService } from "../../shared/interfaces/services/notification-service.interface";
import { IMessage } from "./message.model";
import EventEmitter from "events";

@injectable()
export class ChatEvent {
  constructor(
    @inject(TOKENS.PushNotificationService)
    private readonly _pushNotificationService: PushNotificationService,
    @inject(TOKENS.NotificationService)
    private readonly _notificationService: INotificationService,
    @inject(TOKENS.EventEmitter)
    private readonly _eventEmitter: EventEmitter,
  ) {}

  handleMessageSent() {
    this._eventEmitter.on(
      "message.sent",
      async ({
        message,
        recipientIds,
      }: {
        message: IMessage;
        recipientIds: string[];
      }) => {
        const bodyText =
          message.type === MESSAGE_TYPE.TEXT
            ? message.content
            : `Sent a ${message.type.toLowerCase()}`;
            
        const url = message.conversation
          ? `/chat/${message.conversation}`
          : `/chat/group/${message.groupRef}`;
          
        const payload = {
          title: "New Message",
          body: bodyText,
          url,
        };

        await Promise.allSettled(
          recipientIds.map(async (id) => {
            // Send push notification
            this._pushNotificationService.sendPushNotification(id, payload).catch(console.error);
            
            // Create in-app notification
            try {
              const appNotification = await this._notificationService.createNotification({
                userId: id,
                message: `New message: ${bodyText}`,
                type: 'message',
                relatedEntityId: message.conversation?.toString() || message.groupRef?.toString(),
              });
              
              // Emit internal event for real-time socket delivery
              this._eventEmitter.emit("notification.created", {
                userId: id,
                notification: appNotification
              });
            } catch (error) {
              console.error("Failed to create in-app notification:", error);
            }
          })
        );
      },
    );
  }
}
