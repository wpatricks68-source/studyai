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
        @media (max-width: 980px) {
          .admin-usage-wrap {
            overflow-x: auto;
          }
          .admin-usage-table {
            min-width: 780px;
          }
        }
      `}</style>

      <section style={{ background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '18px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border,#1f2640)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#e8eaf6)' }}>Uso diario</div>
            <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginTop: '4px' }}>
              Acompanhe o consumo de Alto Busca e Busca Avancada por usuario e por data.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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

        <div className="admin-usage-wrap">
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
      </section>
    </>
  )
}
