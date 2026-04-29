'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserProfile, RegisterInput } from '@/types/rentabilidad'

interface UserStore {
  profile: UserProfile | null
  isRegistered: boolean
  register: (data: RegisterInput) => void
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'registeredAt'>>) => void
  clearProfile: () => void
}

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: null,
      isRegistered: false,

      register: (data) => {
        const profile: UserProfile = {
          id: generateId(),
          name: data.name,
          email: data.email,
          phone: data.phone,
          baseCurrency: data.baseCurrency,
          registeredAt: new Date().toISOString(),
          hasCompletedOnboarding: false,
        }
        set({ profile, isRegistered: true })
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
