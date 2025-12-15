// ============================================================================
// Authentication Middleware
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// Verify JWT token
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JwtPayload;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(401).json({ error: 'Account is not active' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    next(error);
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (user && user.status === 'ACTIVE') {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch (_error) {
    // Ignore errors for optional auth
    next();
  }
};

// Require specific role
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Require provider role and approved status
export const requireProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'PROVIDER') {
    res.status(403).json({ error: 'Provider access required' });
    return;
  }

  const provider = await prisma.provider.findUnique({
    where: { userId: req.user.id },
    select: { status: true },
  });

  if (!provider || provider.status !== 'APPROVED') {
    res.status(403).json({ error: 'Provider not approved' });
    return;
  }

  next();
};

// Require admin role
export const requireAdmin = requireRole('ADMIN');

// Require shop owner role and approved shop
export const requireShopOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'SHOP_OWNER') {
    res.status(403).json({ error: 'Shop owner access required' });
    return;
  }

  const shop = await prisma.shop.findUnique({
    where: { ownerId: req.user.id },
    select: { id: true, status: true },
  });

  if (!shop) {
    res.status(403).json({ error: 'Shop not found' });
    return;
  }

  if (shop.status !== 'APPROVED') {
    res.status(403).json({ error: 'Shop not approved' });
    return;
  }

  next();
};
