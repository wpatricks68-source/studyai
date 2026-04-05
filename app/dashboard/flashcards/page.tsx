import { createClient } from '@/lib/supabase/server'
import FlashcardReview from '@/components/study/FlashcardReview'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cards } = await supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', user!.id)
    .lte('next_review', new Date().toISOString())
    .order('next_review', { ascending: true })
    .limit(50)

  const { data: total } = await supabase
    .from('flashcards')
    .select('id', { count: 'exact' })
    .eq('user_id', user!.id)

  return <FlashcardReview cards={cards ?? []} totalCards={total?.length ?? 0} />
}
