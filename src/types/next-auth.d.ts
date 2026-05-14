import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    adminToken?: string
    adminTokenExpiresAt?: string
    user?: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      isActive?: boolean
    }
  }

  interface User {
    role?: string
    isActive?: boolean
    adminToken?: string
    adminTokenExpiresAt?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    isActive?: boolean
    adminToken?: string
    adminTokenExpiresAt?: string
  }
}
