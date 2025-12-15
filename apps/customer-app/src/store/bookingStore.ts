import {create} from 'zustand';
import type {
  Booking,
  BookingRequest,
  ProviderDetail,
  Service,
  Address,
  PaymentMethodType,
} from '@types';

interface BookingDraft {
  provider?: ProviderDetail;
  service?: Service;
  duration?: 90 | 120;
  scheduledDate?: string;
  scheduledTime?: string;
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
    if (
      !draft.provider ||
      !draft.service ||
      !draft.duration ||
      !draft.scheduledDate ||
      !draft.scheduledTime ||
      !draft.address
    ) {
      return null;
    }

    return {
      providerId: draft.provider.id,
      serviceId: draft.service.id,
      duration: draft.duration,
      scheduledDate: draft.scheduledDate,
      scheduledTime: draft.scheduledTime,
      address: draft.address.address,
      latitude: draft.address.latitude,
      longitude: draft.address.longitude,
      notes: draft.notes,
    };
  },

  calculatePrice: () => {
    const {draft} = get();
    if (!draft.provider || !draft.service || !draft.duration) {
      return 0;
    }

    // Find provider's price for this service
    const providerService = draft.provider.services?.find(
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
        return draft.service.basePrice90;
      case 120:
        return draft.service.basePrice120;
      default:
        return 0;
    }
  },
}));
