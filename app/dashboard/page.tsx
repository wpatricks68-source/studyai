import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDuration } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return <pre>Erro auth: {JSON.stringify(userError, null, 2)}</pre>
  }

  if (!user) {
    redirect('/auth/login')
  }

  const [
    { data: profile, error: profileError },
    { data: sessions, error: sessionsError },
    { data: flashcards, error: flashcardsError },
    { data: answers, error: answersError },
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

  if (profileError || sessionsError || flashcardsError || answersError) {
    return (
      <div style={{ padding: 40, background: '#020617', color: 'white', minHeight: '100vh' }}>
        <h1>Erros nas consultas</h1>
        <pre>
{JSON.stringify(
  {
    profileError,
    sessionsError,
    flashcardsError,
    answersError,
  },
  null,
  2
)}
        </pre>
      </div>
    )
  }

  const totalMin = (sessions ?? []).reduce(
    (s: number, r: any) => s + (r.duration_min ?? 0),
    0
  )
  const dueCards = (flashcards ?? []).filter(
    (f: any) => f.next_review && new Date(f.next_review) <= new Date()
  ).length
  const totalAns = (answers ?? []).length
  const correctAns = (answers ?? []).filter((a: any) => a.is_correct).length
  const acerto = totalAns > 0 ? Math.round((correctAns / totalAns) * 100) : 0

  const hora = new Date().getHours()
  const greeting = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = profile?.name?.split(' ')[0] ?? 'Concurseiro'

  return (
    <div style={{ padding: 40, background: '#020617', color: 'white', minHeight: '100vh' }}>
      <h1>{greeting}, {firstName}</h1>
      <p>Dashboard carregou.</p>
      <ul>
        <li>Horas estudadas: {formatDuration(totalMin)}</li>
        <li>Flashcards para hoje: {dueCards}</li>
        <li>Taxa de acerto: {acerto}%</li>
        <li>Sessões salvas: {sessions?.length ?? 0}</li>
      </ul>
    </div>
  )
}