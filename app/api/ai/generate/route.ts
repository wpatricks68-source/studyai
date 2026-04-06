import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

type GenType = 'summary' | 'flashcards' | 'questions'

function buildPrompt(type: GenType, topic: string, content: string): string {
  const base = `Você é um professor especialista em concursos públicos brasileiros com foco em provas CESPE, FGV, FCC e VUNESP.
Tema do aluno: "${topic}"
Conteúdo de referência:
---
${content.slice(0, 8000)}
---`

  if (type === 'summary') return `${base}

TAREFA: Crie um resumo completo, didático e otimizado para concursos sobre o tema acima.

ESTRUTURA OBRIGATÓRIA:
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
Compare com conceitos relacionados que as bancas costumam confundir.

### Jurisprudência e doutrina
Cite STF, STJ ou doutrina dominante quando relevante.

### Dicas das bancas
**CESPE:** o que mais cobra sobre esse tema
**FGV:** enfoque específico
**FCC/VUNESP:** o que diferencia essas bancas

Use markdown. Mínimo de 500 palavras. Foque no que cai em prova.`

  if (type === 'flashcards') return `${base}

TAREFA: Crie exatamente 12 flashcards sobre o tema acima.
Retorne APENAS um array JSON válido, sem texto antes ou depois, sem markdown.

[{"front": "pergunta objetiva aqui", "back": "resposta direta e completa aqui"}]`

  return `${base}

TAREFA: Crie 6 questões de concurso (3 CESPE certo/errado + 3 FGV múltipla escolha).
Retorne APENAS um array JSON válido, sem texto antes ou depois, sem markdown.

Formato certo/errado: {"question":"enunciado","tipo":"cv","gabarito":"C","explanation":"explicação com fundamento legal"}
Formato múltipla escolha: {"question":"enunciado","tipo":"mc","options":["A texto","B texto","C texto","D texto","E texto"],"correct":2,"explanation":"explicação","banca":"FGV 2024"}`
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar API key ANTES de qualquer coisa
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[generate] OPENAI_API_KEY ausente nas env vars')
      return NextResponse.json(
        { error: 'Chave da OpenAI não configurada. Adicione OPENAI_API_KEY nas variáveis de ambiente da Vercel.' },
        { status: 500 }
      )
    }

    // 2. Autenticação
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 3. Parse body
    const body = await req.json()
    const { content, topic, type, sessionId } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'content é obrigatório' }, { status: 400 })
    }
    const validTypes: GenType[] = ['summary', 'flashcards', 'questions']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: `type inválido: ${type}` }, { status: 400 })
    }

    // 4. Instanciar OpenAI DENTRO da função (não no escopo do módulo)
    const openai = new OpenAI({ apiKey })
    const prompt = buildPrompt(type as GenType, topic ?? '', content)

    // 5. Tentar modelos em cascata
    let result = ''
    const models = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']

    for (const model of models) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages:    [{ role: 'user', content: prompt }],
          max_tokens:  type === 'summary' ? 3000 : 2000,
          temperature: type === 'summary' ? 0.4 : 0.6,
        })
        result = completion.choices[0]?.message?.content ?? ''
        console.log(`[generate] OK — modelo: ${model}, tipo: ${type}`)
        break
      } catch (modelErr: unknown) {
        const msg = (modelErr as Error).message ?? ''
        console.warn(`[generate] Falhou ${model}: ${msg}`)

        const isModelUnavailable =
          msg.includes('model') ||
          msg.includes('does not exist') ||
          msg.includes('deprecated') ||
          msg.includes('not supported')

        if (!isModelUnavailable) throw modelErr
        if (model === models[models.length - 1]) {
          throw new Error('Nenhum modelo OpenAI disponível. Verifique seu plano em platform.openai.com')
        }
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: 'A IA retornou resposta vazia. Tente novamente.' },
        { status: 500 }
      )
    }

    // 6. Salvar flashcards no banco (best-effort)
    if (type === 'flashcards' && sessionId) {
      try {
        const cleaned = result.replace(/```json|```/g, '').trim()
        const cards: Array<{ front: string; back: string }> = JSON.parse(cleaned)
        if (Array.isArray(cards) && cards.length > 0) {
          await supabase.from('flashcards').insert(
            cards.map(c => ({
              user_id: user.id, session_id: sessionId,
              front: c.front, back: c.back, topic: topic ?? '',
            }))
          )
        }
      } catch (e) {
        console.warn('[generate] Salvar flashcards:', (e as Error).message)
      }
    }

    // 7. Salvar questões no banco (best-effort)
    if (type === 'questions' && sessionId) {
      try {
        const cleaned = result.replace(/```json|```/g, '').trim()
        const qs: Array<{
          question: string; tipo: string; options?: string[]
          correct?: number; gabarito?: string; explanation?: string; banca?: string
        }> = JSON.parse(cleaned)
        if (Array.isArray(qs) && qs.length > 0) {
          await supabase.from('questions').insert(
            qs.map(q => ({
              user_id: user.id, session_id: sessionId,
              question: q.question, tipo: q.tipo,
              options: q.options ?? null, correct: q.correct ?? null,
              gabarito: q.gabarito ?? null, explanation: q.explanation ?? null,
              banca: q.banca ?? null, topic: topic ?? '',
            }))
          )
        }
      } catch (e) {
        console.warn('[generate] Salvar questões:', (e as Error).message)
      }
    }

    return NextResponse.json({ result })

  } catch (error: unknown) {
    const msg  = (error as Error).message ?? 'Erro desconhecido'
    const code = (error as { status?: number }).status
    console.error('[generate] Erro final:', msg)

    if (msg.includes('API key') || msg.includes('Incorrect API key') || msg.includes('invalid_api_key')) {
      return NextResponse.json(
        { error: 'Chave da OpenAI inválida. Verifique OPENAI_API_KEY nas variáveis de ambiente da Vercel.' },
        { status: 500 }
      )
    }
    if (msg.includes('quota') || msg.includes('billing') || code === 429) {
      return NextResponse.json(
        { error: 'Limite de uso da OpenAI atingido. Adicione créditos em platform.openai.com/account/billing' },
        { status: 429 }
      )
    }
    if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { error: 'A IA demorou muito. Tente novamente.' },
        { status: 504 }
      )
    }

    return NextResponse.json({ error: `Erro: ${msg}` }, { status: 500 })
  }
}