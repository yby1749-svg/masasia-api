// ============================================================================
// Notification Routes
// ============================================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as notificationController from '../controllers/notifications.controller.js';

const router = Router();

router.use(authenticate);

// Get notifications
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark as read
router.patch('/:notificationId/read', notificationController.markAsRead);

// Mark all as read
router.patch('/read-all', notificationController.markAllAsRead);

export default router;
