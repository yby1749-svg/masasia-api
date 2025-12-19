// ============================================================================
// Bookings Controller
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/bookings.service.js';

export const listBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.query.role as string || 'customer';
    const result = await bookingService.listBookings(req.user!.id, role, req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await bookingService.createBooking(req.user!.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getBookingDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await bookingService.getBookingDetail(req.user!.id, req.params.bookingId);
    res.json({ success: true, data: booking });
  } catch (error) { next(error); }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await bookingService.cancelBooking(req.user!.id, req.params.bookingId, req.body.reason);
    res.json({ success: true, data: booking });
  } catch (error) { next(error); }
};

export const acceptBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await bookingService.acceptBooking(req.user!.id, req.params.bookingId);
    res.json({ success: true, data: booking });
  } catch (error) { next(error); }
};

export const rejectBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await bookingService.rejectBooking(req.user!.id, req.params.bookingId, req.body.reason);
    res.json({ success: true, data: booking });
  } catch (error) { next(error); }
};

export const updateBookingStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await bookingService.updateBookingStatus(req.user!.id, req.params.bookingId, req.body.status);
    res.json({ success: true, data: booking });
  } catch (error) { next(error); }
};

export const getProviderLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const location = await bookingService.getProviderLocation(req.user!.id, req.params.bookingId);
    res.json({ success: true, data: location });
  } catch (error) { next(error); }
};

export const updateBookingLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await bookingService.updateBookingLocation(req.user!.id, req.params.bookingId, req.body);
    res.json({ success: true, message: 'Location updated' });
  } catch (error) { next(error); }
};

export const triggerSOS = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await bookingService.triggerSOS(req.user!.id, req.params.bookingId, req.body);
    res.json({ success: true, message: 'SOS triggered' });
  } catch (error) { next(error); }
};

export const hideBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await bookingService.hideBooking(req.user!.id, req.params.bookingId);
    res.json({ success: true, message: 'Booking hidden from history' });
  } catch (error) { next(error); }
};
