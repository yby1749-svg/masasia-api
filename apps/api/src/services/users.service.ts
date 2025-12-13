// ============================================================================
// Users Service
// ============================================================================

import { Prisma, Gender } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import bcrypt from 'bcryptjs';

interface ProfileData {
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  dateOfBirth?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
}

interface AddressData {
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, phone: true, phoneVerified: true, emailVerified: true,
        firstName: true, lastName: true, avatarUrl: true, gender: true, dateOfBirth: true,
        emergencyName: true, emergencyPhone: true, emergencyRelation: true,
        role: true, status: true, createdAt: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async updateProfile(userId: string, data: ProfileData) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        emergencyRelation: data.emergencyRelation,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true, avatarUrl: true, gender: true,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new AppError('Current password is incorrect', 400);
    
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    await prisma.user.update({ where: { id: userId }, data: { fcmToken } });
  }

  async getAddresses(userId: string) {
    return prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  async addAddress(userId: string, data: AddressData) {
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.address.create({ data: { ...data, userId } });
  }

  async updateAddress(userId: string, addressId: string, data: Prisma.AddressUpdateInput) {
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new AppError('Address not found', 404);
    
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.address.update({ where: { id: addressId }, data });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new AppError('Address not found', 404);
    await prisma.address.delete({ where: { id: addressId } });
  }
}

export const userService = new UserService();
