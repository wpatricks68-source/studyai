import { redirect } from 'next/navigation'
import StudentAreaPanel from '@/components/ui/StudentAreaPanel'
import { createClient } from '@/lib/supabase/server'
import { normalizePlanTier } from '@/lib/search-plans'

export default async function AlunoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [profileRes, sessionsCountRes, flashcardsCountRes, answersCountRes] = await Promise.allSettled([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('study_sessions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('flashcards').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('question_answers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null

  const stats = {
    sessionsCount: sessionsCountRes.status === 'fulfilled' ? sessionsCountRes.value.count ?? 0 : 0,
    flashcardsCount: flashcardsCountRes.status === 'fulfilled' ? flashcardsCountRes.value.count ?? 0 : 0,
    answersCount: answersCountRes.status === 'fulfilled' ? answersCountRes.value.count ?? 0 : 0,
  }

  const completionChecks = [
    Boolean(user.email),
    Boolean(profile?.name),
    Boolean(profile?.target_exam),
    Boolean(profile?.exam_date),
    Number(profile?.daily_goal ?? 0) > 0,
  ]
  const profileCompletion = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100
  )

  return (
    <StudentAreaPanel
      user={{
        id: user.id,
        email: user.email ?? '',
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
      }}
      initialProfile={profile}
      stats={stats}
      profileCompletion={profileCompletion}
      normalizedPlan={normalizePlanTier(profile?.plan_tier)}
    />
  )
}
