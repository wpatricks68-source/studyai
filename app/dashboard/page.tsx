import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDuration } from '@/lib/utils'

type Profile = {
  name?: string | null
  exam_date?: string | null
  target_exam?: string | null
}

type StudySession = {
  id: string
  title?: string | null
  materia?: string | null
  duration_min?: number | null
  created_at?: string | null
}

type Flashcard = {
  id: string
  next_review?: string | null
}

type QuestionAnswer = {
  is_correct?: boolean | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [
    { data: profileData },
    { data: sessionsData },
    { data: flashcardsData },
    { data: answersData },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('flashcards')
      .select('id, next_review')
      .eq('user_id', user.id),
    supabase
      .from('question_answers')
      .select('is_correct')
      .eq('user_id', user.id),
  ])

  const profile = (profileData ?? null) as Profile | null
  const sessions = (sessionsData ?? []) as StudySession[]
  const flashcards = (flashcardsData ?? []) as Flashcard[]
  const answers = (answersData ?? []) as QuestionAnswer[]

  const totalMin = sessions.reduce((s, r) => s + (r.duration_min ?? 0), 0)
  const dueCards = flashcards.filter(
    f => f.next_review && new Date(f.next_review) <= new Date()
  ).length
  const totalAns = answers.length
  const correctAns = answers.filter(a => a.is_correct).length
  const acerto = totalAns > 0 ? Math.round((correctAns / totalAns) * 100) : 0

  const hora = new Date().getHours()
  const greeting = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = profile?.name?.split(' ')[0] ?? 'Concurseiro'

  const recentSessions = sessions.slice(0, 5)

  const materiaColors: Record<string, string> = {
    'Direito Constitucional': 'var(--accent)',
    'Direito Administrativo': 'var(--accent)',
    Português: 'var(--accent2)',
    'Raciocínio Lógico': 'var(--amber)',
    Informática: '#f87171',
  }

  const diasParaProva =
    profile?.exam_date
      ? Math.max(
          0,
          Math.ceil(
            (new Date(profile.exam_date).getTime() - Date.now()) / 86400000
          )
        )
      : null

  return (
    <div style={{ padding: '28px 32px', flex: 1, overflowY: 'auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '28px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            {greeting}, {firstName}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            {dueCards > 0
              ? `${dueCards} flashcard${dueCards > 1 ? 's' : ''} para revisar hoje`
              : 'Nenhum flashcard pendente — continue estudando!'}
          </p>
        </div>

        {diasParaProva !== null && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '10px 16px',
              textAlign: 'right',
              minWidth: '180px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Dias para a prova
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>
              {diasParaProva}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {profile?.target_exam ?? 'Meta não definida'}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {[
          {
            label: 'Horas estudadas',
            value: formatDuration(totalMin),
            delta: 'Total acumulado',
            color: 'var(--accent)',
          },
          {
            label: 'Flashcards para hoje',
            value: String(dueCards),
            delta: dueCards > 0 ? 'Pendentes' : 'Em dia!',
            color: dueCards > 0 ? 'var(--amber)' : 'var(--green)',
          },
          {
            label: 'Taxa de acerto',
            value: `${acerto}%`,
            delta: `${totalAns} questões feitas`,
            color: acerto >= 70 ? 'var(--green)' : 'var(--amber)',
          },
          {
            label: 'Sessões salvas',
            value: String(sessions.length),
            delta: 'Na biblioteca',
            color: 'var(--accent2)',
          },
        ].map(card => (
          <div
            key={card.label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
              }}
            >
              {card.label}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: card.color }}>
              {card.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              {card.delta}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text)',
              marginBottom: '14px',
            }}
          >
            Sessões recentes
          </div>

          {recentSessions.length === 0 ? (
            <div
              style={{
                fontSize: '13px',
                color: 'var(--muted)',
                textAlign: 'center',
                padding: '20px 0',
              }}
            >
              Nenhuma sessão ainda.{' '}
              <a href="/dashboard/busca" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Começar a estudar →
              </a>
            </div>
          ) : (
            recentSessions.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 0',
                  borderBottom:
                    i < recentSessions.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background:
                      materiaColors[s.materia ?? ''] ?? 'var(--accent)',
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.title ?? 'Sessão sem título'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', flexShrink: 0 }}>
                  {formatDuration(s.duration_min ?? 0)}
                </div>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text)',
              marginBottom: '14px',
            }}
          >
            Acesso rápido
          </div>

          {[
            {
              href: '/dashboard/busca',
              label: 'Nova sessão de estudo',
              sub: 'Buscar tema ou enviar PDF',
              color: 'var(--accent)',
            },
            {
              href: '/dashboard/flashcards',
              label: `Revisar ${dueCards} flashcards`,
              sub: 'Repetição espaçada',
              color: 'var(--amber)',
            },
            {
              href: '/dashboard/resumos',
              label: 'Biblioteca de resumos',
              sub: 'Ver sessões salvas',
              color: 'var(--accent2)',
            },
            {
              href: '/dashboard/ferramentas',
              label: 'Iniciar Pomodoro',
              sub: '25min foco + 5min pausa',
              color: 'var(--green)',
            },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '6px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                transition: 'border .12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = item.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>
                  {item.sub}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}