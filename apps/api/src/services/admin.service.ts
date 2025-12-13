// ============================================================================
// Admin Service - Placeholder
// ============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

interface ListQuery {
  status?: string;
  severity?: string;
}

interface SuspendData {
  until?: string;
  reason?: string;
}

interface PayoutData {
  referenceNumber?: string;
}

interface ResolveData {
  resolution?: string;
  actionTaken?: string;
}

class AdminService {
  async getDashboard() {
    const [todayBookings, totalProviders, pendingProviders, openReports] = await Promise.all([
      prisma.booking.count({ where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      prisma.provider.count({ where: { status: 'APPROVED' } }),
      prisma.provider.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
    ]);
    return { todayBookings, totalProviders, pendingProviders, openReports };
  }

  async listProviders(query: ListQuery) {
    const where: Prisma.ProviderWhereInput = {};
    if (query.status) where.status = query.status as Prisma.EnumProviderStatusFilter;
    const providers = await prisma.provider.findMany({ where, include: { user: true }, take: 50 });
    return { data: providers, pagination: { page: 1, limit: 50, total: providers.length } };
  }

  async getProviderDetail(providerId: string) {
    const provider = await prisma.provider.findUnique({ where: { id: providerId }, include: { user: true, documents: true, services: { include: { service: true } } } });
    if (!provider) throw new AppError('Provider not found', 404);
    return provider;
  }

  async approveProvider(providerId: string, adminId: string) {
    await prisma.provider.update({ where: { id: providerId }, data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: adminId } });
  }

  async rejectProvider(providerId: string, reason: string) {
    await prisma.provider.update({ where: { id: providerId }, data: { status: 'REJECTED', rejectedAt: new Date(), rejectedReason: reason } });
  }

  async suspendProvider(providerId: string, data: SuspendData) {
    await prisma.provider.update({ where: { id: providerId }, data: { status: 'SUSPENDED', suspendedAt: new Date(), suspendedUntil: data.until ? new Date(data.until) : null, suspendedReason: data.reason } });
  }

  async unsuspendProvider(providerId: string) {
    await prisma.provider.update({ where: { id: providerId }, data: { status: 'APPROVED', suspendedAt: null, suspendedUntil: null, suspendedReason: null } });
  }

  async listBookings(_query: ListQuery) {
    const bookings = await prisma.booking.findMany({ include: { customer: true, provider: { include: { user: true } }, service: true }, orderBy: { createdAt: 'desc' }, take: 50 });
    return { data: bookings, pagination: { page: 1, limit: 50, total: bookings.length } };
  }

  async getBookingDetail(bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { customer: true, provider: { include: { user: true } }, service: true, payment: true } });
    if (!booking) throw new AppError('Booking not found', 404);
    return booking;
  }

  async listPayouts(query: ListQuery) {
    const where: Prisma.PayoutWhereInput = {};
    if (query.status) where.status = query.status as Prisma.EnumPayoutStatusFilter;
    const payouts = await prisma.payout.findMany({ where, include: { provider: { include: { user: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
    return { data: payouts, pagination: { page: 1, limit: 50, total: payouts.length } };
  }

  async processPayout(payoutId: string, adminId: string, data: PayoutData) {
    await prisma.payout.update({ where: { id: payoutId }, data: { status: 'COMPLETED', processedAt: new Date(), processedBy: adminId, referenceNumber: data.referenceNumber } });
  }

  async rejectPayout(payoutId: string, reason: string) {
    const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new AppError('Payout not found', 404);
    await prisma.payout.update({ where: { id: payoutId }, data: { status: 'FAILED', failedAt: new Date(), failureReason: reason } });
    await prisma.provider.update({ where: { id: payout.providerId }, data: { balance: { increment: payout.amount } } });
  }

  async listReports(query: ListQuery) {
    const where: Prisma.ReportWhereInput = {};
    if (query.status) where.status = query.status as Prisma.EnumReportStatusFilter;
    if (query.severity) where.severity = query.severity as Prisma.EnumReportSeverityFilter;
    const reports = await prisma.report.findMany({ where, include: { reporter: true, reported: true, booking: true }, orderBy: { createdAt: 'desc' }, take: 50 });
    return { data: reports, pagination: { page: 1, limit: 50, total: reports.length } };
  }

  async getReportDetail(reportId: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId }, include: { reporter: true, reported: true, booking: true } });
    if (!report) throw new AppError('Report not found', 404);
    return report;
  }

  async assignReport(reportId: string, adminId: string) {
    await prisma.report.update({ where: { id: reportId }, data: { assignedTo: adminId, assignedAt: new Date(), status: 'INVESTIGATING' } });
  }

  async resolveReport(reportId: string, adminId: string, data: ResolveData) {
    await prisma.report.update({ where: { id: reportId }, data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: adminId, resolution: data.resolution, actionTaken: data.actionTaken } });
  }

  async dismissReport(reportId: string, adminId: string, reason: string) {
    await prisma.report.update({ where: { id: reportId }, data: { status: 'DISMISSED', resolvedAt: new Date(), resolvedBy: adminId, resolution: reason } });
  }

  async listUsers(_query: ListQuery) {
    const users = await prisma.user.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
    return { data: users, pagination: { page: 1, limit: 50, total: users.length } };
  }

  async getUserDetail(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async suspendUser(userId: string, _data: SuspendData) {
    await prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
  }

  async listServices() { return prisma.service.findMany(); }
  async createService(data: Prisma.ServiceCreateInput) { return prisma.service.create({ data }); }
  async updateService(serviceId: string, data: Prisma.ServiceUpdateInput) { return prisma.service.update({ where: { id: serviceId }, data }); }
  async deleteService(serviceId: string) { await prisma.service.delete({ where: { id: serviceId } }); }
  async listPromotions() { return prisma.promotion.findMany(); }
  async createPromotion(data: Prisma.PromotionCreateInput) { return prisma.promotion.create({ data }); }
  async updatePromotion(promotionId: string, data: Prisma.PromotionUpdateInput) { return prisma.promotion.update({ where: { id: promotionId }, data }); }
  async deletePromotion(promotionId: string) { await prisma.promotion.delete({ where: { id: promotionId } }); }
}

export const adminService = new AdminService();
