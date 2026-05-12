'use client'
""
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LockKeyhole, ShieldCheck } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const code = searchParams?.get('code')
    const supabase = createClient()

    // Rotina de setup que gerencia as sessoes com seguranca
    const setupSession = async () => {
      // 1. Verifica se ja existe uma sessao ativa
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Se ja tiver sessao, ta pronto pra trocar a senha
        setInitializing(false)
        return
      }

      // 2. Se nao tiver sessao mas tiver o codigo na URL, faz o exchange manual
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          setError(`Erro de seguranca local: ${exchangeError.message} (${exchangeError.name}). Tente um novo link.`)
        }
        setInitializing(false)
        return
      }

      // 3. Sem sessao e sem codigo
      setInitializing(false)
      setError('Acesso invalido. Nenhum codigo de recuperacao encontrado na URL.')
    }

    setupSession()
  }, [searchParams])

  function validatePasswordStrength(pass: string) {
    return /[A-Z]/.test(pass) && /[a-z]/.test(pass) && /[0-9]/.test(pass) && pass.length >= 8
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()

    if (!validatePasswordStrength(password)) {
      return setError('A senha deve conter letras (maiusculas e minusculas), numeros e no minimo 8 caracteres.')
    }

    if (password !== confirmPassword) {
      return setError('As senhas nao conferem.')
    }

    setLoading(true)
    setError('')

    const supabase = createClient()

    // Tenta atualizar a senha
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(`Falha ao definir senha: ${updateError.message}`)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    setTimeout(() => {
      router.push('/dashboard')
    }, 3000)
  }

  if (initializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Preparando ambiente seguro...</div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,.1)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>Senha redefinida!</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
            Sua senha foi atualizada com sucesso. Voce sera redirecionado para o painel em instantes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(108,99,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <LockKeyhole size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Nova senha</h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>Defina uma senha forte para sua conta.</p>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#f87171', lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleReset}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Nova Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
            />
            <div style={{ fontSize: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              <span style={{ color: password.length >= 8 ? '#34d399' : 'var(--muted)' }}>• 8+ chars</span>
              <span style={{ color: /[A-Z]/.test(password) && /[a-z]/.test(password) ? '#34d399' : 'var(--muted)' }}>• A-z</span>
              <span style={{ color: /[0-9]/.test(password) ? '#34d399' : 'var(--muted)' }}>• 0-9</span>
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Confirmar Senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!error} // Mantivemos o block quando tem error para o usuario nao forcar
            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: loading || error ? 'var(--surface2)' : 'var(--accent)', color: loading || error ? 'var(--muted)' : '#fff', border: 'none', fontSize: '14px', fontWeight: 600, cursor: loading || error ? 'default' : 'pointer' }}
          >
            {loading ? 'Atualizando...' : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><div style={{ color: 'var(--muted)', fontSize: '14px' }}>Carregando...</div></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
