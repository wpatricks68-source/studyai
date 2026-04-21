import AdminUsersPanel from '@/components/admin/AdminUsersPanel'
import { requireAdminPage } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminPage() {
  await requireAdminPage()

  let users: Array<{
    id: string
    name: string | null
    plan_tier: string | null
    role: string | null
    target_exam: string | null
    created_at: string
  }> = []
  let loadError = ''

  try {
    const adminSupabase = createAdminClient()
    const { data: rawUsers, error } = await adminSupabase
      .from('profiles')
      .select('id, name, plan_tier, role, target_exam, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      loadError = error.message
    } else {
      users = rawUsers ?? []
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Falha ao carregar usuarios.'
  }

  const totalUsers = users.length
  const totalAdmins = users.filter(user => user.role === 'admin').length
  const premiumUsers = users.filter(user => user.plan_tier === 'premium').length
  const basicoUsers = users.filter(user => user.plan_tier === 'basico').length

  return (
    <div style={{ padding: '28px 32px 36px', display: 'flex', flexDirection: 'column', gap: '18px', minHeight: '100%', background: 'var(--bg,#0a0c12)' }}>
      <section
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,.16), rgba(108,99,255,.14) 58%, rgba(17,20,32,.94))',
          border: '1px solid rgba(245,158,11,.18)',
          borderRadius: '20px',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: '720px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '999px', padding: '6px 11px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px' }}>
              Painel protegido
            </div>
            <h1 style={{ margin: '14px 0 0', fontSize: '30px', lineHeight: 1.08, letterSpacing: '-1px', color: '#fff' }}>
              Acoes administrativas centralizadas e isoladas da area do aluno.
            </h1>
            <p style={{ margin: '12px 0 0', maxWidth: '680px', fontSize: '14px', lineHeight: 1.75, color: 'rgba(232,234,246,.82)' }}>
              Este MVP entrega a base segura para gerenciamento operacional: acesso exclusivo para admins, leitura de usuarios e alteracao de plano com validacao server-side.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))', gap: '12px', minWidth: '320px', maxWidth: '420px', flex: 1 }}>
            {[
              { label: 'Usuarios', value: String(totalUsers), color: '#fff' },
              { label: 'Admins', value: String(totalAdmins), color: '#fbbf24' },
              { label: 'Planos Basico', value: String(basicoUsers), color: '#34d399' },
              { label: 'Planos Premium', value: String(premiumUsers), color: '#60a5fa' },
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
          Nao foi possivel carregar a lista administrativa de usuarios. Detalhe: {loadError}
        </div>
      )}

      <AdminUsersPanel users={users} />
    </div>
  )
}
