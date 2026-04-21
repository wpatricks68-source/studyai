import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeUserRole } from '@/lib/auth/permissions'

const ALLOWED_PLAN_TIERS = new Set(['gratuito', 'basico', 'premium'])

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

  const body = await request.json().catch(() => null)
  const nextPlanTier = typeof body?.planTier === 'string' ? body.planTier.trim().toLowerCase() : ''

  if (!ALLOWED_PLAN_TIERS.has(nextPlanTier)) {
    return NextResponse.json({ error: 'Plano informado e invalido.' }, { status: 400 })
  }

  const { data: currentProfile, error: targetError } = await supabase
    .from('profiles')
    .select('id, name, plan_tier, role')
    .eq('id', params.userId)
    .single()

  if (targetError || !currentProfile) {
    return NextResponse.json({ error: 'Usuario de destino nao encontrado.' }, { status: 404 })
  }

  if (currentProfile.plan_tier === nextPlanTier) {
    return NextResponse.json({
      user: currentProfile,
      message: 'Nenhuma alteracao foi necessaria.',
    })
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ plan_tier: nextPlanTier })
    .eq('id', params.userId)
    .select('id, name, plan_tier, role')
    .single()

  if (updateError || !updatedProfile) {
    return NextResponse.json({ error: 'Nao foi possivel atualizar o plano do usuario.' }, { status: 500 })
  }

  const { error: auditError } = await supabase
    .from('admin_audit_logs')
    .insert({
      admin_user_id: user.id,
      action: 'profile.plan_tier_updated',
      target_type: 'profile',
      target_id: params.userId,
      payload: {
        previous_plan_tier: currentProfile.plan_tier,
        next_plan_tier: nextPlanTier,
        target_role: currentProfile.role,
      },
    })

  return NextResponse.json({
    user: updatedProfile,
    message: auditError
      ? 'Plano atualizado com sucesso, mas o log administrativo nao foi gravado.'
      : 'Plano atualizado com sucesso.',
    auditWarning: Boolean(auditError),
  })
}
