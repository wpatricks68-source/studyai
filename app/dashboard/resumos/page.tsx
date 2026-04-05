import { createClient } from '@/lib/supabase/server'
import ResumoLibrary from '@/components/study/ResumoLibrary'

export default async function ResumosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return <ResumoLibrary sessions={sessions ?? []} />
}
