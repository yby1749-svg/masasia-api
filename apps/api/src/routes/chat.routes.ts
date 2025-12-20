import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get messages for a booking
router.get('/:bookingId/messages', chatController.getMessages);

// Send a message
router.post('/:bookingId/messages', chatController.sendMessage);

// Mark messages as read
router.post('/:bookingId/read', chatController.markAsRead);

// Get unread count
router.get('/:bookingId/unread', chatController.getUnreadCount);

export default router;
