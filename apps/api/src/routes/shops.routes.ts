// ============================================================================
// Shop Routes - Shop Owner Management
// ============================================================================

import { Router } from 'express';
import { authenticate, requireShopOwner } from '../middleware/auth.js';
import * as shopsController from '../controllers/shops.controller.js';

const router = Router();

// ============================================================================
// SHOP REGISTRATION
// ============================================================================

/**
 * @swagger
 * /shops/register:
 *   post:
 *     summary: Register as a shop owner
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Shop registered successfully (pending approval)
 *       400:
 *         description: Already owns a shop or is a provider
 */
router.post('/register', authenticate, shopsController.registerShop);

// ============================================================================
// SHOP OWNER MANAGEMENT (Requires approved shop)
// ============================================================================

/**
 * @swagger
 * /shops/me:
 *   get:
 *     summary: Get my shop profile
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shop profile
 *   patch:
 *     summary: Update my shop profile
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shop updated
 */
router.get('/me', authenticate, requireShopOwner, shopsController.getMyShop);
router.patch('/me', authenticate, requireShopOwner, shopsController.updateMyShop);

/**
 * @swagger
 * /shops/me/bank-account:
 *   patch:
 *     summary: Update shop bank account info
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bank account updated
 */
router.patch('/me/bank-account', authenticate, requireShopOwner, shopsController.updateBankAccount);

// ============================================================================
// THERAPIST MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /shops/me/therapists:
 *   get:
 *     summary: List therapists in my shop
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of therapists
 */
router.get('/me/therapists', authenticate, requireShopOwner, shopsController.getTherapists);

/**
 * @swagger
 * /shops/me/therapists/{providerId}:
 *   delete:
 *     summary: Remove therapist from shop
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Therapist removed
 */
router.delete('/me/therapists/:providerId', authenticate, requireShopOwner, shopsController.removeTherapist);

// ============================================================================
// INVITATIONS
// ============================================================================

/**
 * @swagger
 * /shops/me/invitations:
 *   get:
 *     summary: List sent invitations
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invitations
 *   post:
 *     summary: Send invitation to provider
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetEmail:
 *                 type: string
 *               targetProviderId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invitation sent
 */
router.get('/me/invitations', authenticate, requireShopOwner, shopsController.getInvitations);
router.post('/me/invitations', authenticate, requireShopOwner, shopsController.sendInvitation);

/**
 * @swagger
 * /shops/me/invitations/{invitationId}:
 *   delete:
 *     summary: Cancel invitation
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invitation cancelled
 */
router.delete('/me/invitations/:invitationId', authenticate, requireShopOwner, shopsController.cancelInvitation);

// ============================================================================
// EARNINGS & PAYOUTS
// ============================================================================

/**
 * @swagger
 * /shops/me/earnings:
 *   get:
 *     summary: Get shop earnings list
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings list
 */
router.get('/me/earnings', authenticate, requireShopOwner, shopsController.getEarnings);

/**
 * @swagger
 * /shops/me/earnings/summary:
 *   get:
 *     summary: Get shop earnings summary
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings summary
 */
router.get('/me/earnings/summary', authenticate, requireShopOwner, shopsController.getEarningsSummary);

/**
 * @swagger
 * /shops/me/payouts:
 *   get:
 *     summary: Get payout history
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payout history
 *   post:
 *     summary: Request payout
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, method]
 *             properties:
 *               amount:
 *                 type: number
 *               method:
 *                 type: string
 *                 enum: [BANK_TRANSFER, GCASH, PAYMAYA]
 *     responses:
 *       201:
 *         description: Payout requested
 */
router.get('/me/payouts', authenticate, requireShopOwner, shopsController.getPayouts);
router.post('/me/payouts', authenticate, requireShopOwner, shopsController.requestPayout);

export default router;
