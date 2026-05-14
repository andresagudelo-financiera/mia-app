import { gql } from 'graphql-request';
import { apiClient, handleApiError } from './client';
import type {
  SimulatorAccessType,
  UserAccess,
  UserAccessStatus,
  UserProfile,
  UserRole,
  UserStatus,
} from '@/types/rentabilidad';

export type UserEntryValidation = {
  exists: boolean;
  requiresPasswordSetup?: boolean;
  user: UserProfile | null;
  access: {
    toolName: string;
    status: 'active' | 'expired' | 'revoked' | 'missing';
    hasAccess: boolean;
    expiresAt?: string | null;
  };
};

const REGISTER_USER = gql`
  mutation RegisterUser($name: String!, $email: String!, $phone: String, $baseCurrency: String, $password: String!) {
    registerUser(name: $name, email: $email, phone: $phone, baseCurrency: $baseCurrency, password: $password) {
      id
      name
      email
      phone
      baseCurrency
      registeredAt
      hasCompletedOnboarding
      accesses {
        id
        toolName
        status
        accessType
        expiresAt
        usageCount
      }
    }
  }
`;

const GET_USER = gql`
  query GetUser($email: String!) {
    user(email: $email) {
      id
      name
      email
      phone
      baseCurrency
      registeredAt
      hasCompletedOnboarding
      accesses {
        id
        toolName
        status
        accessType
        expiresAt
        usageCount
      }
    }
  }
`;

function normalizeAccessStatus(status?: string | null, expiresAt?: string | null): UserAccessStatus {
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return 'expired';
  }

  const normalized = String(status ?? '').toLowerCase();

  if (['active', 'enabled'].includes(normalized)) return 'active';
  if (['expired'].includes(normalized)) return 'expired';

  return 'revoked';
}

function normalizeAccessType(accessType?: string | null): SimulatorAccessType {
  const normalized = String(accessType ?? '').toLowerCase();

  if (normalized === 'demo') return 'demo';
  if (['paid', 'full'].includes(normalized)) return 'paid';
  if (['admin_only', 'admin-only'].includes(normalized)) return 'admin_only';

  return 'free';
}

function normalizeUserStatus(status?: string | null): UserStatus | undefined {
  if (!status) return undefined;

  const normalized = status.toLowerCase();
  if (['restricted', 'disabled', 'inactive'].includes(normalized)) {
    return 'blocked';
  }

  if (['active', 'demo', 'expired', 'blocked', 'paid'].includes(normalized)) {
    return normalized as UserStatus;
  }

  return undefined;
}

function normalizeUserRole(role?: string | null): UserRole | undefined {
  if (!role) return undefined;

  return role.toLowerCase() === 'admin' ? 'admin' : 'user';
}

function normalizeAccess(access: any): UserAccess {
  return {
    ...access,
    userId: String(access?.userId ?? ''),
    simulatorSlug: access?.simulatorSlug ?? access?.toolName ?? undefined,
    simulatorName: access?.simulatorName ?? access?.toolName ?? undefined,
    toolName: access?.toolName ?? access?.simulatorSlug ?? undefined,
    accessType: normalizeAccessType(access?.accessType),
    status: normalizeAccessStatus(access?.status, access?.expiresAt),
  };
}

function normalizeUser(rawUser: any): UserProfile | null {
  if (!rawUser) return null;

  return {
    ...rawUser,
    id: String(rawUser.id),
    name: rawUser.name ?? '',
    email: rawUser.email ?? '',
    phone: rawUser.phone ?? '',
    baseCurrency: rawUser.baseCurrency ?? 'COP',
    role: normalizeUserRole(rawUser.role),
    status: normalizeUserStatus(rawUser.status),
    registeredAt: rawUser.registeredAt ?? new Date().toISOString(),
    hasCompletedOnboarding: Boolean(rawUser.hasCompletedOnboarding),
    hasPassword: Boolean(rawUser.hasPassword),
    accesses: Array.isArray(rawUser.accesses) ? rawUser.accesses.map(normalizeAccess) : [],
  };
}

export const userApi = {
  async validateEntry(email: string, toolName = 'rentabilidad'): Promise<UserEntryValidation> {
    const response = await fetch('/api/users/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, toolName }),
      cache: 'no-store',
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || 'No se pudo validar el ingreso.');
    }

    return {
      exists: Boolean(payload?.exists),
      requiresPasswordSetup: Boolean(payload?.requiresPasswordSetup),
      user: normalizeUser(payload?.user),
      access: payload?.access || {
        toolName,
        status: 'missing',
        hasAccess: false,
        expiresAt: null,
      },
    };
  },

  async login(email: string, password: string, toolName = 'rentabilidad'): Promise<UserEntryValidation> {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, toolName }),
      cache: 'no-store',
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || 'No se pudo iniciar sesión.');
    }

    return {
      exists: Boolean(payload?.exists),
      requiresPasswordSetup: Boolean(payload?.requiresPasswordSetup),
      user: normalizeUser(payload?.user),
      access: payload?.access || {
        toolName,
        status: 'missing',
        hasAccess: false,
        expiresAt: null,
      },
    };
  },

  async register(data: { name: string; email: string; phone?: string; baseCurrency?: string; password: string }) {
    try {
      const response: any = await apiClient.request(REGISTER_USER, data);
      const registeredUser = normalizeUser(response.registerUser);

      // El backend crea el acceso demo después de crear el usuario. Refrescamos
      // inmediatamente para traer la suscripción real y evitar permisos locales obsoletos.
      if (registeredUser?.email) {
        const refreshed = await userApi.getUser(registeredUser.email);
        return refreshed ?? registeredUser;
      }

      return registeredUser;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async setInitialPassword(
    data: { email: string; phone: string; password: string },
    toolName = 'rentabilidad',
  ): Promise<UserEntryValidation> {
    const response = await fetch('/api/users/initial-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, toolName }),
      cache: 'no-store',
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || 'No se pudo crear la contraseña.');
    }

    return {
      exists: Boolean(payload?.exists),
      requiresPasswordSetup: false,
      user: normalizeUser(payload?.user),
      access: payload?.access || {
        toolName,
        status: 'missing',
        hasAccess: false,
        expiresAt: null,
      },
    };
  },

  async getUser(email: string) {
    try {
      const response: any = await apiClient.request(GET_USER, { email });
      return normalizeUser(response.user);
    } catch (error) {
      return handleApiError(error);
    }
  }
};
