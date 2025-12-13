// ============================================================================
// Service Routes
// ============================================================================

import { Router } from 'express';
import * as serviceController from '../controllers/services.controller.js';

const router = Router();

/**
 * @swagger
 * /services:
 *   get:
 *     summary: List all services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of services
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
 *                     $ref: '#/components/schemas/Service'
 */
router.get('/', serviceController.listServices);

/**
 * @swagger
 * /services/{serviceId}:
 *   get:
 *     summary: Get service details
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service details
 *       404:
 *         description: Service not found
 */
router.get('/:serviceId', serviceController.getServiceDetail);

/**
 * @swagger
 * /services/areas:
 *   get:
 *     summary: Get available service areas
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: List of service areas
 */
router.get('/areas', serviceController.getServiceAreas);

/**
 * @swagger
 * /services/promotions/validate:
 *   post:
 *     summary: Validate a promo code
 *     tags: [Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Promo code is valid
 *       400:
 *         description: Invalid promo code
 */
router.post('/promotions/validate', serviceController.validatePromoCode);

export default router;
