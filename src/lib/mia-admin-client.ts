export type MiaAdmin = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

export type MiaAdminLogin = {
  token: string
  expiresAt: string
  admin: MiaAdmin
}

type GraphQLErrorPayload = {
  message?: string
}

type GraphQLResponse<T> = {
  data?: T
  errors?: GraphQLErrorPayload[]
}

const ADMIN_LOGIN = `
  mutation AdminLogin($email: String!, $password: String!) {
    adminLogin(email: $email, password: $password) {
      token
      expiresAt
      admin {
        id
        name
        email
        role
        isActive
      }
    }
  }
`

const ADMIN_GOOGLE_LOGIN = `
  mutation AdminGoogleLogin($email: String!) {
    adminGoogleLogin(email: $email) {
      token
      expiresAt
      admin {
        id
        name
        email
        role
        isActive
      }
    }
  }
`

export function getMiaApiUrl() {
  return process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
}

export async function miaAdminGraphQL<TData>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<TData> {
  const response = await fetch(getMiaApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })

  let payload: GraphQLResponse<TData>
  try {
    payload = (await response.json()) as GraphQLResponse<TData>
  } catch {
    throw new Error(`MIA API respondió ${response.status} sin JSON válido`)
  }

  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(payload.errors?.[0]?.message || `MIA API respondió ${response.status}`)
  }

  return payload.data
}

export async function loginMiaAdmin(email: string, password: string) {
  const data = await miaAdminGraphQL<{ adminLogin: MiaAdminLogin }>(ADMIN_LOGIN, { email, password })
  return data.adminLogin
}

export async function loginMiaAdminWithGoogleEmail(email: string) {
  const data = await miaAdminGraphQL<{ adminGoogleLogin: MiaAdminLogin }>(ADMIN_GOOGLE_LOGIN, { email })
  return data.adminGoogleLogin
}
