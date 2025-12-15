// ============================================================================
// Shops Controller - Shop Owner Management
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { shopsService } from '../services/shops.service.js';

// ============================================================================
// Shop Owner Endpoints
// ============================================================================

export const registerShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await shopsService.registerShop(req.user!.id, req.body);
    res.status(201).json({ success: true, data: shop });
  } catch (error) { next(error); }
};

export const getMyShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await shopsService.getMyShop(req.user!.id);
    res.json({ success: true, data: shop });
  } catch (error) { next(error); }
};

export const updateMyShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await shopsService.updateMyShop(req.user!.id, req.body);
    res.json({ success: true, data: shop });
  } catch (error) { next(error); }
};

export const updateBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await shopsService.updateBankAccount(req.user!.id, req.body);
    res.json({ success: true, data: shop });
  } catch (error) { next(error); }
};

// ============================================================================
// Therapist Management
// ============================================================================

export const getTherapists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await shopsService.getTherapists(req.user!.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const removeTherapist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await shopsService.removeTherapist(req.user!.id, req.params.providerId);
    res.json({ success: true, message: 'Therapist removed from shop' });
  } catch (error) { next(error); }
};

// ============================================================================
// Invitations
// ============================================================================

export const sendInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invitation = await shopsService.sendInvitation(req.user!.id, req.body);
    res.status(201).json({ success: true, data: invitation });
  } catch (error) { next(error); }
};

export const getInvitations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await shopsService.getInvitations(req.user!.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const cancelInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await shopsService.cancelInvitation(req.user!.id, req.params.invitationId);
    res.json({ success: true, message: 'Invitation cancelled' });
  } catch (error) { next(error); }
};

// ============================================================================
// Earnings & Payouts
// ============================================================================

export const getEarnings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await shopsService.getEarnings(req.user!.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const getEarningsSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const summary = await shopsService.getEarningsSummary(req.user!.id);
    res.json({ success: true, data: summary });
  } catch (error) { next(error); }
};

export const getPayouts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await shopsService.getPayouts(req.user!.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const requestPayout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payout = await shopsService.requestPayout(req.user!.id, req.body);
    res.status(201).json({ success: true, data: payout });
  } catch (error) { next(error); }
};

// ============================================================================
// Provider-side: Shop & Invitation Handling
// ============================================================================

export const getProviderShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await shopsService.getProviderShop(req.user!.id);
    res.json({ success: true, data: shop });
  } catch (error) { next(error); }
};

export const getProviderInvitations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invitations = await shopsService.getProviderInvitations(req.user!.id);
    res.json({ success: true, data: invitations });
  } catch (error) { next(error); }
};

export const acceptInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const provider = await shopsService.acceptInvitation(req.user!.id, req.params.invitationId);
    res.json({ success: true, data: provider, message: 'Invitation accepted' });
  } catch (error) { next(error); }
};

export const rejectInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await shopsService.rejectInvitation(req.user!.id, req.params.invitationId);
    res.json({ success: true, message: 'Invitation rejected' });
  } catch (error) { next(error); }
};

export const leaveShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await shopsService.leaveShop(req.user!.id);
    res.json({ success: true, message: 'Left shop successfully' });
  } catch (error) { next(error); }
};

// ============================================================================
// Admin: Shop Management
// ============================================================================

export const adminListShops = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await shopsService.adminListShops(req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const adminGetShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await shopsService.adminGetShop(req.params.shopId);
    res.json({ success: true, data: shop });
  } catch (error) { next(error); }
};

export const adminApproveShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await shopsService.adminApproveShop(req.params.shopId, req.user!.id);
    res.json({ success: true, data: shop, message: 'Shop approved' });
  } catch (error) { next(error); }
};

export const adminRejectShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await shopsService.adminRejectShop(req.params.shopId, req.user!.id, req.body.reason);
    res.json({ success: true, data: shop, message: 'Shop rejected' });
  } catch (error) { next(error); }
};

export const adminSuspendShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await shopsService.adminSuspendShop(req.params.shopId, req.body.reason);
    res.json({ success: true, data: shop, message: 'Shop suspended' });
  } catch (error) { next(error); }
};

export const adminListShopPayouts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await shopsService.adminListShopPayouts(req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const adminProcessPayout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payout = await shopsService.adminProcessPayout(req.params.payoutId, req.user!.id, req.body.referenceNumber);
    res.json({ success: true, data: payout, message: 'Payout processed' });
  } catch (error) { next(error); }
};

export const adminRejectPayout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payout = await shopsService.adminRejectPayout(req.params.payoutId, req.body.reason);
    res.json({ success: true, data: payout, message: 'Payout rejected' });
  } catch (error) { next(error); }
};
