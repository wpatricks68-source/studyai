import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeUserRole } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'

const AVATAR_BUCKET_NAME = 'avatars'

export async function POST() {
  const supabase = createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: 'Usuario nao autenticado.' },
      { status: 401 },
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profileError) {
    return NextResponse.json(
      { error: 'Nao foi possivel verificar o perfil do usuario.' },
      { status: 500 },
    )
  }

  if (normalizeUserRole(profile?.role) !== 'admin') {
    return NextResponse.json(
      { error: 'Apenas administradores podem executar esta acao.' },
      { status: 403 },
    )
  }

  const adminSupabase = createAdminClient()
  const { data: bucket, error: bucketError } = await adminSupabase.storage.getBucket(AVATAR_BUCKET_NAME)

  if (bucketError && (bucketError.status ?? bucketError?.statusCode) !== 404) {
    return NextResponse.json(
      { error: bucketError.message ?? 'Falha ao consultar o bucket.' },
      { status: 500 },
    )
  }

  if (!bucket) {
    const { data: createdBucket, error: createError } = await adminSupabase.storage.createBucket(
      AVATAR_BUCKET_NAME,
      { public: true },
    )

    if (createError) {
      return NextResponse.json(
        { error: createError.message ?? 'Falha ao criar o bucket de avatars.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ message: 'Bucket de avatars criado com sucesso.', bucket: createdBucket })
  }

  if ('public' in bucket && bucket.public === false) {
    const { data: updatedBucket, error: updateError } = await adminSupabase.storage.updateBucket(
      AVATAR_BUCKET_NAME,
      { public: true },
    )

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message ?? 'Falha ao atualizar o bucket de avatars.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ message: 'Bucket de avatars atualizado para publico.', bucket: updatedBucket })
  }

  return NextResponse.json({ message: 'Bucket de avatars ja existe.', bucket })
}
