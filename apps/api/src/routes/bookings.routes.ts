// ============================================================================
// Booking Routes
// ============================================================================

import { Router } from 'express';
import { authenticate, requireProvider } from '../middleware/auth.js';
import * as bookingController from '../controllers/bookings.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// CUSTOMER ROUTES
// ============================================================================

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: List my bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, PROVIDER_EN_ROUTE, PROVIDER_ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED]
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, provider]
 *         description: View as customer or provider
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 */
router.get('/', bookingController.listBookings);

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookingRequest'
 *     responses:
 *       201:
 *         description: Booking created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Validation error
 */
router.post('/', bookingController.createBooking);

/**
 * @swagger
 * /bookings/{bookingId}:
 *   get:
 *     summary: Get booking details
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details
 *       404:
 *         description: Booking not found
 */
router.get('/:bookingId', bookingController.getBookingDetail);

/**
 * @swagger
 * /bookings/{bookingId}/cancel:
 *   post:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       400:
 *         description: Cannot cancel booking
 */
router.post('/:bookingId/cancel', bookingController.cancelBooking);

/**
 * @swagger
 * /bookings/{bookingId}/hide:
 *   delete:
 *     summary: Hide booking from history
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking hidden from history
 *       404:
 *         description: Booking not found
 */
router.delete('/:bookingId/hide', bookingController.hideBooking);

/**
 * @swagger
 * /bookings/{bookingId}/location:
 *   get:
 *     summary: Get provider location during active booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider location
 */
router.get('/:bookingId/location', bookingController.getProviderLocation);

/**
 * @swagger
 * /bookings/{bookingId}/sos:
 *   post:
 *     summary: Trigger SOS emergency
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: SOS triggered
 */
router.post('/:bookingId/sos', bookingController.triggerSOS);

// ============================================================================
// PROVIDER ROUTES
// ============================================================================

/**
 * @swagger
 * /bookings/{bookingId}/accept:
 *   post:
 *     summary: Accept a booking (Provider only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking accepted
 *       403:
 *         description: Not authorized
 */
router.post('/:bookingId/accept', requireProvider, bookingController.acceptBooking);

/**
 * @swagger
 * /bookings/{bookingId}/reject:
 *   post:
 *     summary: Reject a booking (Provider only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking rejected
 */
router.post('/:bookingId/reject', requireProvider, bookingController.rejectBooking);

/**
 * @swagger
 * /bookings/{bookingId}/status:
 *   patch:
 *     summary: Update booking status (Provider only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PROVIDER_EN_ROUTE, PROVIDER_ARRIVED, IN_PROGRESS, COMPLETED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:bookingId/status', requireProvider, bookingController.updateBookingStatus);

/**
 * @swagger
 * /bookings/{bookingId}/location:
 *   post:
 *     summary: Update provider location during booking (Provider only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude]
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Location updated
 */
router.post('/:bookingId/location', requireProvider, bookingController.updateBookingLocation);

export default router;
