import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { loginMiaAdmin } from '@/lib/mia-admin-client'

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
      }
      return token
    },
    async session({ session, token }) {
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
