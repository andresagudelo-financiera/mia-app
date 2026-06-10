import { NextResponse } from 'next/server'
import { clearMiaUserAuthCookie } from '@/lib/mia-user-auth-cookie'

export async function POST() {
  return clearMiaUserAuthCookie(NextResponse.json({ ok: true }))
}

