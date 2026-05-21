import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { loginMiaAdmin, loginMiaAdminWithGoogleEmail } from '@/lib/mia-admin-client'

const STAFF_PANEL_ROLES = new Set(['admin', 'coach', 'money_strategist'])

function isAdminTokenExpired(expiresAt?: unknown) {
  if (!expiresAt) return false
  const expiresAtMs = new Date(String(expiresAt)).getTime()
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()
}

function clearExpiredAdminToken(token: any) {
  delete token.role
  delete token.isActive
  delete token.adminToken
  token.error = 'AdminTokenExpired'
  return token
}

type GoogleTokenInfo = {
  aud?: string
  email?: string
  email_verified?: boolean | string
  name?: string
  error?: string
  error_description?: string
}

async function verifyGoogleIdToken(idToken: string) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID no está configurado.')
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => ({}))) as GoogleTokenInfo

  if (!response.ok || payload.error) {
    throw new Error(payload.error_description || 'Google no pudo validar la sesión.')
  }

  if (payload.aud !== clientId) {
    throw new Error('El token de Google no corresponde a este cliente.')
  }

  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw new Error('El correo de Google no está verificado.')
  }

  const email = payload.email?.trim().toLowerCase()
  if (!email) {
    throw new Error('Google no retornó un correo válido.')
  }

  return {
    email,
    name: payload.name,
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/admin',
  },
  providers: [
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password

        if (!email || !password) return null

        const login = await loginMiaAdmin(email, password)

        if (!STAFF_PANEL_ROLES.has(login.admin.role) || !login.admin.isActive) {
          return null
        }

        return {
          id: login.admin.id,
          name: login.admin.name,
          email: login.admin.email,
          role: login.admin.role,
          isActive: login.admin.isActive,
          adminToken: login.token,
          adminTokenExpiresAt: login.expiresAt,
        }
      },
    }),
    CredentialsProvider({
      id: 'admin-google',
      name: 'Google Admin',
      credentials: {
        idToken: { label: 'Google ID Token', type: 'text' },
      },
      async authorize(credentials) {
        const idToken = credentials?.idToken
        if (!idToken) return null

        const googleUser = await verifyGoogleIdToken(idToken)
        const login = await loginMiaAdminWithGoogleEmail(googleUser.email)

        if (!STAFF_PANEL_ROLES.has(login.admin.role) || !login.admin.isActive) {
          return null
        }

        return {
          id: login.admin.id,
          name: login.admin.name || googleUser.name,
          email: login.admin.email,
          role: login.admin.role,
          isActive: login.admin.isActive,
          adminToken: login.token,
          adminTokenExpiresAt: login.expiresAt,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.isActive = user.isActive
        token.adminToken = user.adminToken
        token.adminTokenExpiresAt = user.adminTokenExpiresAt
        delete token.error
      }

      if (isAdminTokenExpired(token.adminTokenExpiresAt)) {
        return clearExpiredAdminToken(token)
      }

      return token
    },
    async session({ session, token }) {
      session.adminTokenExpiresAt = typeof token.adminTokenExpiresAt === 'string' ? token.adminTokenExpiresAt : undefined
      session.error = token.error
      session.user = {
        ...session.user,
        id: String(token.sub || ''),
        role: token.role,
        isActive: token.isActive,
      }
      return session
    },
  },
}
