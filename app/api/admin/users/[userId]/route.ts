import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeUserRole } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_PLAN_TIERS = new Set(['gratuito', 'basico', 'premium'])
const ALLOWED_ROLES = new Set(['user', 'admin'])

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Usuario nao autenticado.' }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (normalizeUserRole(adminProfile?.role) !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
  }

  let adminSupabase
  try {
    adminSupabase = createAdminClient()
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Cliente administrativo indisponivel.',
    }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const nextPlanTier = typeof body?.planTier === 'string' ? body.planTier.trim().toLowerCase() : ''
  const nextRole = typeof body?.role === 'string' ? body.role.trim().toLowerCase() : ''

  if (!nextPlanTier && !nextRole) {
    return NextResponse.json({ error: 'Informe ao menos um campo para atualizar.' }, { status: 400 })
  }

  if (nextPlanTier && !ALLOWED_PLAN_TIERS.has(nextPlanTier)) {
    return NextResponse.json({ error: 'Plano informado e invalido.' }, { status: 400 })
  }

  if (nextRole && !ALLOWED_ROLES.has(nextRole)) {
    return NextResponse.json({ error: 'Role informada e invalida.' }, { status: 400 })
  }

  const { data: currentProfile, error: targetError } = await adminSupabase
    .from('profiles')
    .select('id, name, plan_tier, role')
    .eq('id', params.userId)
    .single()

  if (targetError || !currentProfile) {
    return NextResponse.json({ error: 'Usuario de destino nao encontrado.' }, { status: 404 })
  }

  const changedFields: string[] = []
  const payload: Record<string, string> = {}

  if (nextPlanTier && currentProfile.plan_tier !== nextPlanTier) {
    payload.plan_tier = nextPlanTier
    changedFields.push('plan_tier')
  }

  if (nextRole && currentProfile.role !== nextRole) {
    if (params.userId === user.id && nextRole !== 'admin') {
      return NextResponse.json({ error: 'Voce nao pode revogar o proprio acesso administrativo.' }, { status: 400 })
    }

    if (currentProfile.role === 'admin' && nextRole !== 'admin') {
      const { count: adminCount, error: adminCountError } = await adminSupabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')

      if (adminCountError) {
        return NextResponse.json({ error: 'Nao foi possivel validar a quantidade de administradores.' }, { status: 500 })
      }

      if ((adminCount ?? 0) <= 1) {
        return NextResponse.json({ error: 'Nao e permitido remover o ultimo administrador do sistema.' }, { status: 400 })
      }
    }

    payload.role = nextRole
    changedFields.push('role')
  }

  if (!changedFields.length) {
    return NextResponse.json({
      user: currentProfile,
      message: 'Nenhuma alteracao foi necessaria.',
    })
  }

  const { data: updatedProfile, error: updateError } = await adminSupabase
    .from('profiles')
    .update(payload)
    .eq('id', params.userId)
    .select('id, name, plan_tier, role')
    .single()

  if (updateError || !updatedProfile) {
    return NextResponse.json({ error: 'Nao foi possivel atualizar o plano do usuario.' }, { status: 500 })
  }

  const { error: auditError } = await adminSupabase
    .from('admin_audit_logs')
    .insert({
      admin_user_id: user.id,
      action: changedFields.length === 1 ? `profile.${changedFields[0]}_updated` : 'profile.multi_field_updated',
      target_type: 'profile',
      target_id: params.userId,
      payload: {
        previous_plan_tier: currentProfile.plan_tier,
        next_plan_tier: updatedProfile.plan_tier,
        previous_role: currentProfile.role,
        next_role: updatedProfile.role,
        changed_fields: changedFields,
      },
    })

  return NextResponse.json({
    user: updatedProfile,
    changedFields,
    message: auditError
      ? 'Alteracoes salvas com sucesso, mas o log administrativo nao foi gravado.'
      : 'Alteracoes salvas com sucesso.',
    auditWarning: Boolean(auditError),
  })
}
