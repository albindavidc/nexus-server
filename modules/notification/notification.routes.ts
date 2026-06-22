import { Router } from 'express';
import { container } from 'tsyringe';
import { NotificationController } from './notification.controller';
import { AuthMiddleware } from '../../middlewares/auth.middleware';

export default function notificationRoutes() {
  const router = Router();
  const controller = container.resolve(NotificationController);
  const authMiddleware = container.resolve(AuthMiddleware);

  router.use(authMiddleware.protect);

  router.get('/', controller.getUserNotifications.bind(controller));
  router.put('/read-all', controller.markAllAsRead.bind(controller));
  router.put('/:id/read', controller.markAsRead.bind(controller));

  return router;
}
