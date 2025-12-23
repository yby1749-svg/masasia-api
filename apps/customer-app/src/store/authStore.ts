import {create} from 'zustand';
import {authApi, userApi, setTokens, clearTokens, getTokens} from '@api';
import type {User, LoginRequest, RegisterRequest} from '@types';
import {signInWithGoogle, signOutGoogle} from '../services/googleAuth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const tokens = await getTokens();
      if (tokens?.accessToken) {
        const response = await userApi.getMe();
        set({
          user: response.data.data,
          isAuthenticated: true,
          isInitialized: true,
        });
      } else {
        set({isInitialized: true});
      }
    } catch {
      await clearTokens();
      set({isInitialized: true});
    }
  },

  login: async (data: LoginRequest) => {
    set({isLoading: true});
    try {
      const response = await authApi.login(data);
      const {accessToken, refreshToken, user} = response.data.data;
      await setTokens({accessToken, refreshToken});
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({isLoading: false});
      throw error;
    }
  },

  loginWithGoogle: async () => {
    set({isLoading: true});
    try {
      // Get Google ID token
      const googleResult = await signInWithGoogle();

      // Send to backend for verification
      const response = await authApi.googleAuth(googleResult.idToken);
      const {accessToken, refreshToken, user} = response.data.data;
      await setTokens({accessToken, refreshToken});
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({isLoading: false});
      throw error;
    }
  },

  register: async (data: RegisterRequest) => {
    set({isLoading: true});
    try {
      const response = await authApi.register(data);
      const {accessToken, refreshToken, user} = response.data.data;
      await setTokens({accessToken, refreshToken});
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({isLoading: false});
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
      await signOutGoogle();
    } catch {
      // Ignore logout errors
    }
    await clearTokens();
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  updateUser: (data: Partial<User>) => {
    const {user} = get();
    if (user) {
      set({user: {...user, ...data}});
    }
  },

  refreshUser: async () => {
    try {
      const response = await userApi.getMe();
      set({user: response.data.data});
    } catch {
      // Ignore refresh errors
    }
  },
}));
