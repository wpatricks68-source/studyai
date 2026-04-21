import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeUserRole } from '@/lib/auth/permissions'
import type { Profile } from '@/types/database'

export async function getServerAuthContext() {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      supabase,
      user: null,
      profile: null as Profile | null,
      role: 'user' as const,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return {
    supabase,
    user,
    profile,
    role: normalizeUserRole(profile?.role),
  }
}

export async function requireAdminPage() {
  const context = await getServerAuthContext()

  if (!context.user) redirect('/auth/login')
  if (context.role !== 'admin') redirect('/dashboard')

  return context
}
