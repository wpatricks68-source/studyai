'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

type AdminUserRow = {
  id: string
  name: string | null
  email: string | null
  plan_tier: string | null
  role: string | null
  target_exam: string | null
  created_at: string
  alto_today: number
  advanced_today: number
}

type AdminUsersPanelProps = {
  users: AdminUserRow[]
}

type Notice =
  | { tone: 'success' | 'error' | 'neutral'; text: string }
  | null

const PLAN_OPTIONS = [
  { value: 'gratuito', label: 'Gratuito' },
  { value: 'basico', label: 'Basico' },
  { value: 'premium', label: 'Premium' },
] as const

const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
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

function noticeStyles(tone: 'success' | 'error' | 'neutral') {
  if (tone === 'success') {
    return {
      border: '1px solid rgba(16,185,129,.25)',
      background: 'rgba(16,185,129,.1)',
      color: '#34d399',
    }
  }

  if (tone === 'error') {
    return {
      border: '1px solid rgba(239,68,68,.25)',
      background: 'rgba(239,68,68,.1)',
      color: '#f87171',
    }
  }

  return {
    border: '1px solid rgba(245,158,11,.25)',
    background: 'rgba(245,158,11,.1)',
    color: '#fbbf24',
  }
}

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function AdminUsersPanel({ users }: AdminUsersPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all')
  const [planFilter, setPlanFilter] = useState<'all' | 'gratuito' | 'basico' | 'premium'>('all')
  const [usageFilter, setUsageFilter] = useState<'all' | 'used_today' | 'no_usage_today'>('all')
  const [drafts, setDrafts] = useState<Record<string, { planTier: string; role: string }>>(
    Object.fromEntries(
      users.map(user => [
        user.id,
        {
          planTier: user.plan_tier ?? 'gratuito',
          role: user.role === 'admin' ? 'admin' : 'user',
        },
      ])
    )
  )
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>(null)

  const filteredUsers = useMemo(() => {
    const searchTokens = normalizeSearchValue(search).split(/\s+/).filter(Boolean)

    return users.filter(user => {
      const haystack = [
        user.name ?? '',
        user.email ?? '',
        user.id,
        user.id.replaceAll('-', ''),
        formatUserId(user.id),
        user.target_exam ?? '',
        user.plan_tier ?? '',
        user.role ?? '',
      ]
        .join(' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

      if (searchTokens.length > 0 && !searchTokens.every(token => haystack.includes(token))) return false
      if (roleFilter !== 'all' && (user.role === 'admin' ? 'admin' : 'user') !== roleFilter) return false
      if (planFilter !== 'all' && (user.plan_tier ?? 'gratuito') !== planFilter) return false

      const hasUsageToday = user.alto_today > 0 || user.advanced_today > 0
      if (usageFilter === 'used_today' && !hasUsageToday) return false
      if (usageFilter === 'no_usage_today' && hasUsageToday) return false

      return true
    })
  }, [users, search, roleFilter, planFilter, usageFilter])

  const totalWithUsageToday = users.filter(user => user.alto_today > 0 || user.advanced_today > 0).length
  const totalAdmins = users.filter(user => user.role === 'admin').length
  const totalPremium = users.filter(user => user.plan_tier === 'premium').length

  async function handleSave(userId: string) {
    const draft = drafts[userId]
    if (!draft) return

    setSavingUserId(userId)
    setNotice(null)

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier: draft.planTier,
          role: draft.role,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Nao foi possivel atualizar o usuario.')
      }

      setNotice({
        tone: data.auditWarning ? 'neutral' : 'success',
        text: data.message || 'Alteracoes salvas com sucesso.',
      })
      startTransition(() => router.refresh())
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Falha inesperada ao atualizar o usuario.',
      })
    } finally {
      setSavingUserId(null)
    }
  }

  return (
    <>
      <style>{`
        .admin-users-desktop {
          display: block;
          width: 100%;
        }
        .admin-users-wrap {
          overflow-x: auto;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .admin-users-grid {
          min-width: 1080px;
        }
        .admin-users-grid-head,
        .admin-users-grid-row {
          display: grid;
          grid-template-columns: minmax(240px, 1.55fr) minmax(150px, .95fr) minmax(128px, .75fr) minmax(128px, .75fr) minmax(140px, .8fr) minmax(128px, .75fr) minmax(150px, .85fr);
          align-items: center;
          column-gap: 14px;
        }
        .admin-users-grid-head {
          padding: 13px 16px;
          font-size: 11px;
          color: var(--muted,#6b7194);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          background: var(--surface,#111420);
        }
        .admin-users-grid-body {
          height: 184px;
          overflow-y: scroll;
          overflow-x: hidden;
          scrollbar-gutter: stable;
          background: rgba(7,10,18,.08);
        }
        .admin-users-grid-row {
          min-height: 76px;
          padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
          font-size: 13px;
          color: var(--text,#e8eaf6);
        }
        .admin-users-grid-row:hover {
          background: rgba(255,255,255,0.02);
        }
        .admin-users-grid-empty {
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px 14px;
          color: var(--muted,#6b7194);
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .admin-users-cell {
          min-width: 0;
        }
        .admin-users-cell-muted {
          color: var(--muted,#6b7194);
        }
        .admin-users-grid select,
        .admin-users-grid button {
          width: 100%;
          box-sizing: border-box;
        }
        .admin-users-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(110px, 1fr));
          gap: 10px;
          min-width: 340px;
        }
        .admin-users-filters {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border,#1f2640);
          display: grid;
          grid-template-columns: minmax(280px, 2.1fr) repeat(3, minmax(170px, 1fr));
          align-items: center;
          gap: 12px;
        }
        .admin-users-filters > * {
          min-width: 0;
        }
        .admin-users-search {
          position: relative;
        }
        .admin-users-search input {
          width: 100%;
          background: var(--surface2,#181d2e);
          border: 1px solid var(--border,#1f2640);
          border-radius: 10px;
          color: var(--text,#e8eaf6);
          padding: 10px 12px 10px 38px;
          outline: none;
        }
        .admin-users-filters select {
          width: 100%;
        }

        .admin-users-mobile {
          display: none;
          padding: 14px;
          gap: 12px;
        }
        .admin-user-card {
          border: 1px solid var(--border,#1f2640);
          background: var(--surface2,#181d2e);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .admin-user-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .admin-user-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 1180px) {
          .admin-users-stats {
            min-width: 100%;
          }
          .admin-users-filters {
            grid-template-columns: repeat(2, minmax(220px, 1fr));
          }
        }
        @media (max-width: 1080px) {
          .admin-users-desktop {
            display: none;
          }
          .admin-users-mobile {
            display: grid;
          }
        }
        @media (max-width: 760px) {
          .admin-users-filters {
            grid-template-columns: 1fr;
          }
          .admin-users-stats {
            grid-template-columns: 1fr;
          }
          .admin-user-meta,
          .admin-user-fields {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section style={{ background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '18px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border,#1f2640)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#e8eaf6)' }}>Gestao de usuarios</div>
            <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginTop: '4px', maxWidth: '560px', lineHeight: 1.6 }}>
              Promova ou revogue administradores, ajuste planos e acompanhe o consumo do dia com filtros operacionais mais completos.
            </div>
          </div>

          <div className="admin-users-stats">
            {[
              { label: 'Admins', value: String(totalAdmins), color: '#fbbf24' },
              { label: 'Premium', value: String(totalPremium), color: '#60a5fa' },
              { label: 'Uso hoje', value: String(totalWithUsageToday), color: '#34d399' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '14px', padding: '12px 14px' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: item.color, marginTop: '6px' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-users-filters">
          <div className="admin-users-search">
            <Search
              aria-hidden="true"
              size={16}
              style={{
                position: 'absolute',
                left: '13px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted,#6b7194)',
                pointerEvents: 'none',
              }}
            />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por nome, email, id, role ou concurso..."
            />
          </div>

          <select
            value={roleFilter}
            onChange={event => setRoleFilter(event.target.value as typeof roleFilter)}
            style={{
              background: 'var(--surface2,#181d2e)',
              border: '1px solid var(--border,#1f2640)',
              borderRadius: '10px',
              color: 'var(--text,#e8eaf6)',
              padding: '10px 12px',
              outline: 'none',
            }}
          >
            <option value="all">Todas as roles</option>
            <option value="admin">Apenas admins</option>
            <option value="user">Apenas users</option>
          </select>

          <select
            value={planFilter}
            onChange={event => setPlanFilter(event.target.value as typeof planFilter)}
            style={{
              background: 'var(--surface2,#181d2e)',
              border: '1px solid var(--border,#1f2640)',
              borderRadius: '10px',
              color: 'var(--text,#e8eaf6)',
              padding: '10px 12px',
              outline: 'none',
            }}
          >
            <option value="all">Todos os planos</option>
            <option value="gratuito">Gratuito</option>
            <option value="basico">Basico</option>
            <option value="premium">Premium</option>
          </select>

          <select
            value={usageFilter}
            onChange={event => setUsageFilter(event.target.value as typeof usageFilter)}
            style={{
              background: 'var(--surface2,#181d2e)',
              border: '1px solid var(--border,#1f2640)',
              borderRadius: '10px',
              color: 'var(--text,#e8eaf6)',
              padding: '10px 12px',
              outline: 'none',
            }}
          >
            <option value="all">Todo uso de hoje</option>
            <option value="used_today">Com uso hoje</option>
            <option value="no_usage_today">Sem uso hoje</option>
          </select>
        </div>

        {notice && (
          <div
            style={{
              margin: '16px 20px 0',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              ...noticeStyles(notice.tone),
            }}
          >
            {notice.text}
          </div>
        )}

        <div className="admin-users-desktop">
          <div className="admin-users-wrap">
            <div className="admin-users-grid" role="table" aria-label="Gestao de usuarios">
              <div className="admin-users-grid-head" role="row">
                <div role="columnheader">Usuario</div>
                <div role="columnheader">Concurso</div>
                <div role="columnheader">Uso hoje</div>
                <div role="columnheader">Role</div>
                <div role="columnheader">Plano</div>
                <div role="columnheader">Criado em</div>
                <div role="columnheader">Acoes</div>
              </div>

              <div className="admin-users-grid-body">
                {filteredUsers.length === 0 ? (
                  <div className="admin-users-grid-empty">
                    Nenhum usuario encontrado com os filtros atuais.
                  </div>
                ) : filteredUsers.map(user => {
                  const draft = drafts[user.id] ?? {
                    planTier: user.plan_tier ?? 'gratuito',
                    role: user.role === 'admin' ? 'admin' : 'user',
                  }
                  const isSaving = savingUserId === user.id
                  const isDirty =
                    draft.planTier !== (user.plan_tier ?? 'gratuito') ||
                    draft.role !== (user.role === 'admin' ? 'admin' : 'user')

                  return (
                    <div key={user.id} className="admin-users-grid-row" role="row">
                      <div className="admin-users-cell" role="cell">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <strong style={{ color: 'var(--text,#e8eaf6)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Sem nome'}</strong>
                          <span style={{ color: 'var(--muted,#6b7194)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email || formatUserId(user.id)}</span>
                          <span style={{ color: 'var(--muted,#6b7194)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatUserId(user.id)}</span>
                        </div>
                      </div>
                      <div className="admin-users-cell admin-users-cell-muted" role="cell">{user.target_exam || 'Nao informado'}</div>
                      <div className="admin-users-cell" role="cell">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>Alto: {user.alto_today}</span>
                          <span style={{ color: '#60a5fa', fontWeight: 700 }}>Avancada: {user.advanced_today}</span>
                        </div>
                      </div>
                      <div className="admin-users-cell" role="cell">
                        <select
                          value={draft.role}
                          onChange={event =>
                            setDrafts(current => ({
                              ...current,
                              [user.id]: { ...(current[user.id] ?? draft), role: event.target.value },
                            }))
                          }
                          disabled={isSaving || isPending}
                          style={{
                            background: 'var(--surface2,#181d2e)',
                            border: '1px solid var(--border,#1f2640)',
                            borderRadius: '10px',
                            color: draft.role === 'admin' ? '#fbbf24' : 'var(--text,#e8eaf6)',
                            padding: '9px 10px',
                            outline: 'none',
                            fontWeight: 700,
                          }}
                        >
                          {ROLE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="admin-users-cell" role="cell">
                        <select
                          value={draft.planTier}
                          onChange={event =>
                            setDrafts(current => ({
                              ...current,
                              [user.id]: { ...(current[user.id] ?? draft), planTier: event.target.value },
                            }))
                          }
                          disabled={isSaving || isPending}
                          style={{
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
                      </div>
                      <div className="admin-users-cell admin-users-cell-muted" role="cell">{formatDate(user.created_at)}</div>
                      <div className="admin-users-cell" role="cell">
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
                          {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="admin-users-mobile">
          {filteredUsers.length === 0 ? (
            <div style={{ padding: '18px', borderRadius: '14px', border: '1px solid var(--border,#1f2640)', background: 'var(--surface2,#181d2e)', color: 'var(--muted,#6b7194)', textAlign: 'center' }}>
              Nenhum usuario encontrado com os filtros atuais.
            </div>
          ) : filteredUsers.map(user => {
            const draft = drafts[user.id] ?? {
              planTier: user.plan_tier ?? 'gratuito',
              role: user.role === 'admin' ? 'admin' : 'user',
            }
            const isSaving = savingUserId === user.id
            const isDirty =
              draft.planTier !== (user.plan_tier ?? 'gratuito') ||
              draft.role !== (user.role === 'admin' ? 'admin' : 'user')

            return (
              <div key={user.id} className="admin-user-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <strong style={{ color: 'var(--text,#e8eaf6)', fontSize: '14px' }}>{user.name || 'Sem nome'}</strong>
                  <span style={{ color: 'var(--muted,#6b7194)', fontSize: '12px' }}>{user.email || formatUserId(user.id)}</span>
                  <span style={{ color: 'var(--muted,#6b7194)', fontSize: '11px' }}>{formatUserId(user.id)}</span>
                </div>

                <div className="admin-user-meta">
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Concurso</div>
                    <div style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)' }}>{user.target_exam || 'Nao informado'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Criado em</div>
                    <div style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)' }}>{formatDate(user.created_at)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Alto hoje</div>
                    <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 700 }}>{user.alto_today}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Avancada hoje</div>
                    <div style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 700 }}>{user.advanced_today}</div>
                  </div>
                </div>

                <div className="admin-user-fields">
                  <select
                    value={draft.role}
                    onChange={event =>
                      setDrafts(current => ({
                        ...current,
                        [user.id]: { ...(current[user.id] ?? draft), role: event.target.value },
                      }))
                    }
                    disabled={isSaving || isPending}
                    style={{
                      width: '100%',
                      background: 'var(--surface,#111420)',
                      border: '1px solid var(--border,#1f2640)',
                      borderRadius: '10px',
                      color: draft.role === 'admin' ? '#fbbf24' : 'var(--text,#e8eaf6)',
                      padding: '10px 12px',
                      outline: 'none',
                      fontWeight: 700,
                    }}
                  >
                    {ROLE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={draft.planTier}
                    onChange={event =>
                      setDrafts(current => ({
                        ...current,
                        [user.id]: { ...(current[user.id] ?? draft), planTier: event.target.value },
                      }))
                    }
                    disabled={isSaving || isPending}
                    style={{
                      width: '100%',
                      background: 'var(--surface,#111420)',
                      border: '1px solid var(--border,#1f2640)',
                      borderRadius: '10px',
                      color: 'var(--text,#e8eaf6)',
                      padding: '10px 12px',
                      outline: 'none',
                    }}
                  >
                    {PLAN_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleSave(user.id)}
                  disabled={!isDirty || isSaving || isPending}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: !isDirty || isSaving || isPending ? 'var(--surface,#111420)' : 'var(--accent,#6c63ff)',
                    color: !isDirty || isSaving || isPending ? 'var(--muted,#6b7194)' : '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: !isDirty || isSaving || isPending ? 'default' : 'pointer',
                  }}
                >
                  {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
