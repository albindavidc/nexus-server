import { IAppNotification } from '../../../modules/notification/notification.model';

export interface INotificationService {
  createNotification(data: Partial<IAppNotification>): Promise<IAppNotification>;
  getUserNotifications(userId: string): Promise<IAppNotification[]>;
  markAsRead(notificationId: string, userId: string): Promise<IAppNotification | null>;
  markAllAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string, userId: string): Promise<void>;
}
