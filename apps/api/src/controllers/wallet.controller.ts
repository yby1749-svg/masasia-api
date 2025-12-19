import { Request, Response, NextFunction } from 'express';
import * as walletService from '../services/wallet.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { prisma } from '../config/database.js';

// ============================================================================
// Provider Wallet Controllers
// ============================================================================

/**
 * Get provider wallet balance and info
 */
export async function getProviderWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    const provider = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!provider) {
      throw new AppError('Provider not found', 404);
    }

    const balance = await walletService.getProviderWalletBalance(provider.id);
    const feePercentage = walletService.getPlatformFeePercentage();

    res.json({
      success: true,
      data: {
        ...balance,
        platformFeePercentage: feePercentage,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get provider wallet transactions
 */
export async function getProviderWalletTransactions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const provider = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!provider) {
      throw new AppError('Provider not found', 404);
    }

    const result = await walletService.getProviderWalletTransactions(provider.id, page, limit);

    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Top up provider wallet
 */
export async function topUpProviderWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { amount, paymentMethod, paymentRef } = req.body;

    if (!amount || amount <= 0) {
      throw new AppError('Invalid amount', 400);
    }

    if (!paymentMethod) {
      throw new AppError('Payment method is required', 400);
    }

    const provider = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!provider) {
      throw new AppError('Provider not found', 404);
    }

    const result = await walletService.topUpProviderWallet(provider.id, {
      amount,
      paymentMethod,
      paymentRef,
    });

    res.json({
      success: true,
      message: 'Wallet topped up successfully',
      data: {
        transaction: result.transaction,
        newBalance: result.newBalance,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Check if provider can accept cash booking (has enough balance for fee)
 */
export async function checkProviderCanAcceptCash(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const { serviceAmount } = req.query;

    if (!serviceAmount) {
      throw new AppError('Service amount is required', 400);
    }

    const provider = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true, shopId: true },
    });

    if (!provider) {
      throw new AppError('Provider not found', 404);
    }

    // For shop-affiliated providers, check shop balance
    if (provider.shopId) {
      const result = await walletService.checkShopBalanceForFee(
        provider.shopId,
        parseFloat(serviceAmount as string)
      );
      res.json({
        success: true,
        data: {
          ...result,
          walletType: 'shop',
          message: result.hasEnough
            ? 'Shop has sufficient balance'
            : `Shop needs to top up ₱${(result.required - result.current).toFixed(2)}`,
        },
      });
    } else {
      // Independent provider
      const result = await walletService.checkProviderBalanceForFee(
        provider.id,
        parseFloat(serviceAmount as string)
      );
      res.json({
        success: true,
        data: {
          ...result,
          walletType: 'provider',
          message: result.hasEnough
            ? 'Sufficient balance'
            : `You need to top up ₱${(result.required - result.current).toFixed(2)}`,
        },
      });
    }
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Shop Wallet Controllers
// ============================================================================

/**
 * Get shop wallet balance and info
 */
export async function getShopWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    const shop = await prisma.shop.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    const balance = await walletService.getShopWalletBalance(shop.id);
    const feePercentage = walletService.getPlatformFeePercentage();

    res.json({
      success: true,
      data: {
        ...balance,
        platformFeePercentage: feePercentage,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get shop wallet transactions
 */
export async function getShopWalletTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const shop = await prisma.shop.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    const result = await walletService.getShopWalletTransactions(shop.id, page, limit);

    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Top up shop wallet
 */
export async function topUpShopWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { amount, paymentMethod, paymentRef } = req.body;

    if (!amount || amount <= 0) {
      throw new AppError('Invalid amount', 400);
    }

    if (!paymentMethod) {
      throw new AppError('Payment method is required', 400);
    }

    const shop = await prisma.shop.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    const result = await walletService.topUpShopWallet(shop.id, {
      amount,
      paymentMethod,
      paymentRef,
    });

    res.json({
      success: true,
      message: 'Shop wallet topped up successfully',
      data: {
        transaction: result.transaction,
        newBalance: result.newBalance,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Utility Controllers
// ============================================================================

/**
 * Calculate platform fee for an amount
 */
export async function calculateFee(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount } = req.query;

    if (!amount) {
      throw new AppError('Amount is required', 400);
    }

    const serviceAmount = parseFloat(amount as string);
    const fee = walletService.calculatePlatformFee(serviceAmount);
    const percentage = walletService.getPlatformFeePercentage();

    res.json({
      success: true,
      data: {
        serviceAmount,
        platformFee: fee,
        platformFeePercentage: percentage,
      },
    });
  } catch (error) {
    next(error);
  }
}
