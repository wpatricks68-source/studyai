import { createClient } from '@/lib/supabase/server'
import EstudoAtivoLibrary from '@/components/study/EstudoAtivoLibrary'

export default async function EstudoAtivoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Busca todas as sessions do user para cruzar materia/topic com flashcards e questões
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('id, materia, topic')
    .eq('user_id', user!.id)

  const sessionIds = (sessions ?? []).map(s => s.id)

  // Mapa rápido de session_id → materia e topic
  const sessionMap = new Map(
    (sessions ?? []).map(s => [s.id, { materia: s.materia, topic: s.topic }])
  )

  const [{ data: rawCards }, { data: rawQuestions }] = await Promise.all([
    supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('questions')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  // Enriquecer flashcards com materia/topic da sessão se não tiver
  const flashcards = (rawCards ?? []).map(c => ({
    ...c,
    materia: c.materia ?? sessionMap.get(c.session_id)?.materia ?? null,
    topic:   c.topic   ?? sessionMap.get(c.session_id)?.topic   ?? null,
  }))

  // Filtrar apenas questões vinculadas a sessions do user (segurança extra)
  const questions = (rawQuestions ?? []).map(q => ({
    ...q,
    materia: q.materia ?? sessionMap.get(q.session_id)?.materia ?? null,
    topic:   q.topic   ?? sessionMap.get(q.session_id)?.topic   ?? null,
  }))

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <EstudoAtivoLibrary flashcards={flashcards} questions={questions} />
    </div>
  )
}
