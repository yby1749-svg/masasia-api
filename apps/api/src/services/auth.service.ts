// ============================================================================
// Auth Service
// ============================================================================

import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';

interface RegisterData {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'CUSTOMER' | 'PROVIDER';
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'secret';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
  private readonly JWT_EXPIRES_IN = 900; // 15 minutes in seconds
  private readonly JWT_REFRESH_EXPIRES_IN = 604800; // 7 days in seconds

  // Generate tokens
  private generateTokens(user: { id: string; email: string; role: string }) {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessOptions: SignOptions = { expiresIn: this.JWT_EXPIRES_IN };
    const refreshOptions: SignOptions = { expiresIn: this.JWT_REFRESH_EXPIRES_IN };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, accessOptions);
    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, refreshOptions);

    return { accessToken, refreshToken };
  }

  // Register
  async register(data: RegisterData) {
    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new AppError('Email already exists', 409);
    }

    // Check if phone exists
    const existingPhone = await prisma.user.findUnique({
      where: { phone: data.phone },
    });
    if (existingPhone) {
      throw new AppError('Phone number already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return {
      userId: user.id,
      message: 'Registration successful. Please verify your phone number.',
    };
  }

  // Login
  async login(email: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check status
    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is not active', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // Refresh token
  async refreshToken(refreshToken: string) {
    // Verify token
    try {
      jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as TokenPayload;
    } catch (_error) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt) {
      throw new AppError('Invalid refresh token', 401);
    }

    if (new Date() > storedToken.expiresAt) {
      throw new AppError('Refresh token expired', 401);
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    const tokens = this.generateTokens(storedToken.user);

    // Save new refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: storedToken.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 900,
    };
  }

  // Logout
  async logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  }

  // Forgot password
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const resetToken = uuidv4();

    // Store in Redis with 1 hour expiry
    await redis.set(`password-reset:${resetToken}`, user.id, 'EX', 3600);

    // TODO: Send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  // Reset password
  async resetPassword(token: string, newPassword: string) {
    const userId = await redis.get(`password-reset:${token}`);

    if (!userId) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Delete token
    await redis.del(`password-reset:${token}`);

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  }

  // Send phone OTP
  async sendPhoneOTP(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis with 5 minute expiry
    await redis.set(`phone-otp:${userId}`, otp, 'EX', 300);

    // TODO: Send SMS via Twilio
    console.log(`Phone OTP for ${user.phone}: ${otp}`);
  }

  // Verify phone OTP
  async verifyPhoneOTP(userId: string, otp: string) {
    const storedOTP = await redis.get(`phone-otp:${userId}`);

    if (!storedOTP || storedOTP !== otp) {
      throw new AppError('Invalid OTP', 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true },
    });

    await redis.del(`phone-otp:${userId}`);
  }

  // Send email verification
  async sendEmailVerification(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const verifyToken = uuidv4();

    await redis.set(`email-verify:${verifyToken}`, userId, 'EX', 86400); // 24 hours

    // TODO: Send email
    console.log(`Email verification token for ${user.email}: ${verifyToken}`);
  }

  // Verify email
  async verifyEmail(token: string) {
    const userId = await redis.get(`email-verify:${token}`);

    if (!userId) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    await redis.del(`email-verify:${token}`);
  }
}

export const authService = new AuthService();
