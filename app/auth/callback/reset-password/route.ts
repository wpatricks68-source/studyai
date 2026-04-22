import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Sessao estabelecida com sucesso — redirecionar para a pagina de nova senha
      return NextResponse.redirect(`${origin}/auth/reset-password`)
    } else {
      // Log no servidor para ajudar no debug
      console.error('Supabase exchangeCodeForSession error:', error)
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(error.name)}&error_description=${encodeURIComponent(error.message)}`
      )
    }
  }

  // Falha caso nao haja 'code' na URL (erro do provedor de e-mail ou link corrompido)
  return NextResponse.redirect(
    `${origin}/auth/login?error=missing_code&error_description=Link+incompleto+ou+invalido`
  )
}
