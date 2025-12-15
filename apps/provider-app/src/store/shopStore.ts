import {create} from 'zustand';
import {
  providerShopApi,
  shopOwnerApi,
  type Shop,
  type ShopInvitation,
  type ShopTherapist,
  type ShopEarningsSummary,
  type ShopPayout,
} from '@api/shops';

// ============================================================================
// Provider Shop Store (for therapists in a shop)
// ============================================================================

interface ProviderShopState {
  myShop: Shop | null;
  invitations: ShopInvitation[];
  isLoading: boolean;
  error: string | null;

  fetchMyShop: () => Promise<void>;
  fetchInvitations: () => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  rejectInvitation: (invitationId: string) => Promise<void>;
  leaveShop: () => Promise<void>;
  clearError: () => void;
}

export const useProviderShopStore = create<ProviderShopState>((set, _get) => ({
  myShop: null,
  invitations: [],
  isLoading: false,
  error: null,

  fetchMyShop: async () => {
    set({isLoading: true, error: null});
    try {
      const response = await providerShopApi.getMyShop();
      set({myShop: response.data.data, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch shop info';
      set({error: message, isLoading: false});
    }
  },

  fetchInvitations: async () => {
    set({isLoading: true, error: null});
    try {
      const response = await providerShopApi.getInvitations();
      set({invitations: response.data.data, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch invitations';
      set({error: message, isLoading: false});
    }
  },

  acceptInvitation: async (invitationId: string) => {
    set({isLoading: true, error: null});
    try {
      await providerShopApi.acceptInvitation(invitationId);
      // Refresh shop info after accepting
      const shopResponse = await providerShopApi.getMyShop();
      set(state => ({
        myShop: shopResponse.data.data,
        invitations: state.invitations.filter(inv => inv.id !== invitationId),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to accept invitation';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  rejectInvitation: async (invitationId: string) => {
    set({isLoading: true, error: null});
    try {
      await providerShopApi.rejectInvitation(invitationId);
      set(state => ({
        invitations: state.invitations.filter(inv => inv.id !== invitationId),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to reject invitation';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  leaveShop: async () => {
    set({isLoading: true, error: null});
    try {
      await providerShopApi.leaveShop();
      set({myShop: null, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to leave shop';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  clearError: () => set({error: null}),
}));

// ============================================================================
// Shop Owner Store
// ============================================================================

interface ShopOwnerState {
  shop: Shop | null;
  therapists: ShopTherapist[];
  invitations: ShopInvitation[];
  earningsSummary: ShopEarningsSummary | null;
  payouts: ShopPayout[];
  isLoading: boolean;
  error: string | null;

  // Shop management
  fetchShop: () => Promise<void>;
  updateShop: (data: Partial<Shop>) => Promise<void>;
  updateBankAccount: (data: {
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    gcashNumber?: string;
    paymayaNumber?: string;
  }) => Promise<void>;

  // Therapist management
  fetchTherapists: () => Promise<void>;
  removeTherapist: (providerId: string) => Promise<void>;

  // Invitation management
  fetchInvitations: () => Promise<void>;
  sendInvitation: (data: {
    targetEmail?: string;
    targetProviderId?: string;
    message?: string;
  }) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;

  // Earnings & payouts
  fetchEarningsSummary: () => Promise<void>;
  fetchPayouts: () => Promise<void>;
  requestPayout: (data: {amount: number; method: string}) => Promise<void>;

  clearError: () => void;
}

export const useShopOwnerStore = create<ShopOwnerState>((set, _get) => ({
  shop: null,
  therapists: [],
  invitations: [],
  earningsSummary: null,
  payouts: [],
  isLoading: false,
  error: null,

  fetchShop: async () => {
    set({isLoading: true, error: null});
    try {
      const response = await shopOwnerApi.getMyShop();
      set({shop: response.data.data, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch shop';
      set({error: message, isLoading: false});
    }
  },

  updateShop: async data => {
    set({isLoading: true, error: null});
    try {
      const response = await shopOwnerApi.updateShop(data);
      set({shop: response.data.data, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update shop';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  updateBankAccount: async data => {
    set({isLoading: true, error: null});
    try {
      const response = await shopOwnerApi.updateBankAccount(data);
      set({shop: response.data.data, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update bank account';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  fetchTherapists: async () => {
    set({isLoading: true, error: null});
    try {
      const response = await shopOwnerApi.getTherapists();
      set({therapists: response.data.data, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch therapists';
      set({error: message, isLoading: false});
    }
  },

  removeTherapist: async (providerId: string) => {
    set({isLoading: true, error: null});
    try {
      await shopOwnerApi.removeTherapist(providerId);
      set(state => ({
        therapists: state.therapists.filter(t => t.id !== providerId),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove therapist';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  fetchInvitations: async () => {
    set({isLoading: true, error: null});
    try {
      const response = await shopOwnerApi.getInvitations();
      set({invitations: response.data.data, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch invitations';
      set({error: message, isLoading: false});
    }
  },

  sendInvitation: async data => {
    set({isLoading: true, error: null});
    try {
      const response = await shopOwnerApi.sendInvitation(data);
      set(state => ({
        invitations: [response.data.data, ...state.invitations],
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to send invitation';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  cancelInvitation: async (invitationId: string) => {
    set({isLoading: true, error: null});
    try {
      await shopOwnerApi.cancelInvitation(invitationId);
      set(state => ({
        invitations: state.invitations.filter(inv => inv.id !== invitationId),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to cancel invitation';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  fetchEarningsSummary: async () => {
    set({isLoading: true, error: null});
    try {
      const response = await shopOwnerApi.getEarningsSummary();
      set({earningsSummary: response.data.data, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch earnings';
      set({error: message, isLoading: false});
    }
  },

  fetchPayouts: async () => {
    set({isLoading: true, error: null});
    try {
      const response = await shopOwnerApi.getPayouts();
      set({payouts: response.data.data, isLoading: false});
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch payouts';
      set({error: message, isLoading: false});
    }
  },

  requestPayout: async data => {
    set({isLoading: true, error: null});
    try {
      const response = await shopOwnerApi.requestPayout(data);
      set(state => ({
        payouts: [response.data.data, ...state.payouts],
        earningsSummary: state.earningsSummary
          ? {
              ...state.earningsSummary,
              balance: state.earningsSummary.balance - data.amount,
              pendingPayout: state.earningsSummary.pendingPayout + data.amount,
            }
          : null,
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to request payout';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  clearError: () => set({error: null}),
}));
