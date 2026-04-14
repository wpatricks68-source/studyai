import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

type GenType      = 'summary' | 'flashcards' | 'questions'
type TipoQuestoes = 'cv' | 'mc' | 'misto'
type Provider     = 'claude' | 'gpt' | 'gemini' | 'auto'

// ─── Modelos disponíveis por provider ─────────────────────────
const PROVIDER_MODELS: Record<Exclude<Provider, 'auto'>, { id: string; label: string; tier: 'paid' | 'free' }[]> = {
  claude: [
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', tier: 'paid' },
    { id: 'claude-3-5-haiku-20241022',  label: 'Claude 3.5 Haiku',  tier: 'paid' },
    { id: 'claude-3-opus-20240229',    label: 'Claude 3 Opus',     tier: 'paid' },
    { id: 'claude-3-haiku-20240307',   label: 'Claude 3 Haiku',    tier: 'free' },
  ],
  gpt: [
    { id: 'gpt-4o',             label: 'GPT-4o',             tier: 'paid' },
    { id: 'gpt-4o-mini',        label: 'GPT-4o Mini',        tier: 'free' },
    { id: 'gpt-4-turbo',        label: 'GPT-4 Turbo',        tier: 'paid' },
    { id: 'gpt-3.5-turbo',      label: 'GPT-3.5 Turbo',      tier: 'free' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash',          label: 'Gemini 2.0 Flash',        tier: 'free' },
    { id: 'gemini-1.5-pro',            label: 'Gemini 1.5 Pro',          tier: 'paid' },
    { id: 'gemini-1.5-flash',          label: 'Gemini 1.5 Flash',        tier: 'free' },
    { id: 'gemini-1.5-flash-8b',       label: 'Gemini 1.5 Flash 8B',     tier: 'free' },
  ],
}

// ─── Cascade automático (gratuito) ───────────────────────────
const AUTO_CASCADE: { provider: Exclude<Provider,'auto'>; model: string }[] = [
  { provider: 'gemini', model: 'gemini-2.0-flash' },
  { provider: 'gpt',    model: 'gpt-4o-mini' },
  { provider: 'claude', model: 'claude-3-haiku-20240307' },
]

// ─── Prompt builder ───────────────────────────────────────────
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

TAREFA: Crie exatamente ${quantidade} flashcards sobre o tema acima.
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

// ─── Chamada Claude (Anthropic) ────────────────────────────────
async function callClaude(prompt: string, model: string, type: GenType, qtd: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada')
  const anthropic = new Anthropic({ apiKey })
  const message = await anthropic.messages.create({
    model,
    max_tokens: type === 'summary' ? 3000 : type === 'questions' ? Math.max(2000, qtd * 200) : 2000,
    messages: [{ role: 'user', content: prompt }],
  })
  return message.content[0]?.type === 'text' ? message.content[0].text : ''
}

// ─── Chamada GPT (OpenAI) ─────────────────────────────────────
async function callGPT(prompt: string, model: string, type: GenType, qtd: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')
  const openai = new OpenAI({ apiKey })
  const completion = await openai.chat.completions.create({
    model,
    max_tokens: type === 'summary' ? 3000 : type === 'questions' ? Math.max(2000, qtd * 200) : 2000,
    messages: [{ role: 'user', content: prompt }],
  })
  return completion.choices[0]?.message?.content ?? ''
}

// ─── Chamada Gemini (Google) ──────────────────────────────────
async function callGemini(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY não configurada')
  const genAI = new GoogleGenerativeAI(apiKey)
  const genModel = genAI.getGenerativeModel({ model })
  const result = await genModel.generateContent(prompt)
  return result.response.text()
}

// ─── Dispatcher ───────────────────────────────────────────────
async function callProvider(
  provider: Exclude<Provider, 'auto'>,
  model: string,
  prompt: string,
  type: GenType,
  qtd: number,
): Promise<string> {
  if (provider === 'claude') return callClaude(prompt, model, type, qtd)
  if (provider === 'gpt')    return callGPT(prompt, model, type, qtd)
  if (provider === 'gemini') return callGemini(prompt, model)
  throw new Error(`Provider desconhecido: ${provider}`)
}


// ─── Auto cascade ─────────────────────────────────────────────
async function callAuto(prompt: string, type: GenType, qtd: number): Promise<{ result: string; usedProvider: string; usedModel: string }> {
  const errors: string[] = []
  for (const { provider, model } of AUTO_CASCADE) {
    try {
      const result = await callProvider(provider, model, prompt, type, qtd)
      if (result) return { result, usedProvider: provider, usedModel: model }
    } catch (e) {
      errors.push(`${provider}/${model}: ${(e as Error).message}`)
    }
  }
  throw new Error(`Nenhum provider disponível no modo Auto. Erros: ${errors.join(' | ')}`)
}

// ─── Route handler ────────────────────────────────────────────
function getErrorInfo(error: unknown) {
  const message = (error as Error)?.message ?? 'Erro desconhecido'
  const lower = message.toLowerCase()
  const status =
    (error as { status?: number; statusCode?: number })?.status ??
    (error as { statusCode?: number })?.statusCode

  return { message, lower, status }
}

function shouldFallbackToAnotherProvider(error: unknown): boolean {
  const { lower, status } = getErrorInfo(error)

  return (
    status === 429 ||
    status === 401 ||
    lower.includes('rate') ||
    lower.includes('quota') ||
    lower.includes('credit') ||
    lower.includes('billing') ||
    lower.includes('insufficient_quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('too many requests') ||
    lower.includes('authentication') ||
    lower.includes('api key')
  )
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callProviderWithRetry(
  provider: Exclude<Provider, 'auto'>,
  model: string,
  prompt: string,
  type: GenType,
  qtd: number,
): Promise<string> {
  try {
    return await callProvider(provider, model, prompt, type, qtd)
  } catch (error) {
    if (!shouldFallbackToAnotherProvider(error)) throw error
    await sleep(1200)
    return await callProvider(provider, model, prompt, type, qtd)
  }
}

function getDefaultModel(provider: Exclude<Provider, 'auto'>): string {
  return PROVIDER_MODELS[provider]?.[0]?.id ?? ''
}

function buildFallbackChain(
  preferredProvider: Provider,
  preferredModel?: string,
): { provider: Exclude<Provider, 'auto'>; model: string }[] {
  if (preferredProvider === 'auto') {
    return AUTO_CASCADE
  }

  const chain: { provider: Exclude<Provider, 'auto'>; model: string }[] = []

  const p = preferredProvider as Exclude<Provider, 'auto'>

  chain.push({
    provider: p,
    model: preferredModel || getDefaultModel(p),
  })

  for (const item of AUTO_CASCADE) {
    if (item.provider !== p) {
      chain.push(item)
    }
  }

  return chain
}

async function callWithSmartFallback(
  preferredProvider: Provider,
  preferredModel: string | undefined,
  prompt: string,
  type: GenType,
  qtd: number,
) {
  const chain = buildFallbackChain(preferredProvider, preferredModel)
  const errors: string[] = []

  for (let i = 0; i < chain.length; i++) {
    const { provider, model } = chain[i]

    try {
      const result = await callProviderWithRetry(provider, model, prompt, type, qtd)

      return {
        result,
        usedProvider: provider,
        usedModel: model,
        fallbackUsed: i > 0 || preferredProvider === 'auto',
        fallbackMessage:
          i > 0
            ? `Usamos ${provider.toUpperCase()} automaticamente devido a limite ou indisponibilidade.`
            : '',
      }
    } catch (error) {
      const info = getErrorInfo(error)

      console.error(
        `[generate] Falha em ${provider}/${model} | status=${info.status ?? 'sem_status'} | erro=${info.message}`
      )

      errors.push(`${provider}/${model}: ${info.message}`)

      if (!shouldFallbackToAnotherProvider(error)) throw error
    }
  }

  throw new Error(`Todos os provedores falharam. Detalhes: ${errors.join(' | ')}`)
}

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Parse body
    const body = await req.json()
    const {
      content, topic, type, sessionId, quantidade, tipoQuestoes,
      provider = 'gemini',
      model,
    }: {
      content: string; topic: string; type: GenType; sessionId?: string
      quantidade?: number; tipoQuestoes?: TipoQuestoes
      provider?: Provider; model?: string
    } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'content é obrigatório' }, { status: 400 })
    }
    const validTypes: GenType[] = ['summary', 'flashcards', 'questions']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: `type inválido: ${type}` }, { status: 400 })
    }

    const qtd: number = typeof quantidade === 'number' ? quantidade : 10
    const tq: TipoQuestoes = ['cv','mc','misto'].includes(tipoQuestoes ?? '') ? tipoQuestoes! : 'misto'
    const prompt = buildPrompt(type, topic ?? '', content, qtd, tq)

    let result = ''
    let usedProvider = provider
    let usedModel    = model ?? ''
    let fallbackUsed = false
    let fallbackMessage = ''

    // 3. Chamar provider com retry e fallback inteligente
    const smartRes = await callWithSmartFallback(provider, model, prompt, type, qtd)
    result = smartRes.result
    usedProvider = smartRes.usedProvider
    usedModel = smartRes.usedModel
    fallbackUsed = smartRes.fallbackUsed
    fallbackMessage = smartRes.fallbackMessage

    console.log(
      `[generate] OK — provider: ${usedProvider}, modelo: ${usedModel}, tipo: ${type}, fallback: ${fallbackUsed ? 'sim' : 'não'}`
    )

    if (!result) {
      return NextResponse.json(
        { error: 'A IA retornou resposta vazia. Tente novamente.' },
        { status: 500 }
      )
    }

    // 4. Salvar flashcards no banco (best-effort)
    if (type === 'flashcards' && sessionId) {
      try {
        const cleaned = result.replace(/```json|```/g, '').trim()
        const cards: Array<{ front: string; back: string }> = JSON.parse(cleaned)
        let savedCards: any[] = []
        if (Array.isArray(cards) && cards.length > 0) {
          const { data } = await supabase.from('flashcards').insert(
            cards.map(c => ({
              user_id: user.id, session_id: sessionId,
              front: c.front, back: c.back, topic: topic ?? '',
            }))
          ).select('*')
          savedCards = data ?? []
        }
        // Return results to frontend so they have IDs
        return NextResponse.json({ 
          result, 
          provider: usedProvider, 
          model: usedModel, 
          fallbackUsed, 
          fallbackMessage,
          savedCards 
        })
      } catch (e) {
        console.warn('[generate] Salvar flashcards:', (e as Error).message)
      }
    }

    // 5. Salvar questões no banco (best-effort)
    if (type === 'questions' && sessionId) {
      try {
        const cleaned = result.replace(/```json[\s\S]*?```|```/g, '').trim()
        const qs: Array<{
          question: string; tipo: string; options?: string[]
          correct?: number; gabarito?: string; explanation?: string; banca?: string
        }> = JSON.parse(cleaned)
        let savedQuestions: any[] = []
        if (Array.isArray(qs) && qs.length > 0) {
          const { data } = await supabase.from('questions').insert(
            qs.map(q => ({
              user_id: user.id, session_id: sessionId,
              question: q.question, tipo: q.tipo,
              options: q.options ?? null, correct: q.correct ?? null,
              gabarito: q.gabarito ?? null, explanation: q.explanation ?? null,
              banca: q.banca ?? null, topic: topic ?? '',
            }))
          ).select('*')
          savedQuestions = data ?? []
        }
        return NextResponse.json({ 
          result, 
          provider: usedProvider, 
          model: usedModel, 
          fallbackUsed, 
          fallbackMessage,
          savedQuestions 
        })
      } catch (e) {
        console.warn('[generate] Salvar questões:', (e as Error).message)
      }
    }

    return NextResponse.json({ result, provider: usedProvider, model: usedModel, fallbackUsed, fallbackMessage })

  } catch (error: unknown) {
    const msg  = (error as Error).message ?? 'Erro desconhecido'
    const code = (error as { status?: number }).status
    console.error('[generate] Erro final:', msg)

    if (msg.includes('API key') || msg.includes('invalid x-api-key') || msg.includes('authentication') || msg.includes('não configurada')) {
      return NextResponse.json(
        { error: `Chave de API inválida ou não configurada: ${msg}` },
        { status: 500 }
      )
    }
    if (code === 429 || msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('billing') || msg.toLowerCase().includes('credit')) {
      return NextResponse.json(
        { error: 'Os provedores de IA atingiram limite temporário. Aguarde um pouco e tente novamente.' },
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


