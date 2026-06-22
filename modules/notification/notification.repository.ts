import { injectable } from 'tsyringe';
import { INotificationRepository } from '../../shared/interfaces/repository/notification-repository.interface';
import { IAppNotification, AppNotification } from './notification.model';

@injectable()
export class NotificationRepository implements INotificationRepository {
  async createNotification(data: Partial<IAppNotification>): Promise<IAppNotification> {
    const notification = new AppNotification(data);
    return notification.save();
  }

  async getUserNotifications(userId: string): Promise<IAppNotification[]> {
    return AppNotification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async markAsRead(notificationId: string, userId: string): Promise<IAppNotification | null> {
    return AppNotification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true } },
      { new: true }
    ).exec();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await AppNotification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    ).exec();
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await AppNotification.deleteOne({ _id: notificationId, userId }).exec();
  }
}
