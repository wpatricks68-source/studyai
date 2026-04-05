import { createClient } from '@/lib/supabase/server'

export default async function EstatisticasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: sessions }, { data: answers }, { data: flashcards }] = await Promise.all([
    supabase.from('study_sessions').select('materia, duration_min, created_at').eq('user_id', user!.id),
    supabase.from('question_answers').select('is_correct, answered_at').eq('user_id', user!.id),
    supabase.from('flashcards').select('difficulty, next_review').eq('user_id', user!.id),
  ])

  const totalMin      = (sessions ?? []).reduce((s, r) => s + (r.duration_min ?? 0), 0)
  const totalHoras    = Math.round(totalMin / 60 * 10) / 10
  const totalAnswers  = (answers ?? []).length
  const totalCorrect  = (answers ?? []).filter(a => a.is_correct).length
  const acerto        = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0
  const dueToday      = (flashcards ?? []).filter(f => new Date(f.next_review) <= new Date()).length

  // Horas por matéria
  const porMateria: Record<string, number> = {}
  ;(sessions ?? []).forEach(s => {
    if (s.materia) porMateria[s.materia] = (porMateria[s.materia] ?? 0) + (s.duration_min ?? 0)
  })
  const materiaList = Object.entries(porMateria).sort((a, b) => b[1] - a[1])
  const maxMin      = materiaList[0]?.[1] ?? 1

  const statCards = [
    { label: 'Total de horas',     value: `${totalHoras}h`,      color: 'var(--accent)' },
    { label: 'Questões feitas',    value: String(totalAnswers),   color: 'var(--accent2)' },
    { label: 'Taxa de acerto',     value: `${acerto}%`,          color: acerto >= 70 ? 'var(--green)' : 'var(--amber)' },
    { label: 'Cards para revisar', value: String(dueToday),      color: dueToday > 0 ? 'var(--amber)' : 'var(--green)' },
    { label: 'Sessões salvas',     value: String(sessions?.length ?? 0), color: 'var(--accent)' },
    { label: 'Acertos totais',     value: String(totalCorrect),  color: 'var(--green)' },
  ]

  return (
    <div style={{ padding: '28px 32px', flex: 1, overflowY: 'auto' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Estatísticas</h1>
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '28px' }}>Acompanhe sua evolução</p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '12px', marginBottom: '28px' }}>
        {statCards.map(c => (
          <div key={c.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{c.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Horas por matéria */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '16px' }}>Horas por matéria</div>
        {materiaList.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
            Nenhuma sessão registrada ainda.
          </div>
        ) : materiaList.map(([mat, min]) => {
          const pct = Math.round((min / maxMin) * 100)
          const h   = Math.round(min / 60 * 10) / 10
          return (
            <div key={mat} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '5px' }}>
                <span>{mat}</span>
                <span style={{ color: 'var(--text)' }}>{h}h</span>
              </div>
              <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: '3px' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Desempenho em questões */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '16px' }}>Desempenho em questões</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--green)' }}>{totalCorrect}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Corretas</div>
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--red)' }}>{totalAnswers - totalCorrect}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Erradas</div>
          </div>
        </div>
        {totalAnswers === 0 && (
          <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', marginTop: '16px' }}>
            Faça questões na área de busca para ver seu desempenho aqui.
          </div>
        )}
      </div>
    </div>
  )
}
