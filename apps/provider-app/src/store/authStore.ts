import {create} from 'zustand';
import {authApi, setTokens, clearTokens, providersApi} from '@api';
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

      // Fetch provider profile
      const profileResponse = await providersApi.getProfile();

      set({
        isAuthenticated: true,
        user: user as User,
        provider: profileResponse.data.data,
        isLoading: false,
      });
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Registration failed';
      set({error: message, isLoading: false});
      throw error;
    }
  },

  logout: async () => {
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
      const response = await providersApi.getProfile();
      set({
        provider: response.data.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({isLoading: false});
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
