'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserProfile, RegisterInput } from '@/types/rentabilidad'
import { userApi } from '@/services/api/user.api'

interface UserStore {
  profile: UserProfile | null
  isRegistered: boolean
  register: (data: RegisterInput, toolName?: string) => Promise<void>
  login: (email: string, password: string, toolName?: string) => Promise<boolean>
  setInitialPassword: (data: { email: string; phone: string; password: string }, toolName?: string) => Promise<boolean>
  refreshProfile: () => Promise<UserProfile | null>
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'registeredAt'>>) => void
  clearProfile: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: null,
      isRegistered: false,

      register: async (data, toolName = 'rentabilidad') => {
        if (typeof window !== 'undefined') {
          const utm_source = localStorage.getItem('mia_utm_source')
          const utm_medium = localStorage.getItem('mia_utm_medium')
          const utm_campaign = localStorage.getItem('mia_utm_campaign')
          const utm_content = localStorage.getItem('mia_utm_content')
          const utm_term = localStorage.getItem('mia_utm_term')

          if (utm_source && !data.utm_source) data.utm_source = utm_source
          if (utm_medium && !data.utm_medium) data.utm_medium = utm_medium
          if (utm_campaign && !data.utm_campaign) data.utm_campaign = utm_campaign
          if (utm_content && !data.utm_content) data.utm_content = utm_content
          if (utm_term && !data.utm_term) data.utm_term = utm_term
        }

        const profile = await userApi.register(data, toolName);
        if (profile) {
          set({ profile, isRegistered: true });
        }
      },

      login: async (email, password, toolName = 'rentabilidad') => {
        const entry = await userApi.login(email, password, toolName);
        const profile = entry.user;
        if (!profile) return false;
        set({ profile, isRegistered: true });
        return true;
      },

      setInitialPassword: async (data, toolName = 'rentabilidad') => {
        const entry = await userApi.setInitialPassword(data, toolName);
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
