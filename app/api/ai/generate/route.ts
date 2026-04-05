import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, buildPrompt, type GenerateType } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { content, type, sessionId } = await req.json()

    if (!content || !type) {
      return NextResponse.json({ error: 'content e type são obrigatórios' }, { status: 400 })
    }

    const validTypes: GenerateType[] = ['summary', 'flashcards', 'questions']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
    }

    const prompt = buildPrompt(content, type as GenerateType)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2500,
      temperature: 0.7,
    })

    const result = completion.choices[0].message.content ?? ''

    // Salvar flashcards e questões no banco automaticamente
    if (type === 'flashcards' && sessionId) {
      try {
        const cleaned = result.replace(/```json|```/g, '').trim()
        const cards: Array<{ front: string; back: string }> = JSON.parse(cleaned)
        const rows = cards.map(c => ({
          user_id:    user.id,
          session_id: sessionId,
          front:      c.front,
          back:       c.back,
        }))
        await supabase.from('flashcards').insert(rows)
      } catch { /* JSON inválido — retorna resultado bruto */ }
    }

    if (type === 'questions' && sessionId) {
      try {
        const cleaned = result.replace(/```json|```/g, '').trim()
        const questions: Array<{
          question: string; tipo: string; options?: string[];
          correct?: number; gabarito?: string; explanation?: string; banca?: string
        }> = JSON.parse(cleaned)
        const rows = questions.map(q => ({
          user_id:     user.id,
          session_id:  sessionId,
          question:    q.question,
          tipo:        q.tipo,
          options:     q.options ?? null,
          correct:     q.correct ?? null,
          gabarito:    q.gabarito ?? null,
          explanation: q.explanation ?? null,
          banca:       q.banca ?? null,
        }))
        await supabase.from('questions').insert(rows)
      } catch { /* JSON inválido — retorna resultado bruto */ }
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error('[AI Generate]', error)
    return NextResponse.json({ error: 'Erro interno ao gerar conteúdo' }, { status: 500 })
  }
}
