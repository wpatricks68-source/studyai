import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type GenType = 'summary' | 'flashcards' | 'questions'

// ─── Prompts especializados por tipo ─────────────────────────
function buildPrompt(type: GenType, topic: string, content: string): string {

  const base = `Você é um professor especialista em concursos públicos brasileiros com foco em provas CESPE, FGV, FCC e VUNESP.
Tema do aluno: "${topic}"
Conteúdo de referência:
---
${content.slice(0, 8000)}
---`

  if (type === 'summary') return `${base}

TAREFA: Crie um resumo completo, didático e otimizado para concursos sobre o tema acima.

ESTRUTURA OBRIGATÓRIA (use exatamente estes marcadores):
## [Nome do tema]
Parágrafo introdutório conciso explicando o conceito central.

### Fundamento legal
Liste as bases legais (artigos da CF/88, leis, decretos relevantes).

### Conceito e definição
Explique o conceito com clareza, diferenciando do que o aluno costuma confundir.

### Pontos essenciais
- Ponto 1 mais cobrado nas provas
- Ponto 2
- Ponto 3 (continue com todos os pontos relevantes)

### Distinções importantes
Compare com conceitos relacionados que as bancas costumam confundir (ex: legalidade vs juridicidade).

### Jurisprudência e doutrina
Cite STF, STJ ou doutrina dominante quando relevante.

### Dicas das bancas
**CESPE:** o que mais cobra sobre esse tema
**FGV:** enfoque específico
**FCC/VUNESP:** o que diferencia essas bancas

REGRAS:
- Use markdown com ## para títulos, ### para subtítulos, - para listas, **negrito** para termos-chave
- Seja completo mas objetivo — foque no que cai em prova
- Linguagem clara, sem jargão desnecessário
- Mínimo de 600 palavras`

  if (type === 'flashcards') return `${base}

TAREFA: Crie exatamente 12 flashcards para memorização dos pontos mais cobrados em provas de concurso sobre o tema acima.

REGRAS:
- Retorne APENAS um array JSON válido, sem texto antes ou depois, sem markdown, sem blocos de código
- Cada card deve ter pergunta objetiva na frente e resposta direta e completa no verso
- Cubra: conceitos, base legal, distinções doutrinárias, jurisprudência, pegadinhas de prova
- As perguntas devem simular o estilo das bancas (diretas, técnicas)
- Respostas completas mas concisas (máximo 3 linhas)

FORMATO EXATO:
[
  {"front": "pergunta objetiva aqui", "back": "resposta direta e completa aqui"},
  {"front": "...", "back": "..."}
]`

  // questions
  return `${base}

TAREFA: Crie 6 questões de concurso público sobre o tema acima, misturando os estilos:
- 3 questões estilo CESPE (certo ou errado)
- 3 questões de múltipla escolha com 5 alternativas estilo FGV

REGRAS:
- Retorne APENAS um array JSON válido, sem texto antes ou depois, sem markdown, sem blocos de código
- As questões devem ser realistas, no nível das provas reais
- Inclua armadilhas comuns que as bancas usam
- A explicação deve ser didática e citar o fundamento legal

FORMATO EXATO para certo/errado:
{"question": "enunciado da questão","tipo": "cv","gabarito": "C","explanation": "Explicação detalhada com fundamento legal"}

FORMATO EXATO para múltipla escolha:
{"question": "enunciado da questão","tipo": "mc","options": ["A alternativa A","B alternativa B","C alternativa C","D alternativa D","E alternativa E"],"correct": 2,"explanation": "Explicação detalhada com fundamento legal","banca": "FGV 2024"}

Retorne o array com as 6 questões combinadas.`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const { content, topic, type, sessionId } = body

    if (!content || !type) {
      return NextResponse.json({ error: 'content e type são obrigatórios' }, { status: 400 })
    }

    const validTypes: GenType[] = ['summary', 'flashcards', 'questions']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
    }

    const prompt = buildPrompt(type as GenType, topic ?? '', content)

    const completion = await openai.chat.completions.create({
      model:       'gpt-4o',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  type === 'summary' ? 3000 : 2000,
      temperature: type === 'summary' ? 0.4 : 0.6, // resumo mais preciso, outros com mais variedade
    })

    const result = completion.choices[0].message.content ?? ''

    // ── Salvar flashcards no banco ────────────────────────────
    if (type === 'flashcards' && sessionId) {
      try {
        const cleaned = result.replace(/```json|```/g, '').trim()
        const cards: Array<{ front: string; back: string }> = JSON.parse(cleaned)
        if (Array.isArray(cards) && cards.length > 0) {
          await supabase.from('flashcards').insert(
            cards.map(c => ({
              user_id:    user.id,
              session_id: sessionId,
              front:      c.front,
              back:       c.back,
              topic:      topic ?? '',
            }))
          )
        }
      } catch (e) {
        console.error('[Flashcards save]', e)
      }
    }

    // ── Salvar questões no banco ──────────────────────────────
    if (type === 'questions' && sessionId) {
      try {
        const cleaned = result.replace(/```json|```/g, '').trim()
        const questions: Array<{
          question: string; tipo: string; options?: string[]
          correct?: number; gabarito?: string; explanation?: string; banca?: string
        }> = JSON.parse(cleaned)
        if (Array.isArray(questions) && questions.length > 0) {
          await supabase.from('questions').insert(
            questions.map(q => ({
              user_id:     user.id,
              session_id:  sessionId,
              question:    q.question,
              tipo:        q.tipo,
              options:     q.options ?? null,
              correct:     q.correct ?? null,
              gabarito:    q.gabarito ?? null,
              explanation: q.explanation ?? null,
              banca:       q.banca ?? null,
              topic:       topic ?? '',
            }))
          )
        }
      } catch (e) {
        console.error('[Questions save]', e)
      }
    }

    return NextResponse.json({ result })

  } catch (error) {
    console.error('[AI Generate]', error)
    return NextResponse.json({ error: 'Erro ao gerar conteúdo com IA' }, { status: 500 })
  }
}
