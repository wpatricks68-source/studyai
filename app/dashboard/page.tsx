import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Autenticação — redireciona se não logado
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // Queries individuais com fallback — uma falha não derruba o dashboard inteiro
  const [profileRes, sessionsRes, flashcardsRes, answersRes] = await Promise.allSettled([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('study_sessions').select('id, title, materia, duration_min, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('flashcards').select('id, next_review').eq('user_id', user.id),
    supabase.from('question_answers').select('is_correct').eq('user_id', user.id),
  ])

  const profile    = profileRes.status    === 'fulfilled' ? profileRes.value.data    : null
  const sessions   = sessionsRes.status   === 'fulfilled' ? sessionsRes.value.data ?? [] : []
  const flashcards = flashcardsRes.status === 'fulfilled' ? flashcardsRes.value.data ?? [] : []
  const answers    = answersRes.status    === 'fulfilled' ? answersRes.value.data ?? [] : []

  // Métricas calculadas com segurança
  const totalMin    = sessions.reduce((s: number, r: { duration_min?: number }) => s + (r.duration_min ?? 0), 0)
  const totalHoras  = totalMin >= 60
    ? `${Math.floor(totalMin / 60)}h${totalMin % 60 > 0 ? ` ${totalMin % 60}min` : ''}`
    : `${totalMin}min`

  const now         = new Date()
  const dueCards    = flashcards.filter((f: { next_review: string }) => new Date(f.next_review) <= now).length
  const totalAns    = answers.length
  const correctAns  = answers.filter((a: { is_correct: boolean }) => a.is_correct).length
  const acerto      = totalAns > 0 ? Math.round((correctAns / totalAns) * 100) : 0

  // Saudação por hora do dia
  const hora        = new Date().getHours()
  const greeting    = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName   = profile?.name?.split(' ')[0] ?? 'Concurseiro'

  // Dias para a prova
  let diasParaProva: number | null = null
  if (profile?.exam_date) {
    const diff = new Date(profile.exam_date).getTime() - Date.now()
    diasParaProva = Math.max(0, Math.ceil(diff / 86400000))
  }

  // Cor por matéria
  const matColors: Record<string, string> = {
    'Direito Constitucional': '#6c63ff',
    'Direito Administrativo': '#6c63ff',
    'Português':              '#00d4aa',
    'Raciocínio Lógico':      '#f59e0b',
    'Informática':            '#f87171',
  }

  return (
    <div style={{
      padding: '28px 32px',
      flex: 1,
      overflowY: 'auto',
      background: 'var(--bg, #0a0c12)',
      minHeight: '100%',
    }}>

      {/* ── Cabeçalho ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text, #e8eaf6)', margin: 0 }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted, #6b7194)', marginTop: '5px' }}>
            {dueCards > 0
              ? `${dueCards} flashcard${dueCards > 1 ? 's' : ''} para revisar hoje`
              : sessions.length === 0
                ? 'Bem-vindo! Comece criando sua primeira sessão de estudo.'
                : 'Tudo em dia — continue assim!'}
          </p>
        </div>

        {diasParaProva !== null && (
          <div style={{
            background: 'var(--surface, #111420)',
            border: '1px solid var(--border, #1f2640)',
            borderRadius: '12px', padding: '12px 18px', textAlign: 'right', flexShrink: 0,
          }}>
            <div style={{ fontSize: '11px', color: 'var(--muted, #6b7194)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Dias para a prova
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent, #6c63ff)', lineHeight: 1.2 }}>
              {diasParaProva}
            </div>
            {profile?.target_exam && (
              <div style={{ fontSize: '11px', color: 'var(--muted, #6b7194)', marginTop: '2px' }}>
                {profile.target_exam}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Cards de métricas ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
      }}>
        {[
          {
            label: 'Horas estudadas',
            value: totalMin === 0 ? '—' : totalHoras,
            delta: totalMin === 0 ? 'Nenhuma sessão ainda' : 'Total acumulado',
            color: '#6c63ff',
          },
          {
            label: 'Cards para revisar',
            value: flashcards.length === 0 ? '—' : String(dueCards),
            delta: flashcards.length === 0 ? 'Crie flashcards na busca' : dueCards === 0 ? 'Em dia!' : 'Pendentes hoje',
            color: dueCards > 0 ? '#f59e0b' : '#10b981',
          },
          {
            label: 'Taxa de acerto',
            value: totalAns === 0 ? '—' : `${acerto}%`,
            delta: totalAns === 0 ? 'Responda questões' : `${totalAns} questão${totalAns > 1 ? 'ões' : ''} feita${totalAns > 1 ? 's' : ''}`,
            color: acerto >= 70 ? '#10b981' : totalAns === 0 ? '#6b7194' : '#f59e0b',
          },
          {
            label: 'Sessões salvas',
            value: String(sessions.length),
            delta: sessions.length === 0 ? 'Comece a estudar' : 'Na biblioteca',
            color: '#00d4aa',
          },
        ].map(card => (
          <div key={card.label} style={{
            background: 'var(--surface, #111420)',
            border: '1px solid var(--border, #1f2640)',
            borderRadius: '12px', padding: '16px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--muted, #6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: card.color }}>
              {card.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted, #6b7194)', marginTop: '4px' }}>
              {card.delta}
            </div>
          </div>
        ))}
      </div>

      {/* ── Grid inferior ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '16px' }}>

        {/* Sessões recentes */}
        <div style={{
          background: 'var(--surface, #111420)',
          border: '1px solid var(--border, #1f2640)',
          borderRadius: '12px', padding: '16px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text, #e8eaf6)', marginBottom: '14px' }}>
            Sessões recentes
          </div>

          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted, #6b7194)', marginBottom: '12px' }}>
                Nenhuma sessão ainda
              </div>
              <Link
                href="/dashboard/busca"
                style={{
                  display: 'inline-block', padding: '7px 16px', borderRadius: '8px',
                  background: 'var(--accent, #6c63ff)', color: '#fff',
                  fontSize: '12px', fontWeight: 500, textDecoration: 'none',
                }}
              >
                Começar a estudar →
              </Link>
            </div>
          ) : (
            sessions.map((s: { id: string; title: string; materia?: string; duration_min?: number; created_at: string }, i: number) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 0',
                borderBottom: i < sessions.length - 1 ? '1px solid var(--border, #1f2640)' : 'none',
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: matColors[s.materia ?? ''] ?? '#6c63ff',
                }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '13px', color: 'var(--text, #e8eaf6)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {s.title}
                  </div>
                  {s.materia && (
                    <div style={{ fontSize: '11px', color: 'var(--muted, #6b7194)', marginTop: '1px' }}>
                      {s.materia}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted, #6b7194)', flexShrink: 0 }}>
                  {(s.duration_min ?? 0) >= 60
                    ? `${Math.floor((s.duration_min ?? 0) / 60)}h`
                    : `${s.duration_min ?? 0}min`}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Acesso rápido */}
        <div style={{
          background: 'var(--surface, #111420)',
          border: '1px solid var(--border, #1f2640)',
          borderRadius: '12px', padding: '16px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text, #e8eaf6)', marginBottom: '14px' }}>
            Acesso rápido
          </div>

          {[
            {
              href: '/dashboard/busca',
              label: 'Nova sessão de estudo',
              sub: 'Buscar tema ou enviar PDF',
              color: '#6c63ff',
            },
            {
              href: '/dashboard/flashcards',
              label: dueCards > 0 ? `Revisar ${dueCards} flashcard${dueCards > 1 ? 's' : ''}` : 'Revisar flashcards',
              sub: dueCards > 0 ? 'Repetição espaçada pendente' : 'Repetição espaçada',
              color: '#f59e0b',
            },
            {
              href: '/dashboard/resumos',
              label: 'Biblioteca de resumos',
              sub: `${sessions.length} sessão${sessions.length !== 1 ? 'ões' : ''} salva${sessions.length !== 1 ? 's' : ''}`,
              color: '#00d4aa',
            },
            {
              href: '/dashboard/ferramentas',
              label: 'Iniciar Pomodoro',
              sub: '25min foco + 5min pausa',
              color: '#10b981',
            },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: '8px', marginBottom: '6px',
                background: 'var(--surface2, #181d2e)',
                border: '1px solid var(--border, #1f2640)',
                textDecoration: 'none', transition: 'border-color .12s',
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: 'var(--text, #e8eaf6)', fontWeight: 500 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted, #6b7194)', marginTop: '1px' }}>
                  {item.sub}
                </div>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--muted, #6b7194)', flexShrink: 0 }}>›</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Banner de boas-vindas (só aparece sem sessões) ── */}
      {sessions.length === 0 && (
        <div style={{
          marginTop: '16px',
          background: 'rgba(108,99,255,0.08)',
          border: '1px solid rgba(108,99,255,0.25)',
          borderRadius: '12px', padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text, #e8eaf6)', marginBottom: '4px' }}>
              Tudo pronto para começar!
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted, #6b7194)' }}>
              Pesquise um tema, a IA gera o resumo completo, flashcards e questões automaticamente.
            </div>
          </div>
          <Link
            href="/dashboard/busca"
            style={{
              padding: '10px 20px', borderRadius: '8px', flexShrink: 0,
              background: 'var(--accent, #6c63ff)', color: '#fff',
              fontSize: '13px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            Primeira busca →
          </Link>
        </div>
      )}
    </div>
  )
}