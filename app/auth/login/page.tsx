'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Erros vindos do callback de autenticacao (ex: link expirado)
  const urlError = searchParams.get('error')
  const urlErrorMap: Record<string, string> = {
    otp_expired: 'O link de recuperacao expirou. Solicite um novo clicando em "Esqueci a senha?".',
    auth_callback_failed: 'Falha na autenticacao. Tente novamente ou solicite um novo link.',
    access_denied: 'Link invalido ou ja utilizado. Solicite um novo clicando em "Esqueci a senha?".',
  }
  const urlErrorMessage = urlError ? (urlErrorMap[urlError] ?? 'Ocorreu um erro. Tente novamente.') : null

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha incorretos. Verifique e tente novamente.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '40px 36px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '-0.5px',
            }}
          >
            StudyAI
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}
          >
            Concursos
          </div>
        </div>

        <div
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '6px',
          }}
        >
          Entrar na sua conta
        </div>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--muted)',
            marginBottom: '28px',
          }}
        >
          Continue de onde parou
        </div>

        {urlErrorMessage && (
          <div
            style={{
              background: 'rgba(245,158,11,.1)',
              border: '1px solid rgba(245,158,11,.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#fbbf24',
              lineHeight: 1.5,
            }}
          >
            {urlErrorMessage}
          </div>
        )}

        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,.1)',
              border: '1px solid rgba(239,68,68,.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#f87171',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--muted)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              style={{
                width: '100%',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border .15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--muted)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border .15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <Link
                href="/auth/forgot-password"
                style={{
                  fontSize: '12px',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  opacity: 0.85,
                }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                Esqueci a senha?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '8px',
              background: loading ? 'var(--surface2)' : 'var(--accent)',
              color: loading ? 'var(--muted)' : '#fff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              transition: 'all .15s',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '13px',
            color: 'var(--muted)',
          }}
        >
          Não tem conta?{' '}
          <Link
            href="/auth/register"
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Criar conta grátis
          </Link>
        </div>
      </div>
    </div>
  )
}