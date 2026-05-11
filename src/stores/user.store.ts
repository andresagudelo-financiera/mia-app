'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserProfile, RegisterInput } from '@/types/rentabilidad'
import { userApi } from '@/services/api/user.api'

interface UserStore {
  profile: UserProfile | null
  isRegistered: boolean
  register: (data: RegisterInput) => Promise<void>
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'registeredAt'>>) => void
  clearProfile: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: null,
      isRegistered: false,

      register: async (data) => {
        const profile = await userApi.register(data);
        if (profile) {
          set({ profile, isRegistered: true });
        }
      },

      updateProfile: (updates) =>
        set((s) => ({
          profile: s.profile ? { ...s.profile, ...updates } : null,
        })),

      clearProfile: () => set({ profile: null, isRegistered: false }),
    }),
    {
      name: 'mia-user',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        profile: persistedState?.profile ? { ...currentState.profile, ...persistedState.profile } : currentState.profile,
      }),
    }
  )
)
