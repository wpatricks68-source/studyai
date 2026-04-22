import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Captura erros retornados diretamente pelo Supabase (ex: otp_expired)
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')

  if (errorCode) {
    const params = new URLSearchParams({
      error: errorCode,
      error_description: errorDescription ?? '',
    })
    return NextResponse.redirect(`${origin}/auth/login?${params.toString()}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
