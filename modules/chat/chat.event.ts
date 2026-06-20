import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../shared/di/tokens";
import { MESSAGE_TYPE } from "../../shared/constants/index";
import { PushNotificationService } from "../push-subscription/notification.services";
import { IMessage } from "./message.model";
import EventEmitter from "events";

@injectable()
export class ChatEvent {
  constructor(
    @inject(TOKENS.PushNotificationService)
    private readonly _pushNotificationService: PushNotificationService,
    @inject(TOKENS.EventEmitter)
    private readonly _eventEmitter: EventEmitter,
  ) {}

  handleMessageSent() {
    this._eventEmitter.on(
      "message.sent",
      async ({ message, recipientIds }: { message: IMessage; recipientIds: string[] }) => {
        const payload = {
          title: "New Message",
          body:
            message.type === MESSAGE_TYPE.TEXT
              ? message.content
              : `Sent a ${message.type.toLowerCase()}`,
          url: message.conversation
            ? `/chat/${message.conversation}`
            : `/chat/group/${message.groupRef}`,
        };

        await Promise.allSettled(
          recipientIds.map((id) =>
            this._pushNotificationService.sendPushNotification(id, payload),
          ),
        );
      },
    );
  }
}
