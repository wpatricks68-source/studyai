import type { Profile } from '@/types/database'

export type AppRole = 'user' | 'admin'

export function normalizeUserRole(value: Profile['role'] | undefined): AppRole {
  return value === 'admin' ? 'admin' : 'user'
}

export function isAdminRole(value: Profile['role'] | undefined): boolean {
  return normalizeUserRole(value) === 'admin'
}
