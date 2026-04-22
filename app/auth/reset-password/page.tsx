'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LockKeyhole, ShieldCheck } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function validatePasswordStrength(pass: string) {
    const hasUpper = /[A-Z]/.test(pass)
    const hasLower = /[a-z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    const isLongEnough = pass.length >= 8
    return hasUpper && hasLower && hasNumber && isLongEnough
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
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    
    // Redirecionar para o dashboard apos 3 segundos
    setTimeout(() => {
      router.push('/dashboard')
    }, 3000)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,.1)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>Senha redefinida!</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>Sua senha foi atualizada com sucesso. Voce sera redirecionado para o painel em instantes.</p>
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
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#f87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleReset}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Nova Senha</label>
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
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Confirmar Senha</label>
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
            disabled={loading}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: loading ? 'var(--surface2)' : 'var(--accent)', color: loading ? 'var(--muted)' : '#fff', border: 'none', fontSize: '14px', fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}
          >
            {loading ? 'Atualizando...' : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
