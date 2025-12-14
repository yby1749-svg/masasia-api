// ============================================================================
// Provider Routes
// ============================================================================

import { Router } from 'express';
import { authenticate, optionalAuth, requireProvider } from '../middleware/auth.js';
import * as providerController from '../controllers/providers.controller.js';

const router = Router();

// ============================================================================
// PUBLIC LIST ROUTE
// ============================================================================

/**
 * @swagger
 * /providers:
 *   get:
 *     summary: List providers
 *     tags: [Providers]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: Filter by service
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: User latitude for distance calculation
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: User longitude for distance calculation
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of providers
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
 *                     $ref: '#/components/schemas/Provider'
 */
router.get('/', optionalAuth, providerController.listProviders);

// ============================================================================
// PROVIDER REGISTRATION & MANAGEMENT (Requires auth)
// IMPORTANT: These routes MUST be defined BEFORE /:providerId routes
// to prevent "me" and "register" from being matched as providerId
// ============================================================================

/**
 * @swagger
 * /providers/register:
 *   post:
 *     summary: Register as a provider
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [displayName]
 *             properties:
 *               displayName:
 *                 type: string
 *               bio:
 *                 type: string
 *               yearsOfExperience:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Provider registered successfully
 *       400:
 *         description: Already registered as provider
 */
router.post('/register', authenticate, providerController.registerAsProvider);

/**
 * @swagger
 * /providers/me/profile:
 *   get:
 *     summary: Get my provider profile
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider profile
 *   patch:
 *     summary: Update my provider profile
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.get('/me/profile', authenticate, requireProvider, providerController.getMyProfile);
router.patch('/me/profile', authenticate, requireProvider, providerController.updateMyProfile);

// Documents
router.get('/me/documents', authenticate, providerController.getMyDocuments);
router.post('/me/documents', authenticate, providerController.uploadDocument);

// Services
router.get('/me/services', authenticate, requireProvider, providerController.getMyServices);
router.post('/me/services', authenticate, requireProvider, providerController.setService);
router.delete('/me/services/:serviceId', authenticate, requireProvider, providerController.removeService);

/**
 * @swagger
 * /providers/me/availability:
 *   get:
 *     summary: Get my availability schedule
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Availability schedule
 *   put:
 *     summary: Set my availability schedule
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 dayOfWeek:
 *                   type: integer
 *                 startTime:
 *                   type: string
 *                 endTime:
 *                   type: string
 *     responses:
 *       200:
 *         description: Availability updated
 */
router.get('/me/availability', authenticate, requireProvider, providerController.getMyAvailability);
router.put('/me/availability', authenticate, requireProvider, providerController.setMyAvailability);

// Online/Offline status
router.patch('/me/status', authenticate, requireProvider, providerController.updateOnlineStatus);

// Location update
router.patch('/me/location', authenticate, requireProvider, providerController.updateLocation);

// Bank account
router.patch('/me/bank-account', authenticate, requireProvider, providerController.updateBankAccount);

// Earnings
router.get('/me/earnings', authenticate, requireProvider, providerController.getEarnings);
router.get('/me/earnings/summary', authenticate, requireProvider, providerController.getEarningsSummary);

// Payouts
router.get('/me/payouts', authenticate, requireProvider, providerController.getPayouts);
router.post('/me/payouts', authenticate, requireProvider, providerController.requestPayout);

// ============================================================================
// PUBLIC ROUTES WITH PARAMETERIZED providerId
// IMPORTANT: These routes MUST be defined AFTER /me/* routes
// ============================================================================

/**
 * @swagger
 * /providers/{providerId}:
 *   get:
 *     summary: Get provider details
 *     tags: [Providers]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Provider'
 *       404:
 *         description: Provider not found
 */
router.get('/:providerId', optionalAuth, providerController.getProviderDetail);

/**
 * @swagger
 * /providers/{providerId}/reviews:
 *   get:
 *     summary: Get provider reviews
 *     tags: [Providers]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get('/:providerId/reviews', providerController.getProviderReviews);

/**
 * @swagger
 * /providers/{providerId}/availability:
 *   get:
 *     summary: Get provider availability for a date
 *     tags: [Providers]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Available time slots
 */
router.get('/:providerId/availability', providerController.getProviderAvailability);

export default router;
