import { Request, Response } from 'express';
import { chatService } from '../services/chat.service.js';

export const chatController = {
  async getMessages(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.id;

      const messages = await chatService.getMessages(bookingId, userId);

      res.json({
        success: true,
        data: messages,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  },

  async sendMessage(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const { content } = req.body;
      const userId = req.user!.id;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required',
        });
      }

      const message = await chatService.sendMessage(bookingId, userId, content.trim());

      res.json({
        success: true,
        data: message,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  },

  async markAsRead(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.id;

      await chatService.markAsRead(bookingId, userId);

      res.json({
        success: true,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  },

  async getUnreadCount(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.id;

      const count = await chatService.getUnreadCount(bookingId, userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  },
};
