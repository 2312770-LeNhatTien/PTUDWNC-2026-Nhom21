'use client';
import { create } from 'zustand';
import type { AuthResponseDto, UserDto } from '@/types/api';

type AuthState = {
  user: UserDto | null;
  hydrated: boolean;
  updateUser: (user: UserDto) => void;
  setSession: (session: AuthResponseDto) => void;
  clearSession: () => void;
  syncFromStorage: () => void;
};

// Reuse the existing storage keys so older pages and open browser tabs stay compatible.
// Store only the user in React state; never render tokens into UI or devtools.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  updateUser: (user) => {
    if (typeof window !== "undefined") localStorage.setItem("user", JSON.stringify(user));
    set({ user, hydrated: true });
    if (typeof window !== "undefined") window.dispatchEvent(new Event("auth-changed"));
  },
  setSession: (session) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', session.accessToken);
    localStorage.setItem('refreshToken', session.refreshToken);
    localStorage.setItem('user', JSON.stringify(session.user));
    set({ user: session.user, hydrated: true });
    window.dispatchEvent(new Event('auth-changed'));
  },
  clearSession: () => {
    if (typeof window !== 'undefined') {
      for (const key of ['accessToken', 'refreshToken', 'user']) localStorage.removeItem(key);
    }
    set({ user: null, hydrated: true });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth-changed'));
  },
  syncFromStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      const valid = user && typeof user.id === 'string' && typeof user.displayName === 'string'
        && Array.isArray(user.roles) && user.roles.every((role: unknown) => typeof role === 'string');
      set({ user: valid ? user : null, hydrated: true });
    } catch { set({ user: null, hydrated: true }); }
  },
}));

