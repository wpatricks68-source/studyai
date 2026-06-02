import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeUserRole } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_PLAN_TIERS = new Set(['gratuito', 'basico', 'premium'])
const ALLOWED_ROLES = new Set(['user', 'admin'])

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function requireAdminContext() {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      errorResponse: NextResponse.json({ error: 'Usuario nao autenticado.' }, { status: 401 }),
      user: null,
      adminSupabase: null,
    }
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (normalizeUserRole(adminProfile?.role) !== 'admin') {
    return {
      errorResponse: NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 }),
      user: null,
      adminSupabase: null,
    }
  }

  try {
    return {
      errorResponse: null,
      user,
      adminSupabase: createAdminClient(),
    }
  } catch (error) {
    return {
      errorResponse: NextResponse.json({
        error: error instanceof Error ? error.message : 'Cliente administrativo indisponivel.',
      }, { status: 500 }),
      user: null,
      adminSupabase: null,
    }
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const context = await requireAdminContext()
  if (context.errorResponse) return context.errorResponse

  const { user, adminSupabase } = context

  const body = await request.json().catch(() => null)
  const nextPlanTier = typeof body?.planTier === 'string' ? body.planTier.trim().toLowerCase() : ''
  const nextRole = typeof body?.role === 'string' ? body.role.trim().toLowerCase() : ''
  const hasName = body && Object.prototype.hasOwnProperty.call(body, 'name')
  const hasEmail = body && Object.prototype.hasOwnProperty.call(body, 'email')
  const hasTargetExam = body && Object.prototype.hasOwnProperty.call(body, 'targetExam')
  const nextName = hasName && typeof body?.name === 'string' ? body.name.trim() : ''
  const nextEmail = hasEmail && typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const nextTargetExam = hasTargetExam && typeof body?.targetExam === 'string' ? body.targetExam.trim() : ''

  if (!nextPlanTier && !nextRole && !hasName && !hasEmail && !hasTargetExam) {
    return NextResponse.json({ error: 'Informe ao menos um campo para atualizar.' }, { status: 400 })
  }

  if (nextPlanTier && !ALLOWED_PLAN_TIERS.has(nextPlanTier)) {
    return NextResponse.json({ error: 'Plano informado e invalido.' }, { status: 400 })
  }

  if (nextRole && !ALLOWED_ROLES.has(nextRole)) {
    return NextResponse.json({ error: 'Role informada e invalida.' }, { status: 400 })
  }

  if (hasEmail && (!nextEmail || !isValidEmail(nextEmail))) {
    return NextResponse.json({ error: 'Email informado e invalido.' }, { status: 400 })
  }

  const { data: currentProfile, error: targetError } = await adminSupabase
    .from('profiles')
    .select('id, name, target_exam, plan_tier, role')
    .eq('id', params.userId)
    .maybeSingle()

  if (targetError) {
    return NextResponse.json({ error: 'Nao foi possivel carregar o usuario de destino.' }, { status: 500 })
  }

  const changedFields: string[] = []
  const payload: Record<string, string | null> = {}
  const currentPlanTier = currentProfile?.plan_tier ?? 'gratuito'
  const currentRole = currentProfile?.role ?? 'user'
  const currentName = currentProfile?.name ?? ''
  const currentTargetExam = currentProfile?.target_exam ?? ''

  const { data: targetAuthUser, error: targetAuthError } = await adminSupabase.auth.admin.getUserById(params.userId)
  const targetAuthEmail = targetAuthUser.user?.email ?? ''

  if (targetAuthError && !currentProfile) {
    return NextResponse.json({ error: 'Usuario de destino nao encontrado.' }, { status: 404 })
  }

  if (hasName && currentName !== nextName) {
    payload.name = nextName || null
    changedFields.push('name')
  }

  if (hasTargetExam && currentTargetExam !== nextTargetExam) {
    payload.target_exam = nextTargetExam || null
    changedFields.push('target_exam')
  }

  if (nextPlanTier && currentPlanTier !== nextPlanTier) {
    payload.plan_tier = nextPlanTier
    changedFields.push('plan_tier')
  }

  if (nextRole && currentRole !== nextRole) {
    if (params.userId === user.id && nextRole !== 'admin') {
      return NextResponse.json({ error: 'Voce nao pode revogar o proprio acesso administrativo.' }, { status: 400 })
    }

    if (currentRole === 'admin' && nextRole !== 'admin') {
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

  if (hasEmail && targetAuthEmail.toLowerCase() !== nextEmail) {
    if (!targetAuthUser.user) {
      return NextResponse.json({ error: 'Nao foi possivel alterar email: usuario nao existe no Auth.' }, { status: 404 })
    }

    const { error: emailUpdateError } = await adminSupabase.auth.admin.updateUserById(params.userId, {
      email: nextEmail,
      email_confirm: true,
      user_metadata: {
        ...(targetAuthUser.user.user_metadata ?? {}),
        name: hasName ? nextName : currentName,
        target_exam: hasTargetExam ? nextTargetExam : currentTargetExam,
      },
    })

    if (emailUpdateError) {
      return NextResponse.json({
        error: 'Nao foi possivel atualizar o email no Auth.',
        details: emailUpdateError.message,
      }, { status: 500 })
    }

    changedFields.push('email')
  }

  if (!changedFields.length) {
    return NextResponse.json({
      user: currentProfile ?? {
        id: params.userId,
        name: null,
        target_exam: null,
        plan_tier: currentPlanTier,
        role: currentRole,
        email: targetAuthEmail || null,
      },
      message: 'Nenhuma alteracao foi necessaria.',
    })
  }

  const writeQuery = currentProfile
    ? adminSupabase
        .from('profiles')
        .update(payload)
        .eq('id', params.userId)
        .select('id, name, target_exam, plan_tier, role')
        .single()
    : adminSupabase
        .from('profiles')
        .insert({
          id: params.userId,
          name: payload.name ?? null,
          target_exam: payload.target_exam ?? null,
          exam_date: null,
          daily_goal: 0,
          plan_tier: payload.plan_tier ?? currentPlanTier,
          role: payload.role ?? currentRole,
        })
        .select('id, name, target_exam, plan_tier, role')
        .single()

  let updatedProfile: {
    id: string
    name: string | null
    target_exam: string | null
    plan_tier: string | null
    role: string | null
  } | null = currentProfile ?? {
    id: params.userId,
    name: null,
    target_exam: null,
    plan_tier: currentPlanTier,
    role: currentRole,
  }
  let updateError = null

  if (Object.keys(payload).length > 0) {
    const writeResult = await writeQuery
    updatedProfile = writeResult.data
    updateError = writeResult.error
  }

  if (updateError || !updatedProfile) {
    console.error('[AdminAPI] Erro ao atualizar perfil:', updateError)
    return NextResponse.json({ 
      error: 'Nao foi possivel atualizar o usuario.',
      details: updateError?.message 
    }, { status: 500 })
  }

  const { error: auditError } = await adminSupabase
    .from('admin_audit_logs')
    .insert({
      admin_user_id: user.id,
      action: changedFields.length === 1 ? `profile.${changedFields[0]}_updated` : 'profile.multi_field_updated',
      target_type: 'profile',
      target_id: params.userId,
      payload: {
        previous_name: currentProfile?.name ?? null,
        next_name: updatedProfile.name,
        previous_email: targetAuthEmail || null,
        next_email: hasEmail ? nextEmail : targetAuthEmail || null,
        previous_target_exam: currentProfile?.target_exam ?? null,
        next_target_exam: updatedProfile.target_exam,
        previous_plan_tier: currentProfile?.plan_tier ?? null,
        next_plan_tier: updatedProfile.plan_tier,
        previous_role: currentProfile?.role ?? null,
        next_role: updatedProfile.role,
        changed_fields: changedFields,
      },
    })

  return NextResponse.json({
    user: {
      ...updatedProfile,
      email: hasEmail ? nextEmail : targetAuthEmail || null,
    },
    changedFields,
    message: auditError
      ? 'Alteracoes salvas com sucesso, mas o log administrativo nao foi gravado.'
      : 'Alteracoes salvas com sucesso.',
    auditWarning: Boolean(auditError),
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const context = await requireAdminContext()
  if (context.errorResponse) return context.errorResponse

  const { user, adminSupabase } = context

  if (params.userId === user.id) {
    return NextResponse.json({ error: 'Voce nao pode excluir o proprio usuario administrativo.' }, { status: 400 })
  }

  const { data: currentProfile, error: targetError } = await adminSupabase
    .from('profiles')
    .select('id, name, target_exam, plan_tier, role')
    .eq('id', params.userId)
    .maybeSingle()

  if (targetError) {
    return NextResponse.json({ error: 'Nao foi possivel carregar o usuario de destino.' }, { status: 500 })
  }

  const { data: targetAuthUser } = await adminSupabase.auth.admin.getUserById(params.userId)

  if (!currentProfile && !targetAuthUser.user) {
    return NextResponse.json({ error: 'Usuario de destino nao encontrado.' }, { status: 404 })
  }

  if ((currentProfile?.role ?? 'user') === 'admin') {
    const { count: adminCount, error: adminCountError } = await adminSupabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if (adminCountError) {
      return NextResponse.json({ error: 'Nao foi possivel validar a quantidade de administradores.' }, { status: 500 })
    }

    if ((adminCount ?? 0) <= 1) {
      return NextResponse.json({ error: 'Nao e permitido excluir o ultimo administrador do sistema.' }, { status: 400 })
    }
  }

  const { error: auditError } = await adminSupabase
    .from('admin_audit_logs')
    .insert({
      admin_user_id: user.id,
      action: 'user.deleted',
      target_type: 'user',
      target_id: params.userId,
      payload: {
        deleted_profile: currentProfile,
        deleted_email: targetAuthUser.user?.email ?? null,
      },
    })

  if (targetAuthUser.user) {
    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(params.userId)

    if (deleteAuthError) {
      return NextResponse.json({
        error: 'Nao foi possivel excluir o usuario no Auth.',
        details: deleteAuthError.message,
      }, { status: 500 })
    }
  } else {
    const { error: deleteProfileError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', params.userId)

    if (deleteProfileError) {
      return NextResponse.json({
        error: 'Nao foi possivel excluir o perfil órfao.',
        details: deleteProfileError.message,
      }, { status: 500 })
    }
  }

  return NextResponse.json({
    deletedUserId: params.userId,
    message: auditError
      ? 'Usuario excluido, mas o log administrativo nao foi gravado.'
      : 'Usuario excluido com sucesso.',
    auditWarning: Boolean(auditError),
  })
}
