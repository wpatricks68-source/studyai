import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

type GenType      = 'summary' | 'flashcards' | 'questions'
type TipoQuestoes = 'cv' | 'mc' | 'misto'

function buildPrompt(
  type: GenType,
  topic: string,
  content: string,
  quantidade = 10,
  tipoQuestoes: TipoQuestoes = 'misto',
): string {
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

  const instrucaoTipo =
    tipoQuestoes === 'cv'
      ? 'TODAS as questões devem ser do tipo CERTO/ERRADO no estilo CEBRASPE/CESPE.'
      : tipoQuestoes === 'mc'
        ? 'TODAS as questões devem ser de MÚLTIPLA ESCOLHA com exatamente 5 alternativas (A/B/C/D/E).'
        : `Misture os tipos: aproximadamente metade CERTO/ERRADO (CEBRASPE) e metade MÚLTIPLA ESCOLHA com 5 alternativas.`

  return `${base}

TAREFA: Crie exatamente ${quantidade} questões de concurso sobre o tema acima.
${instrucaoTipo}
Retorne APENAS um array JSON válido, sem texto antes ou depois, sem markdown, sem \`\`\`json.

Para questões CERTO/ERRADO use este formato exato:
{"question":"enunciado completo da questão","tipo":"cv","gabarito":"C","explanation":"explicação detalhada com fundamento legal","banca":"CEBRASPE 2024"}

Para questões MÚLTIPLA ESCOLHA use este formato exato:
{"question":"enunciado completo da questão","tipo":"mc","options":["A) texto da alternativa","B) texto","C) texto","D) texto","E) texto"],"correct":2,"explanation":"explicação detalhada","banca":"FGV 2024"}

Regras:
- "gabarito" deve ser "C" (certo) ou "E" (errado) apenas para tipo "cv"
- "correct" é o índice 0-4 da alternativa correta apenas para tipo "mc"
- Cubra os pontos mais cobrados em concursos sobre o tema
- Varie o nível de dificuldade entre as questões`
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar API key ANTES de qualquer coisa
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[generate] ANTHROPIC_API_KEY ausente nas env vars')
      return NextResponse.json(
        { error: 'Chave da Anthropic não configurada. Adicione ANTHROPIC_API_KEY nas variáveis de ambiente.' },
        { status: 500 }
      )
    }

    // 2. Autenticação
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 3. Parse body
    const body = await req.json()
    const { content, topic, type, sessionId, quantidade, tipoQuestoes } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'content é obrigatório' }, { status: 400 })
    }
    const validTypes: GenType[] = ['summary', 'flashcards', 'questions']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: `type inválido: ${type}` }, { status: 400 })
    }

    const qtd: number        = typeof quantidade   === 'number' ? quantidade   : 10
    const tq: TipoQuestoes   = ['cv','mc','misto'].includes(tipoQuestoes) ? tipoQuestoes : 'misto'

    // 4. Chamar a API da Anthropic
    const anthropic = new Anthropic({ apiKey })
    const prompt = buildPrompt(type as GenType, topic ?? '', content, qtd, tq)

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: type === 'summary' ? 3000 : type === 'questions' ? Math.max(2000, qtd * 200) : 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const result = message.content[0]?.type === 'text' ? message.content[0].text : ''
    console.log(`[generate] OK — modelo: claude-opus-4-6, tipo: ${type}`)

    if (!result) {
      return NextResponse.json(
        { error: 'A IA retornou resposta vazia. Tente novamente.' },
        { status: 500 }
      )
    }

    // 5. Salvar flashcards no banco (best-effort)
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

    // 6. Salvar questões no banco (best-effort)
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

    if (msg.includes('API key') || msg.includes('invalid x-api-key') || msg.includes('authentication')) {
      return NextResponse.json(
        { error: 'Chave da Anthropic inválida. Verifique ANTHROPIC_API_KEY nas variáveis de ambiente.' },
        { status: 500 }
      )
    }
    if (msg.includes('rate') || code === 429) {
      return NextResponse.json(
        { error: 'Limite de uso da Anthropic atingido. Aguarde alguns instantes e tente novamente.' },
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
