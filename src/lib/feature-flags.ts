export function isAcademyEnabled() {
  return process.env.NEXT_PUBLIC_ACADEMY_ENABLED === 'true' || process.env.NODE_ENV === 'development'
}
