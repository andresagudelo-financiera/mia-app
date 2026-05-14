'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserProfile, RegisterInput } from '@/types/rentabilidad'
import { userApi } from '@/services/api/user.api'

interface UserStore {
  profile: UserProfile | null
  isRegistered: boolean
  register: (data: RegisterInput) => Promise<void>
  login: (email: string, password: string) => Promise<boolean>
  setInitialPassword: (data: { email: string; phone: string; password: string }) => Promise<boolean>
  refreshProfile: () => Promise<UserProfile | null>
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'registeredAt'>>) => void
  clearProfile: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: null,
      isRegistered: false,

      register: async (data) => {
        const profile = await userApi.register(data);
        if (profile) {
          set({ profile, isRegistered: true });
        }
      },

      login: async (email, password) => {
        const entry = await userApi.login(email, password);
        const profile = entry.user;
        if (!profile) return false;
        set({ profile, isRegistered: true });
        return true;
      },

      setInitialPassword: async (data) => {
        const entry = await userApi.setInitialPassword(data);
        const profile = entry.user;
        if (!profile) return false;
        set({ profile, isRegistered: true });
        return true;
      },

      refreshProfile: async () => {
        const currentProfile = get().profile;

        if (!currentProfile?.email) {
          set({ profile: null, isRegistered: false });
          return null;
        }

        const profile = await userApi.getUser(currentProfile.email);

        if (!profile) {
          set({ profile: null, isRegistered: false });
          return null;
        }

        const mergedProfile = {
          ...profile,
          hasCompletedOnboarding: currentProfile.hasCompletedOnboarding || profile.hasCompletedOnboarding,
        };

        set({ profile: mergedProfile, isRegistered: true });
        return mergedProfile;
      },

      updateProfile: (updates) =>
        set((s) => ({
          profile: s.profile ? { ...s.profile, ...updates } : null,
        })),

      clearProfile: () => set({ profile: null, isRegistered: false }),
    }),
    {
      name: 'mia-user',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: () => ({ profile: null, isRegistered: false }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        profile: persistedState?.profile ? { ...currentState.profile, ...persistedState.profile } : currentState.profile,
      }),
    }
  )
)
