// ============================================================================
// Admin Routes
// ============================================================================

import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import * as adminController from '../controllers/admin.controller.js';
import * as shopsController from '../controllers/shops.controller.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard stats
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     todayBookings:
 *                       type: integer
 *                     totalProviders:
 *                       type: integer
 *                     pendingProviders:
 *                       type: integer
 *                     openReports:
 *                       type: integer
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * @swagger
 * /admin/providers:
 *   get:
 *     summary: List all providers (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, SUSPENDED]
 *     responses:
 *       200:
 *         description: List of providers
 */
router.get('/providers', adminController.listProviders);

/**
 * @swagger
 * /admin/providers/{providerId}:
 *   get:
 *     summary: Get provider details (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider details
 */
router.get('/providers/:providerId', adminController.getProviderDetail);

/**
 * @swagger
 * /admin/providers/{providerId}/approve:
 *   post:
 *     summary: Approve a provider
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider approved
 */
router.post('/providers/:providerId/approve', adminController.approveProvider);

/**
 * @swagger
 * /admin/providers/{providerId}/reject:
 *   post:
 *     summary: Reject a provider
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
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
 *         description: Provider rejected
 */
router.post('/providers/:providerId/reject', adminController.rejectProvider);

/**
 * @swagger
 * /admin/providers/{providerId}/suspend:
 *   post:
 *     summary: Suspend a provider
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
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
 *               until:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Provider suspended
 */
router.post('/providers/:providerId/suspend', adminController.suspendProvider);

/**
 * @swagger
 * /admin/providers/{providerId}/unsuspend:
 *   post:
 *     summary: Unsuspend a provider
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider unsuspended
 */
router.post('/providers/:providerId/unsuspend', adminController.unsuspendProvider);

/**
 * @swagger
 * /admin/bookings:
 *   get:
 *     summary: List all bookings (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of bookings
 */
router.get('/bookings', adminController.listBookings);

/**
 * @swagger
 * /admin/bookings/{bookingId}:
 *   get:
 *     summary: Get booking details (admin)
 *     tags: [Admin]
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
 */
router.get('/bookings/:bookingId', adminController.getBookingDetail);

/**
 * @swagger
 * /admin/payouts:
 *   get:
 *     summary: List payouts
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, REJECTED]
 *     responses:
 *       200:
 *         description: List of payouts
 */
router.get('/payouts', adminController.listPayouts);

/**
 * @swagger
 * /admin/payouts/{payoutId}/process:
 *   post:
 *     summary: Process a payout
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               referenceNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payout processed
 */
router.post('/payouts/:payoutId/process', adminController.processPayout);

/**
 * @swagger
 * /admin/payouts/{payoutId}/reject:
 *   post:
 *     summary: Reject a payout
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
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
 *         description: Payout rejected
 */
router.post('/payouts/:payoutId/reject', adminController.rejectPayout);

// ============================================================================
// SHOP MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /admin/shops:
 *   get:
 *     summary: List all shops
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, SUSPENDED, REJECTED]
 *     responses:
 *       200:
 *         description: List of shops
 */
router.get('/shops', shopsController.adminListShops);

/**
 * @swagger
 * /admin/shops/{shopId}:
 *   get:
 *     summary: Get shop details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shop details
 */
router.get('/shops/:shopId', shopsController.adminGetShop);

/**
 * @swagger
 * /admin/shops/{shopId}/approve:
 *   post:
 *     summary: Approve a shop
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shop approved
 */
router.post('/shops/:shopId/approve', shopsController.adminApproveShop);

/**
 * @swagger
 * /admin/shops/{shopId}/reject:
 *   post:
 *     summary: Reject a shop
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shop rejected
 */
router.post('/shops/:shopId/reject', shopsController.adminRejectShop);

/**
 * @swagger
 * /admin/shops/{shopId}/suspend:
 *   post:
 *     summary: Suspend a shop
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shop suspended
 */
router.post('/shops/:shopId/suspend', shopsController.adminSuspendShop);

/**
 * @swagger
 * /admin/shop-payouts:
 *   get:
 *     summary: List shop payouts
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *     responses:
 *       200:
 *         description: List of shop payouts
 */
router.get('/shop-payouts', shopsController.adminListShopPayouts);

/**
 * @swagger
 * /admin/shop-payouts/{payoutId}/process:
 *   post:
 *     summary: Process a shop payout
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [referenceNumber]
 *             properties:
 *               referenceNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payout processed
 */
router.post('/shop-payouts/:payoutId/process', shopsController.adminProcessPayout);

/**
 * @swagger
 * /admin/shop-payouts/{payoutId}/reject:
 *   post:
 *     summary: Reject a shop payout
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payout rejected
 */
router.post('/shop-payouts/:payoutId/reject', shopsController.adminRejectPayout);

/**
 * @swagger
 * /admin/reports:
 *   get:
 *     summary: List reports
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, INVESTIGATING, RESOLVED, DISMISSED]
 *     responses:
 *       200:
 *         description: List of reports
 */
router.get('/reports', adminController.listReports);

/**
 * @swagger
 * /admin/reports/{reportId}:
 *   get:
 *     summary: Get report details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report details
 */
router.get('/reports/:reportId', adminController.getReportDetail);

/**
 * @swagger
 * /admin/reports/{reportId}/resolve:
 *   post:
 *     summary: Resolve a report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution:
 *                 type: string
 *               actionTaken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report resolved
 */
router.post('/reports/:reportId/assign', adminController.assignReport);
router.post('/reports/:reportId/resolve', adminController.resolveReport);
router.post('/reports/:reportId/dismiss', adminController.dismissReport);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [CUSTOMER, PROVIDER, ADMIN]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', adminController.listUsers);

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Get user details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 */
router.get('/users/:userId', adminController.getUserDetail);

/**
 * @swagger
 * /admin/users/{userId}/suspend:
 *   post:
 *     summary: Suspend a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User suspended
 */
router.post('/users/:userId/suspend', adminController.suspendUser);

/**
 * @swagger
 * /admin/services:
 *   get:
 *     summary: List all services (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of services
 *   post:
 *     summary: Create a service
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, baseDuration, basePrice]
 *             properties:
 *               name:
 *                 type: string
 *               nameKo:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               baseDuration:
 *                 type: integer
 *               basePrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Service created
 */
router.get('/services', adminController.listServicesAdmin);
router.post('/services', adminController.createService);

/**
 * @swagger
 * /admin/services/{serviceId}:
 *   patch:
 *     summary: Update a service
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service updated
 *   delete:
 *     summary: Delete a service
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service deleted
 */
router.patch('/services/:serviceId', adminController.updateService);
router.delete('/services/:serviceId', adminController.deleteService);

/**
 * @swagger
 * /admin/promotions:
 *   get:
 *     summary: List all promotions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of promotions
 *   post:
 *     summary: Create a promotion
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, discountType, discountValue, startDate, endDate]
 *             properties:
 *               code:
 *                 type: string
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               discountValue:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               maxUses:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Promotion created
 */
router.get('/promotions', adminController.listPromotions);
router.post('/promotions', adminController.createPromotion);

/**
 * @swagger
 * /admin/promotions/{promotionId}:
 *   patch:
 *     summary: Update a promotion
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: promotionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promotion updated
 *   delete:
 *     summary: Delete a promotion
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: promotionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promotion deleted
 */
router.patch('/promotions/:promotionId', adminController.updatePromotion);
router.delete('/promotions/:promotionId', adminController.deletePromotion);

export default router;
