// ============================================================================
// Services Service
// ============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

interface ServiceQuery {
  category?: string;
}

class ServiceService {
  async listServices(query: ServiceQuery) {
    const where: Prisma.ServiceWhereInput = { isActive: true };
    if (query.category) where.category = query.category as Prisma.EnumServiceCategoryFilter;
    return prisma.service.findMany({ where, orderBy: { sortOrder: 'asc' } });
  }

  async getServiceDetail(serviceId: string) {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new AppError('Service not found', 404);
    return service;
  }

  async getServiceAreas() {
    return prisma.serviceArea.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  async validatePromoCode(code: string, amount: number) {
    const promo = await prisma.promotion.findUnique({ where: { code } });
    if (!promo || !promo.isActive) return { valid: false, message: 'Invalid promo code' };
    if (new Date() < promo.startsAt || new Date() > promo.endsAt) return { valid: false, message: 'Promo expired' };
    if (promo.minOrderAmount && amount < promo.minOrderAmount) return { valid: false, message: `Minimum order ₱${promo.minOrderAmount}` };
    
    let discount = promo.discountType === 'PERCENTAGE' ? amount * promo.discountValue / 100 : promo.discountValue;
    if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
    
    return { valid: true, discount, message: `₱${discount} off applied` };
  }
}

export const serviceService = new ServiceService();
