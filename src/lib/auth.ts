import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { loginMiaAdmin } from '@/lib/mia-admin-client'

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

        if (login.admin.role !== 'admin' || !login.admin.isActive) {
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
