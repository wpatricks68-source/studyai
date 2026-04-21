'use client'

import { useMemo, useState } from 'react'

type AdminUsageRow = {
  id: string
  user_id: string
  usage_date: string
  alto_busca_count: number
  advanced_busca_count: number
  updated_at: string
  name: string | null
  email: string | null
  plan_tier: string | null
  role: string | null
}

type AdminUsagePanelProps = {
  usageRows: AdminUsageRow[]
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Nao informado'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatUserLabel(name: string | null, email: string | null, userId: string) {
  if (name) return name
  if (email) return email
  return `${userId.slice(0, 8)}...${userId.slice(-4)}`
}

export default function AdminUsagePanel({ usageRows }: AdminUsagePanelProps) {
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => {
    const uniqueDates = Array.from(new Set(usageRows.map(row => row.usage_date)))
    return uniqueDates[0] ?? ''
  })

  const availableDates = useMemo(
    () => Array.from(new Set(usageRows.map(row => row.usage_date))),
    [usageRows]
  )

  const filteredRows = usageRows.filter(row => {
    if (selectedDate && row.usage_date !== selectedDate) return false

    const haystack = [
      row.name ?? '',
      row.email ?? '',
      row.plan_tier ?? '',
      row.role ?? '',
      row.user_id,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(search.trim().toLowerCase())
  })

  const totalAlto = filteredRows.reduce((sum, row) => sum + row.alto_busca_count, 0)
  const totalAdvanced = filteredRows.reduce((sum, row) => sum + row.advanced_busca_count, 0)
  const activeUsers = filteredRows.filter(row => row.alto_busca_count > 0 || row.advanced_busca_count > 0).length

  return (
    <>
      <style>{`
        .admin-usage-table {
          width: 100%;
          border-collapse: collapse;
        }
        .admin-usage-table th,
        .admin-usage-table td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border,#1f2640);
          text-align: left;
          vertical-align: middle;
        }
        .admin-usage-table th {
          font-size: 11px;
          color: var(--muted,#6b7194);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          white-space: nowrap;
        }
        .admin-usage-table td {
          font-size: 13px;
          color: var(--text,#e8eaf6);
        }
        .admin-usage-toolbar {
          padding: 18px 20px;
          border-bottom: 1px solid var(--border,#1f2640);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .admin-usage-toolbar-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .admin-usage-mobile {
          display: none;
          padding: 14px;
          gap: 12px;
        }
        .admin-usage-card {
          border: 1px solid var(--border,#1f2640);
          background: var(--surface2,#181d2e);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .admin-usage-card-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 1080px) {
          .admin-usage-desktop {
            display: none;
          }
          .admin-usage-mobile {
            display: grid;
          }
        }
        @media (max-width: 760px) {
          .admin-usage-toolbar {
            align-items: stretch;
          }
          .admin-usage-toolbar-controls {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr;
          }
          .admin-usage-card-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section style={{ background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '18px', overflow: 'hidden' }}>
        <div className="admin-usage-toolbar">
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#e8eaf6)' }}>Uso diario</div>
            <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginTop: '4px' }}>
              Acompanhe o consumo de Alto Busca e Busca Avancada por usuario e por data.
            </div>
          </div>

          <div className="admin-usage-toolbar-controls">
            <select
              value={selectedDate}
              onChange={event => setSelectedDate(event.target.value)}
              style={{
                minWidth: '170px',
                background: 'var(--surface2,#181d2e)',
                border: '1px solid var(--border,#1f2640)',
                borderRadius: '10px',
                color: 'var(--text,#e8eaf6)',
                padding: '10px 12px',
                outline: 'none',
              }}
            >
              {availableDates.length === 0 ? (
                <option value="">Sem dados</option>
              ) : availableDates.map(date => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>

            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Filtrar por usuario, email, role ou plano..."
              style={{
                width: '320px',
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
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', padding: '18px 20px', borderBottom: '1px solid var(--border,#1f2640)' }}>
          {[
            { label: 'Usuarios ativos', value: String(activeUsers), color: '#fff' },
            { label: 'Alto Busca', value: String(totalAlto), color: '#34d399' },
            { label: 'Busca avancada', value: String(totalAdvanced), color: '#60a5fa' },
            { label: 'Registros', value: String(filteredRows.length), color: '#fbbf24' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '14px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: item.color, marginTop: '8px' }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="admin-usage-desktop">
          <div className="admin-usage-wrap" style={{ overflowX: 'auto' }}>
            <table className="admin-usage-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Role</th>
                  <th>Plano</th>
                  <th>Alto Busca</th>
                  <th>Avancada</th>
                  <th>Ultima atualizacao</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '22px 14px', color: 'var(--muted,#6b7194)', textAlign: 'center' }}>
                      Nenhum registro encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : filteredRows.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <strong style={{ color: 'var(--text,#e8eaf6)', fontSize: '13px' }}>
                          {formatUserLabel(row.name, row.email, row.user_id)}
                        </strong>
                        <span style={{ color: 'var(--muted,#6b7194)', fontSize: '12px' }}>
                          {row.email || `${row.user_id.slice(0, 8)}...${row.user_id.slice(-4)}`}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: row.role === 'admin' ? '#fbbf24' : 'var(--muted,#6b7194)', fontWeight: 700 }}>
                      {row.role === 'admin' ? 'Admin' : 'User'}
                    </td>
                    <td style={{ color: 'var(--muted,#6b7194)' }}>{row.plan_tier || 'gratuito'}</td>
                    <td style={{ color: '#34d399', fontWeight: 700 }}>{row.alto_busca_count}</td>
                    <td style={{ color: '#60a5fa', fontWeight: 700 }}>{row.advanced_busca_count}</td>
                    <td style={{ color: 'var(--muted,#6b7194)' }}>{formatDateTime(row.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-usage-mobile">
          {filteredRows.length === 0 ? (
            <div style={{ padding: '18px', borderRadius: '14px', border: '1px solid var(--border,#1f2640)', background: 'var(--surface2,#181d2e)', color: 'var(--muted,#6b7194)', textAlign: 'center' }}>
              Nenhum registro encontrado para os filtros atuais.
            </div>
          ) : filteredRows.map(row => (
            <div key={row.id} className="admin-usage-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <strong style={{ color: 'var(--text,#e8eaf6)', fontSize: '14px' }}>
                  {formatUserLabel(row.name, row.email, row.user_id)}
                </strong>
                <span style={{ color: 'var(--muted,#6b7194)', fontSize: '12px' }}>
                  {row.email || `${row.user_id.slice(0, 8)}...${row.user_id.slice(-4)}`}
                </span>
              </div>

              <div className="admin-usage-card-grid">
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Role</div>
                  <div style={{ fontSize: '13px', color: row.role === 'admin' ? '#fbbf24' : 'var(--text,#e8eaf6)', fontWeight: 700 }}>
                    {row.role === 'admin' ? 'Admin' : 'User'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Plano</div>
                  <div style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)' }}>{row.plan_tier || 'gratuito'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Alto Busca</div>
                  <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 700 }}>{row.alto_busca_count}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Avancada</div>
                  <div style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 700 }}>{row.advanced_busca_count}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Data</div>
                  <div style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)' }}>{formatDate(row.usage_date)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Atualizado</div>
                  <div style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)' }}>{formatDateTime(row.updated_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
