'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [targetExam, setTargetExam] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  function getRegisterErrorMessage(message: string) {
    const normalized = message.toLowerCase()

    if (normalized.includes('already registered') || normalized.includes('already been registered')) {
      return 'Este email ja esta cadastrado. Faca login.'
    }

    if (normalized.includes('signups not allowed') || normalized.includes('signup is disabled')) {
      return 'O cadastro esta desativado no Supabase. Ative novos usuarios em Authentication > Providers > Email.'
    }

    if (normalized.includes('invalid email')) {
      return 'Informe um email valido.'
    }

    if (normalized.includes('password')) {
      return 'A senha nao atende aos requisitos do Supabase.'
    }

    return `Erro ao criar conta: ${message}`
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { name: name.trim(), target_exam: targetExam.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(getRegisterErrorMessage(error.message))
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/dashboard')
      router.refresh()
      return
    }

    setSuccessMessage('Conta criada. Confira seu email para confirmar o cadastro antes de entrar.')
    setLoading(false)
  }

  if (successMessage) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)'
      }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>OK</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
            Conta criada com sucesso!
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '22px' }}>
            {successMessage}
          </div>
          <Link
            href="/auth/login"
            style={{
              display: 'inline-block',
              padding: '10px 16px',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Ir para login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '40px 36px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent)' }}>StudyAI</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Concursos</div>
        </div>

        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
          Criar sua conta
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '28px' }}>
          Comece a estudar com inteligencia
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)',
            borderRadius: '8px', padding: '10px 14px', marginBottom: '20px',
            fontSize: '13px', color: '#f87171'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          {[
            { label: 'Nome completo', value: name, set: setName, type: 'text', placeholder: 'Maria Silva' },
            { label: 'Email', value: email, set: setEmail, type: 'email', placeholder: 'seu@email.com' },
            { label: 'Senha', value: password, set: setPassword, type: 'password', placeholder: 'Minimo 6 caracteres' },
            { label: 'Concurso alvo (opcional)', value: targetExam, set: setTargetExam, type: 'text', placeholder: 'Ex: TRF 1a Regiao, AGU, TCU...' },
          ].map(({ label, value, set, type, placeholder }) => (
            <div key={label} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {label}
              </label>
              <input
                type={type}
                value={value}
                onChange={e => set(e.target.value)}
                required={label !== 'Concurso alvo (opcional)'}
                placeholder={placeholder}
                style={{
                  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '10px 14px', color: 'var(--text)',
                  fontSize: '14px', outline: 'none', transition: 'border .15s'
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          ))}

          <div style={{ marginTop: '8px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px', borderRadius: '8px',
                background: loading ? 'var(--surface2)' : 'var(--accent)',
                color: loading ? 'var(--muted)' : '#fff',
                border: 'none', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'default' : 'pointer', transition: 'all .15s'
              }}
            >
              {loading ? 'Criando conta...' : 'Criar conta gratis'}
            </button>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--muted)' }}>
          Ja tem conta?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Entrar
          </Link>
        </div>
      </div>
    </div>
  )
}
