'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type AdminUserRow = {
  id: string
  name: string | null
  plan_tier: string | null
  role: string | null
  target_exam: string | null
  created_at: string
}

type AdminUsersPanelProps = {
  users: AdminUserRow[]
}

const PLAN_OPTIONS = [
  { value: 'gratuito', label: 'Gratuito' },
  { value: 'basico', label: 'Basico' },
  { value: 'premium', label: 'Premium' },
] as const

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Nao informado'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatUserId(value: string) {
  if (!value) return 'Sem identificador'
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

export default function AdminUsersPanel({ users }: AdminUsersPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState('')
  const [draftPlans, setDraftPlans] = useState<Record<string, string>>(
    Object.fromEntries(users.map(user => [user.id, user.plan_tier ?? 'gratuito']))
  )
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const filteredUsers = users.filter(user => {
    const haystack = [
      user.name ?? '',
      user.id,
      user.target_exam ?? '',
      user.plan_tier ?? '',
      user.role ?? '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(filter.trim().toLowerCase())
  })

  async function handleSave(userId: string) {
    const planTier = draftPlans[userId]
    if (!planTier) return

    setSavingUserId(userId)
    setNotice(null)

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel atualizar o plano do usuario.')
      }

      setNotice({ tone: 'success', text: 'Plano atualizado com sucesso.' })
      startTransition(() => router.refresh())
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Falha inesperada ao atualizar o plano.',
      })
    } finally {
      setSavingUserId(null)
    }
  }

  return (
    <>
      <style>{`
        .admin-users-table {
          width: 100%;
          border-collapse: collapse;
        }
        .admin-users-table th,
        .admin-users-table td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border,#1f2640);
          text-align: left;
          vertical-align: middle;
        }
        .admin-users-table th {
          font-size: 11px;
          color: var(--muted,#6b7194);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          white-space: nowrap;
        }
        .admin-users-table td {
          font-size: 13px;
          color: var(--text,#e8eaf6);
        }
        @media (max-width: 980px) {
          .admin-users-wrap {
            overflow-x: auto;
          }
          .admin-users-table {
            min-width: 860px;
          }
        }
      `}</style>

      <section style={{ background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '18px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border,#1f2640)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#e8eaf6)' }}>Gestao de usuarios</div>
            <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginTop: '4px' }}>
              Altere o plano dos usuarios sem expor essa acao para a area comum.
            </div>
          </div>
          <input
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder="Buscar por nome, id, role ou concurso..."
            style={{
              width: '360px',
              maxWidth: '100%',
              background: 'var(--surface2,#181d2e)',
              border: '1px solid var(--border,#1f2640)',
              borderRadius: '10px',
              color: 'var(--text,#e8eaf6)',
              padding: '10px 12px',
              outline: 'none',
            }}
          />
        </div>

        {notice && (
          <div
            style={{
              margin: '16px 20px 0',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              border: notice.tone === 'success' ? '1px solid rgba(16,185,129,.25)' : '1px solid rgba(239,68,68,.25)',
              background: notice.tone === 'success' ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
              color: notice.tone === 'success' ? '#34d399' : '#f87171',
            }}
          >
            {notice.text}
          </div>
        )}

        <div className="admin-users-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Concurso</th>
                <th>Role</th>
                <th>Plano</th>
                <th>Criado em</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '22px 14px', color: 'var(--muted,#6b7194)', textAlign: 'center' }}>
                    Nenhum usuario encontrado com esse filtro.
                  </td>
                </tr>
              ) : filteredUsers.map(user => {
                const selectedPlan = draftPlans[user.id] ?? 'gratuito'
                const isSaving = savingUserId === user.id
                const isDirty = selectedPlan !== (user.plan_tier ?? 'gratuito')

                return (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <strong style={{ color: 'var(--text,#e8eaf6)', fontSize: '13px' }}>{user.name || 'Sem nome'}</strong>
                        <span style={{ color: 'var(--muted,#6b7194)', fontSize: '12px' }}>{formatUserId(user.id)}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted,#6b7194)' }}>{user.target_exam || 'Nao informado'}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '72px',
                          padding: '5px 10px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '.6px',
                          color: user.role === 'admin' ? '#fbbf24' : 'var(--muted,#6b7194)',
                          background: user.role === 'admin' ? 'rgba(245,158,11,.12)' : 'rgba(255,255,255,.04)',
                          border: user.role === 'admin' ? '1px solid rgba(245,158,11,.3)' : '1px solid var(--border,#1f2640)',
                        }}
                      >
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td>
                      <select
                        value={selectedPlan}
                        onChange={event => setDraftPlans(current => ({ ...current, [user.id]: event.target.value }))}
                        disabled={isSaving || isPending}
                        style={{
                          minWidth: '130px',
                          background: 'var(--surface2,#181d2e)',
                          border: '1px solid var(--border,#1f2640)',
                          borderRadius: '10px',
                          color: 'var(--text,#e8eaf6)',
                          padding: '9px 10px',
                          outline: 'none',
                        }}
                      >
                        {PLAN_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ color: 'var(--muted,#6b7194)' }}>{formatDate(user.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleSave(user.id)}
                        disabled={!isDirty || isSaving || isPending}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: !isDirty || isSaving || isPending ? 'var(--surface2,#181d2e)' : 'var(--accent,#6c63ff)',
                          color: !isDirty || isSaving || isPending ? 'var(--muted,#6b7194)' : '#fff',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: !isDirty || isSaving || isPending ? 'default' : 'pointer',
                        }}
                      >
                        {isSaving ? 'Salvando...' : 'Salvar plano'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
