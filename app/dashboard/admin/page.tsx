import AdminUsagePanel from '@/components/admin/AdminUsagePanel'
import AdminUsersPanel from '@/components/admin/AdminUsersPanel'
import { requireAdminPage } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ProfileRow = {
  id: string
  name: string | null
  plan_tier: string | null
  role: string | null
  target_exam: string | null
  created_at: string
}

type UsageRow = {
  id: string
  user_id: string
  usage_date: string
  alto_busca_count: number
  advanced_busca_count: number
  updated_at: string
}

async function listAllAuthUsers(adminSupabase: ReturnType<typeof createAdminClient>) {
  const users: Array<{ id: string; email: string | null }> = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const batch = data.users.map(user => ({ id: user.id, email: user.email ?? null }))
    users.push(...batch)

    if (batch.length < perPage) break
    page += 1
  }

  return users
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }

  try {
    return JSON.stringify(error)
  } catch {
    return 'Falha inesperada ao carregar dados administrativos.'
  }
}

function getRecentDateKey(daysBack: number) {
  const date = new Date()
  date.setDate(date.getDate() - daysBack)
  return date.toISOString().slice(0, 10)
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

export default async function AdminPage() {
  await requireAdminPage()

  let users: Array<{
    id: string
    name: string | null
    email: string | null
    plan_tier: string | null
    role: string | null
    target_exam: string | null
    created_at: string
    alto_today: number
    advanced_today: number
  }> = []

  let usageRows: Array<{
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
  }> = []

  let loadError = ''
  const warnings: string[] = []

  try {
    const adminSupabase = createAdminClient()
    const todayKey = getTodayKey()
    const usageSince = getRecentDateKey(29)

    const [profilesRes, usageRes] = await Promise.all([
      adminSupabase
        .from('profiles')
        .select('id, name, plan_tier, role, target_exam, created_at')
        .order('created_at', { ascending: false }),
      adminSupabase
        .from('usage_daily')
        .select('id, user_id, usage_date, alto_busca_count, advanced_busca_count, updated_at')
        .gte('usage_date', usageSince)
        .order('usage_date', { ascending: false })
        .order('updated_at', { ascending: false }),
    ])

    if (profilesRes.error) throw profilesRes.error
    if (usageRes.error) throw usageRes.error

    const profileRows = (profilesRes.data ?? []) as ProfileRow[]
    const recentUsage = (usageRes.data ?? []) as UsageRow[]
    let authUsers: Array<{ id: string; email: string | null }> = []

    try {
      authUsers = await listAllAuthUsers(adminSupabase)
    } catch (error) {
      warnings.push(`Nao foi possivel carregar emails via auth admin: ${getErrorMessage(error)}`)
    }

    const authEmailMap = new Map(authUsers.map(user => [user.id, user.email]))
    const profileMap = new Map(profileRows.map(profile => [profile.id, profile]))
    const usageTodayByUser = new Map<string, { alto: number; advanced: number }>()

    for (const row of recentUsage) {
      if (row.usage_date !== todayKey) continue

      const current = usageTodayByUser.get(row.user_id) ?? { alto: 0, advanced: 0 }
      usageTodayByUser.set(row.user_id, {
        alto: current.alto + (row.alto_busca_count ?? 0),
        advanced: current.advanced + (row.advanced_busca_count ?? 0),
      })
    }

    users = profileRows.map(profile => {
      const todayUsage = usageTodayByUser.get(profile.id) ?? { alto: 0, advanced: 0 }

      return {
        ...profile,
        email: authEmailMap.get(profile.id) ?? null,
        alto_today: todayUsage.alto,
        advanced_today: todayUsage.advanced,
      }
    })

    usageRows = recentUsage.map(row => {
      const profile = profileMap.get(row.user_id)

      return {
        ...row,
        name: profile?.name ?? null,
        email: authEmailMap.get(row.user_id) ?? null,
        plan_tier: profile?.plan_tier ?? null,
        role: profile?.role ?? null,
      }
    })
  } catch (error) {
    loadError = getErrorMessage(error)
  }

  const totalUsers = users.length
  const totalAdmins = users.filter(user => user.role === 'admin').length
  const premiumUsers = users.filter(user => user.plan_tier === 'premium').length
  const basicoUsers = users.filter(user => user.plan_tier === 'basico').length
  const todayUsage = users.reduce(
    (acc, user) => {
      acc.alto += user.alto_today
      acc.advanced += user.advanced_today
      return acc
    },
    { alto: 0, advanced: 0 }
  )

  return (
    <>
      <style>{`
        .admin-page-shell {
          padding: 28px 32px 36px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-height: 100%;
          background: var(--bg,#0a0c12);
        }
        .admin-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }
        .admin-hero-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(120px, 1fr));
          gap: 12px;
          min-width: 380px;
          max-width: 520px;
          flex: 1;
        }
        @media (max-width: 1180px) {
          .admin-page-shell {
            padding: 22px 18px 28px;
          }
          .admin-hero-metrics {
            min-width: 100%;
          }
        }
        @media (max-width: 760px) {
          .admin-page-shell {
            padding: 18px 14px 24px;
          }
          .admin-hero-metrics {
            grid-template-columns: repeat(2, minmax(120px, 1fr));
          }
        }
        @media (max-width: 520px) {
          .admin-hero-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="admin-page-shell">
      <section
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,.16), rgba(108,99,255,.14) 58%, rgba(17,20,32,.94))',
          border: '1px solid rgba(245,158,11,.18)',
          borderRadius: '20px',
          padding: '24px',
        }}
      >
        <div className="admin-hero">
          <div style={{ maxWidth: '720px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '999px', padding: '6px 11px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px' }}>
              Painel protegido
            </div>
            <h1 style={{ margin: '14px 0 0', fontSize: '30px', lineHeight: 1.08, letterSpacing: '-1px', color: '#fff' }}>
              Administracao operacional com governanca de acesso e visao diaria de consumo.
            </h1>
            <p style={{ margin: '12px 0 0', maxWidth: '700px', fontSize: '14px', lineHeight: 1.75, color: 'rgba(232,234,246,.82)' }}>
              Esta segunda camada libera promocao e revogacao de admins, filtros operacionais completos e leitura consolidada do uso diario por usuario.
            </p>
          </div>

          <div className="admin-hero-metrics">
            {[
              { label: 'Usuarios', value: String(totalUsers), color: '#fff' },
              { label: 'Admins', value: String(totalAdmins), color: '#fbbf24' },
              { label: 'Planos Basico', value: String(basicoUsers), color: '#34d399' },
              { label: 'Planos Premium', value: String(premiumUsers), color: '#60a5fa' },
              { label: 'Alto hoje', value: String(todayUsage.alto), color: '#22c55e' },
              { label: 'Avancada hoje', value: String(todayUsage.advanced), color: '#38bdf8' },
            ].map(item => (
              <div key={item.label} style={{ background: 'rgba(7,10,18,.34)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '16px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(232,234,246,.62)', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: item.color, marginTop: '8px' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {loadError && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            border: '1px solid rgba(239,68,68,.25)',
            background: 'rgba(239,68,68,.08)',
            color: '#fca5a5',
            fontSize: '13px',
            lineHeight: 1.7,
          }}
        >
          Nao foi possivel carregar os dados administrativos. Detalhe: {loadError}
        </div>
      )}

      {!loadError && warnings.length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            border: '1px solid rgba(245,158,11,.25)',
            background: 'rgba(245,158,11,.08)',
            color: '#fbbf24',
            fontSize: '13px',
            lineHeight: 1.7,
          }}
        >
          {warnings.join(' | ')}
        </div>
      )}

      <AdminUsersPanel users={users} />
      <AdminUsagePanel usageRows={usageRows} />
      </div>
    </>
  )
}
