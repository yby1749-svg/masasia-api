// ============================================================================
// Reports Service
// ============================================================================

import { ReportType } from '@prisma/client';
import { prisma } from '../config/database.js';

interface ReportData {
  reportedId: string;
  bookingId?: string;
  type: ReportType;
  description: string;
}

class ReportService {
  async createReport(reporterId: string, data: ReportData) {
    return prisma.report.create({
      data: { reporterId, reportedId: data.reportedId, bookingId: data.bookingId, type: data.type, description: data.description },
    });
  }

  async getMyReports(userId: string) {
    return prisma.report.findMany({ where: { reporterId: userId }, orderBy: { createdAt: 'desc' } });
  }
}

export const reportService = new ReportService();
