// ============================================================================
// Auth Controller
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { z } from 'zod';

// Password complexity validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
  password: passwordSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['CUSTOMER', 'PROVIDER']).default('CUSTOMER'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// Register
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Refresh token
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const result = await authService.refreshToken(data.refreshToken);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Logout
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// Forgot password
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    next(error);
  }
};

// Reset password schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

// Reset password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(data.token, data.password);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

// Send phone OTP
export const sendPhoneOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await authService.sendPhoneOTP(req.user!.id);
    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    next(error);
  }
};

// Verify phone OTP
export const verifyPhoneOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { otp } = req.body;
    await authService.verifyPhoneOTP(req.user!.id, otp);
    res.json({ success: true, message: 'Phone verified' });
  } catch (error) {
    next(error);
  }
};

// Send email verification
export const sendEmailVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await authService.sendEmailVerification(req.user!.id);
    res.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    next(error);
  }
};

// Verify email
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;
    await authService.verifyEmail(token);
    res.json({ success: true, message: 'Email verified' });
  } catch (error) {
    next(error);
  }
};

// Google OAuth login
const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

export const googleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = googleAuthSchema.parse(req.body);
    const result = await authService.googleAuth(data.idToken);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
