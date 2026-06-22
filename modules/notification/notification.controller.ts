import { NextFunction, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../shared/di/tokens';
import { INotificationService } from '../../shared/interfaces/services/notification-service.interface';
import { CustomRequest } from '../../middlewares/auth.middleware';

@injectable()
export class NotificationController {
  constructor(
    @inject(TOKENS.NotificationService)
    private readonly _notificationService: INotificationService,
  ) {}

  async getUserNotifications(req: CustomRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!._id.toString();
      const notifications = await this._notificationService.getUserNotifications(userId);
      return res.status(200).json({ success: true, data: { notifications } });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: CustomRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!._id.toString();
      const id = req.params['id'] as string;
      const notification = await this._notificationService.markAsRead(id, userId);
      return res.status(200).json({ success: true, data: { notification } });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: CustomRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!._id.toString();
      await this._notificationService.markAllAsRead(userId);
      return res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  }
}
