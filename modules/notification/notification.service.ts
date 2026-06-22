import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../shared/di/tokens';
import { INotificationService } from '../../shared/interfaces/services/notification-service.interface';
import { INotificationRepository } from '../../shared/interfaces/repository/notification-repository.interface';
import { IAppNotification } from './notification.model';

@injectable()
export class NotificationService implements INotificationService {
  constructor(
    @inject(TOKENS.NotificationRepository)
    private readonly _notificationRepository: INotificationRepository,
  ) {}

  async createNotification(data: Partial<IAppNotification>): Promise<IAppNotification> {
    return this._notificationRepository.createNotification(data);
  }

  async getUserNotifications(userId: string): Promise<IAppNotification[]> {
    return this._notificationRepository.getUserNotifications(userId);
  }

  async markAsRead(notificationId: string, userId: string): Promise<IAppNotification | null> {
    return this._notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    return this._notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    return this._notificationRepository.deleteNotification(notificationId, userId);
  }
}
