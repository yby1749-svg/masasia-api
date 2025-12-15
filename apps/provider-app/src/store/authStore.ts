import {create} from 'zustand';
import {authApi, setTokens, clearTokens, providersApi, usersApi} from '@api';
import {socketService} from '../services/socket';
import type {Provider, User} from '@types';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  provider: Provider | null;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateProfile: (data: Partial<Provider>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  provider: null,
  error: null,

  login: async (email, password) => {
    set({isLoading: true, error: null});
    try {
      const response = await authApi.login({email, password});
      const {user, accessToken, refreshToken} = response.data.data;

      await setTokens({accessToken, refreshToken});

      // Shop owners don't have a provider profile
      let provider = null;
      if (user.role !== 'SHOP_OWNER') {
        // Fetch provider profile for therapists
        const profileResponse = await providersApi.getProfile();
        provider = profileResponse.data.data;
      }

      set({
        isAuthenticated: true,
        user: user as User,
        provider,
        isLoading: false,
      });

      // Connect socket with token directly (avoids race condition)
      socketService.connect(accessToken);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  register: async data => {
    set({isLoading: true, error: null});
    try {
      const response = await authApi.register(data);
      const {user, accessToken, refreshToken} = response.data.data;

      await setTokens({accessToken, refreshToken});

      // Fetch provider profile after registration
      let provider = null;
      try {
        const profileResponse = await providersApi.getProfile();
        provider = profileResponse.data.data;
      } catch {
        // Provider profile might not exist yet, that's ok
      }

      set({
        isAuthenticated: true,
        user: user as User,
        provider,
        isLoading: false,
      });

      // Connect socket with token directly (avoids race condition)
      socketService.connect(accessToken);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Registration failed';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  logout: async () => {
    socketService.disconnect();
    await clearTokens();
    set({
      isAuthenticated: false,
      user: null,
      provider: null,
      error: null,
    });
  },

  loadProfile: async () => {
    set({isLoading: true});
    try {
      // First try to get user info from the me endpoint
      const meResponse = await usersApi.getProfile();
      const user = meResponse.data.data as User;

      // Shop owners don't have a provider profile
      let provider = null;
      if (user.role !== 'SHOP_OWNER') {
        try {
          const response = await providersApi.getProfile();
          provider = response.data.data;
        } catch {
          // Provider profile might not exist
        }
      }

      set({
        provider,
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Connect socket (tokens already in storage from previous session)
      socketService.connect();
    } catch {
      set({isLoading: false, isAuthenticated: false});
    }
  },

  updateProfile: async data => {
    set({isLoading: true, error: null});
    try {
      const response = await providersApi.updateProfile(data);
      set({
        provider: response.data.data,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update failed';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  clearError: () => set({error: null}),
}));
