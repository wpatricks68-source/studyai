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
    }
  }

  // Falha na troca — redirecionar para login com erro descritivo
  return NextResponse.redirect(
    `${origin}/auth/login?error=otp_expired&error_description=Link+invalido+ou+expirado`
  )
}
