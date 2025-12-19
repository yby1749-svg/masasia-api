import { Router } from 'express';
import { authenticate, requireRole, requireProvider, requireShopOwner } from '../middleware/auth.js';
import * as walletController from '../controllers/wallet.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Provider Wallet Routes
// ============================================================================

// Get provider wallet balance
router.get(
  '/provider/balance',
  requireProvider,
  walletController.getProviderWallet
);

// Get provider wallet transactions
router.get(
  '/provider/transactions',
  requireProvider,
  walletController.getProviderWalletTransactions
);

// Top up provider wallet
router.post(
  '/provider/topup',
  requireProvider,
  walletController.topUpProviderWallet
);

// Check if provider can accept cash booking
router.get(
  '/provider/check-cash',
  requireProvider,
  walletController.checkProviderCanAcceptCash
);

// ============================================================================
// Shop Wallet Routes
// ============================================================================

// Get shop wallet balance
router.get(
  '/shop/balance',
  requireShopOwner,
  walletController.getShopWallet
);

// Get shop wallet transactions
router.get(
  '/shop/transactions',
  requireShopOwner,
  walletController.getShopWalletTransactions
);

// Top up shop wallet
router.post(
  '/shop/topup',
  requireShopOwner,
  walletController.topUpShopWallet
);

// ============================================================================
// Utility Routes
// ============================================================================

// Calculate platform fee
router.get('/calculate-fee', walletController.calculateFee);

export default router;
