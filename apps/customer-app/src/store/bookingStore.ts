import {create} from 'zustand';
import type {
  Booking,
  BookingRequest,
  ProviderDetail,
  ProviderService,
  Service,
  Address,
  PaymentMethodType,
} from '@types';

interface BookingDraft {
  provider?: ProviderDetail;
  service?: Service;
  providerService?: ProviderService;
  duration?: 90 | 120;
  scheduledDate?: string;
  scheduledTime?: string;
  // Simple address - just text, no database needed
  addressText?: string;
  addressNotes?: string;
  latitude?: number;
  longitude?: number;
  // Legacy - for saved addresses (optional)
  address?: Address;
  notes?: string;
  paymentMethod?: PaymentMethodType;
}

interface ProviderLocation {
  latitude: number;
  longitude: number;
  updatedAt: Date;
}

interface BookingState {
  // Active booking tracking
  activeBooking: Booking | null;
  providerLocation: ProviderLocation | null;
  estimatedArrival: string | null;

  // Booking creation flow
  draft: BookingDraft;
  currentStep: number;

  // Actions
  setActiveBooking: (booking: Booking | null) => void;
  updateProviderLocation: (location: ProviderLocation) => void;
  setEstimatedArrival: (eta: string | null) => void;

  // Draft actions
  setDraft: (data: Partial<BookingDraft>) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  clearDraft: () => void;

  // Computed
  getDraftAsRequest: () => BookingRequest | null;
  calculatePrice: () => number;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  activeBooking: null,
  providerLocation: null,
  estimatedArrival: null,
  draft: {},
  currentStep: 0,

  setActiveBooking: booking => set({activeBooking: booking}),

  updateProviderLocation: location => set({providerLocation: location}),

  setEstimatedArrival: eta => set({estimatedArrival: eta}),

  setDraft: data =>
    set(state => ({
      draft: {...state.draft, ...data},
    })),

  setStep: step => set({currentStep: step}),

  nextStep: () => set(state => ({currentStep: state.currentStep + 1})),

  prevStep: () =>
    set(state => ({currentStep: Math.max(0, state.currentStep - 1)})),

  clearDraft: () => set({draft: {}, currentStep: 0}),

  getDraftAsRequest: () => {
    const {draft} = get();
    // Check for required fields - use addressText or fallback to address object
    const hasAddress = draft.addressText || draft.address;
    if (
      !draft.provider ||
      !draft.service ||
      !draft.duration ||
      !draft.scheduledDate ||
      !draft.scheduledTime ||
      !hasAddress
    ) {
      return null;
    }

    return {
      providerId: draft.provider.id,
      serviceId: draft.service.id,
      duration: draft.duration,
      scheduledDate: draft.scheduledDate,
      scheduledTime: draft.scheduledTime,
      // Use addressText if available, otherwise fall back to saved address
      address: draft.addressText || draft.address?.address || '',
      latitude: draft.latitude || draft.address?.latitude || 14.5995,
      longitude: draft.longitude || draft.address?.longitude || 120.9842,
      notes: draft.addressNotes || draft.notes,
    };
  },

  calculatePrice: () => {
    const {draft} = get();
    if (!draft.service || !draft.duration) {
      return 0;
    }

    // Use pre-set providerService or find from provider
    const providerService = draft.providerService || draft.provider?.services?.find(
      ps => ps.serviceId === draft.service?.id,
    );

    if (providerService) {
      switch (draft.duration) {
        case 90:
          return providerService.price90 || providerService.price60 * 1.4;
        case 120:
          return providerService.price120 || providerService.price60 * 1.75;
      }
    }

    // Fall back to service base price
    switch (draft.duration) {
      case 90:
        return draft.service.basePrice90 || 0;
      case 120:
        return draft.service.basePrice120 || 0;
      default:
        return 0;
    }
  },
}));
