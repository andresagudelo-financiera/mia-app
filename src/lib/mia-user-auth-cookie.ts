import { NextResponse } from 'next/server'

export const MIA_USER_TOKEN_COOKIE = 'mia_user_token'
const MIA_USER_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export function setMiaUserAuthCookie(response: NextResponse, token?: string | null) {
  if (!token) return response

  response.cookies.set(MIA_USER_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MIA_USER_TOKEN_MAX_AGE_SECONDS,
  })

  return response
}

export function clearMiaUserAuthCookie(response: NextResponse) {
  response.cookies.set(MIA_USER_TOKEN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}

export function getBearerTokenFromAuthorizationHeader(authorization?: string | null) {
  if (!authorization) return null
  const [scheme, token] = authorization.split(' ')
  return scheme?.toLowerCase() === 'bearer' && token ? token : null
}
