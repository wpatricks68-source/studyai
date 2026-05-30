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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

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
  const selectedUser = selectedUserId ? users.find(user => user.id === selectedUserId) ?? null : null
  const selectedDraft = selectedUser
    ? drafts[selectedUser.id] ?? {
        planTier: selectedUser.plan_tier ?? 'gratuito',
        role: selectedUser.role === 'admin' ? 'admin' : 'user',
      }
    : null

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
      setSelectedUserId(null)
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
          padding: 14px 16px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(7,10,18,.08);
        }
        .admin-users-preview-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: var(--muted,#6b7194);
          font-size: 11px;
          padding: 0 2px 10px;
        }
        .admin-users-results {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 10px;
          max-height: 244px;
          overflow-y: scroll;
          scrollbar-gutter: stable;
          padding-right: 6px;
        }
        .admin-user-preview {
          text-align: left;
          width: 100%;
          min-height: 104px;
          padding: 13px 14px;
          border: 1px solid var(--border,#1f2640);
          border-radius: 12px;
          background: var(--surface,#111420);
          color: var(--text,#e8eaf6);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .admin-user-preview:hover,
        .admin-user-preview:focus-visible {
          background: rgba(255,255,255,0.025);
          border-color: rgba(108,99,255,.38);
          outline: none;
        }
        .admin-user-preview-main {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }
        .admin-user-preview-name {
          color: var(--text,#e8eaf6);
          font-size: 13px;
          font-weight: 800;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-user-preview-email,
        .admin-user-preview-id,
        .admin-user-preview-meta {
          color: var(--muted,#6b7194);
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-user-preview-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .admin-user-tag {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 999px;
          padding: 5px 8px;
          color: var(--muted,#6b7194);
          font-size: 11px;
          font-weight: 700;
        }
        .admin-users-empty {
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px 14px;
          color: var(--muted,#6b7194);
          text-align: center;
          border: 1px solid var(--border,#1f2640);
          border-radius: 12px;
          background: var(--surface,#111420);
        }
        .admin-user-dialog-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(3,6,14,.66);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
        }
        .admin-user-dialog {
          width: min(100%, 560px);
          max-height: calc(100vh - 44px);
          overflow-y: auto;
          background: var(--surface,#111420);
          border: 1px solid var(--border,#1f2640);
          border-radius: 18px;
          box-shadow: 0 26px 90px rgba(0,0,0,.52);
        }
        .admin-user-dialog-header {
          padding: 18px 20px;
          border-bottom: 1px solid var(--border,#1f2640);
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
        }
        .admin-user-dialog-body {
          padding: 18px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .admin-user-dialog-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .admin-user-dialog-field {
          background: var(--surface2,#181d2e);
          border: 1px solid var(--border,#1f2640);
          border-radius: 12px;
          padding: 12px;
        }
        .admin-user-dialog-field label {
          display: block;
          color: var(--muted,#6b7194);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 7px;
          font-weight: 700;
        }
        .admin-user-dialog-field div {
          color: var(--text,#e8eaf6);
          font-size: 13px;
          word-break: break-word;
        }
        .admin-user-dialog select {
          width: 100%;
          background: var(--surface2,#181d2e);
          border: 1px solid var(--border,#1f2640);
          border-radius: 10px;
          color: var(--text,#e8eaf6);
          padding: 10px 12px;
          outline: none;
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

        <div className="admin-users-wrap">
          <div className="admin-users-preview-head">
            <span>{filteredUsers.length} usuario{filteredUsers.length === 1 ? '' : 's'} encontrado{filteredUsers.length === 1 ? '' : 's'}</span>
            <span>Clique em um usuario para abrir a caixa de alteracoes</span>
          </div>

          <div className="admin-users-results">
            {filteredUsers.length === 0 ? (
              <div className="admin-users-empty">
                Nenhum usuario encontrado com os filtros atuais.
              </div>
            ) : filteredUsers.map(user => (
              <button
                key={user.id}
                type="button"
                className="admin-user-preview"
                onClick={() => setSelectedUserId(user.id)}
              >
                <div className="admin-user-preview-main">
                  <div style={{ minWidth: 0 }}>
                    <div className="admin-user-preview-name">{user.name || 'Sem nome'}</div>
                    <div className="admin-user-preview-email">{user.email || formatUserId(user.id)}</div>
                    <div className="admin-user-preview-id">{formatUserId(user.id)}</div>
                  </div>
                  <div style={{ color: user.role === 'admin' ? '#fbbf24' : 'var(--muted,#6b7194)', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </div>
                </div>
                <div className="admin-user-preview-tags">
                  <span className="admin-user-tag">Plano: {user.plan_tier ?? 'gratuito'}</span>
                  <span className="admin-user-tag">Concurso: {user.target_exam || 'Nao informado'}</span>
                  <span className="admin-user-tag">Alto: {user.alto_today}</span>
                  <span className="admin-user-tag">Avancada: {user.advanced_today}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedUser && selectedDraft && (
          <div className="admin-user-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Alterar usuario">
            <div className="admin-user-dialog">
              <div className="admin-user-dialog-header">
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text,#e8eaf6)', fontSize: '18px', fontWeight: 800 }}>{selectedUser.name || 'Sem nome'}</div>
                  <div style={{ color: 'var(--muted,#6b7194)', fontSize: '12px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedUser.email || formatUserId(selectedUser.id)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  style={{ width: '34px', height: '34px', borderRadius: '10px', border: '1px solid var(--border,#1f2640)', background: 'var(--surface2,#181d2e)', color: 'var(--text,#e8eaf6)', cursor: 'pointer', flexShrink: 0 }}
                >
                  X
                </button>
              </div>

              <div className="admin-user-dialog-body">
                <div className="admin-user-dialog-grid">
                  <div className="admin-user-dialog-field"><label>ID</label><div>{selectedUser.id}</div></div>
                  <div className="admin-user-dialog-field"><label>Criado em</label><div>{formatDate(selectedUser.created_at)}</div></div>
                  <div className="admin-user-dialog-field"><label>Concurso</label><div>{selectedUser.target_exam || 'Nao informado'}</div></div>
                  <div className="admin-user-dialog-field"><label>Uso hoje</label><div>Alto: {selectedUser.alto_today} | Avancada: {selectedUser.advanced_today}</div></div>
                </div>

                <div className="admin-user-dialog-grid">
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted,#6b7194)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '7px', fontWeight: 700 }}>Role</label>
                    <select
                      value={selectedDraft.role}
                      onChange={event =>
                        setDrafts(current => ({
                          ...current,
                          [selectedUser.id]: { ...selectedDraft, role: event.target.value },
                        }))
                      }
                      disabled={savingUserId === selectedUser.id || isPending}
                    >
                      {ROLE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: 'var(--muted,#6b7194)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '7px', fontWeight: 700 }}>Plano</label>
                    <select
                      value={selectedDraft.planTier}
                      onChange={event =>
                        setDrafts(current => ({
                          ...current,
                          [selectedUser.id]: { ...selectedDraft, planTier: event.target.value },
                        }))
                      }
                      disabled={savingUserId === selectedUser.id || isPending}
                    >
                      {PLAN_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedUserId(null)}
                    style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border,#1f2640)', background: 'transparent', color: 'var(--text,#e8eaf6)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(selectedUser.id)}
                    disabled={
                      savingUserId === selectedUser.id ||
                      isPending ||
                      (
                        selectedDraft.planTier === (selectedUser.plan_tier ?? 'gratuito') &&
                        selectedDraft.role === (selectedUser.role === 'admin' ? 'admin' : 'user')
                      )
                    }
                    style={{
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background:
                        savingUserId === selectedUser.id ||
                        isPending ||
                        (
                          selectedDraft.planTier === (selectedUser.plan_tier ?? 'gratuito') &&
                          selectedDraft.role === (selectedUser.role === 'admin' ? 'admin' : 'user')
                        )
                          ? 'var(--surface2,#181d2e)'
                          : 'var(--accent,#6c63ff)',
                      color:
                        savingUserId === selectedUser.id ||
                        isPending ||
                        (
                          selectedDraft.planTier === (selectedUser.plan_tier ?? 'gratuito') &&
                          selectedDraft.role === (selectedUser.role === 'admin' ? 'admin' : 'user')
                        )
                          ? 'var(--muted,#6b7194)'
                          : '#fff',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor:
                        savingUserId === selectedUser.id ||
                        isPending ||
                        (
                          selectedDraft.planTier === (selectedUser.plan_tier ?? 'gratuito') &&
                          selectedDraft.role === (selectedUser.role === 'admin' ? 'admin' : 'user')
                        )
                          ? 'default'
                          : 'pointer',
                    }}
                  >
                    {savingUserId === selectedUser.id ? 'Salvando...' : 'Salvar alteracoes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
