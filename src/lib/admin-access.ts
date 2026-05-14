import type { UserProfile } from '@/types/rentabilidad'

export function getAdminEmails(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminProfile(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return true
  const email = profile.email?.toLowerCase()
  return Boolean(email && getAdminEmails().includes(email))
}
