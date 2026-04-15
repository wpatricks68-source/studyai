import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromFile } from '@/lib/document-text'

type ParsedEditalItem = {
  disciplina: string
  tema: string
  subtema: string
}

type ParsedEditalResponse = {
  boardTitle: string
  items: ParsedEditalItem[]
}

type ProviderResult = {
  provider: 'gpt' | 'gemini' | 'claude' | 'heuristic'
  model: string
  result: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function extractProgramSection(content: string) {
  const normalized = normalizeText(content)
  const startMarkers = [
    'conteudo programatico',
    'conteudos programaticos',
    'programa de disciplinas',
    'programa das provas',
    'conhecimentos basicos',
    'conhecimentos especificos',
  ]
  const endMarkers = [
    'criterios de avaliacao',
    'cronograma',
    'disposicoes finais',
    'avaliacao de titulos',
    'anexo',
    'inscricoes',
    'remuneracao',
  ]

  let startIndex = -1
  for (const marker of startMarkers) {
    const idx = normalized.indexOf(marker)
    if (idx !== -1 && (startIndex === -1 || idx < startIndex)) {
      startIndex = idx
    }
  }

  const safeStart = startIndex === -1 ? 0 : startIndex
  let endIndex = Math.min(content.length, safeStart + 60000)

  for (const marker of endMarkers) {
    const idx = normalized.indexOf(marker, safeStart + 500)
    if (idx !== -1 && idx < endIndex) {
      endIndex = idx
    }
  }

  return content.slice(safeStart, endIndex).trim() || content.slice(0, 60000)
}

function buildPrompt(content: string) {
  return `Voce e um especialista em leitura de editais de concursos publicos brasileiros.
Analise somente o trecho abaixo, foque no CONTEUDO PROGRAMATICO e retorne uma estrutura verticalizada.

RETORNE APENAS UM JSON VALIDO, sem markdown, sem texto antes ou depois, no formato:
{
  "boardTitle": "nome sugerido do edital",
  "items": [
    {
      "disciplina": "nome da disciplina",
      "tema": "tema principal",
      "subtema": "subtema especifico"
    }
  ]
}

Regras obrigatorias:
- Leia apenas materias, topicos e subtitulos estudaveis.
- Ignore salario, requisitos, cronograma, inscricoes, cargos, cabecalhos, rodapes, bibliografia e regras administrativas.
- Preserve a hierarquia do edital em disciplina -> tema -> subtema.
- Se o edital trouxer apenas um topico sem subtema explicito, crie um subtema fiel ao trecho.
- Corrija ruidos de OCR quando estiverem obvios.
- Nao invente assuntos fora do texto.
- Una duplicatas e normalize repeticoes.
- Prefira granularidade de estudo: itens curtos, especificos e objetivos.
- Responda em portugues do Brasil.
- Limite a no maximo 400 itens.

TRECHO DO EDITAL:
"""
${content.slice(0, 45000)}
"""`.trim()
}

function cleanJsonResponse(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
  const objectStart = trimmed.indexOf('{')
  const objectEnd = trimmed.lastIndexOf('}')

  if (objectStart === -1 || objectEnd === -1 || objectEnd <= objectStart) {
    throw new Error('A IA nao retornou um JSON valido.')
  }

  return trimmed.slice(objectStart, objectEnd + 1)
}

function sanitizeItem(item: Partial<ParsedEditalItem>) {
  const disciplina = String(item.disciplina ?? '').replace(/\s+/g, ' ').trim()
  const tema = String(item.tema ?? '').replace(/\s+/g, ' ').trim()
  const subtema = String(item.subtema ?? item.tema ?? '').replace(/\s+/g, ' ').trim()

  if (!disciplina || !tema || !subtema) return null

  return { disciplina, tema, subtema }
}

function dedupeItems(items: ParsedEditalItem[]) {
  const seen = new Set<string>()
  const output: ParsedEditalItem[] = []

  for (const rawItem of items) {
    const item = sanitizeItem(rawItem)
    if (!item) continue

    const key = normalizeText(`${item.disciplina}|${item.tema}|${item.subtema}`)
    if (seen.has(key)) continue
    seen.add(key)
    output.push(item)
  }

  return output.slice(0, 400)
}

function parseAiPayload(text: string): ParsedEditalResponse {
  const payload = JSON.parse(cleanJsonResponse(text)) as Partial<ParsedEditalResponse>
  const items = dedupeItems(Array.isArray(payload.items) ? payload.items : [])

  if (!items.length) {
    throw new Error('A IA nao encontrou itens validos do conteudo programatico.')
  }

  return {
    boardTitle: String(payload.boardTitle ?? 'Edital Verticalizado').trim() || 'Edital Verticalizado',
    items,
  }
}

async function callOpenAI(prompt: string): Promise<ProviderResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY nao configurada')
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    messages: [{ role: 'user', content: prompt }],
  })

  return {
    provider: 'gpt',
    model: 'gpt-4o-mini',
    result: completion.choices[0]?.message?.content ?? '',
  }
}

async function callGemini(prompt: string): Promise<ProviderResult> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY nao configurada')
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  const result = await model.generateContent(prompt)

  return {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    result: result.response.text(),
  }
}

async function callClaude(prompt: string): Promise<ProviderResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY nao configurada')
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 5000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''

  return {
    provider: 'claude',
    model: 'claude-3-5-haiku-20241022',
    result: text,
  }
}

function heuristicSplitTopics(text: string) {
  return text
    .split(/\s*;\s*|\n+/)
    .map(item => item.replace(/^[\dIVXLCM().\-]+\s*/i, '').trim())
    .filter(item => item.length >= 4 && item.length <= 220)
}

function parseHeuristically(content: string, fallbackTitle: string): ParsedEditalResponse {
  const lines = content
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  let currentDiscipline = 'Conteudo Programatico'
  const items: ParsedEditalItem[] = []

  for (const line of lines) {
    const parts = line.split(':')

    if (parts.length >= 2 && parts[0].trim().length <= 60) {
      currentDiscipline = parts[0].trim()
      const right = parts.slice(1).join(':').trim()

      for (const topic of heuristicSplitTopics(right)) {
        items.push({
          disciplina: currentDiscipline,
          tema: topic,
          subtema: topic,
        })
      }

      continue
    }

    const looksLikeHeading =
      line.length <= 60 &&
      !/[.;]/.test(line) &&
      line === line.toUpperCase()

    if (looksLikeHeading) {
      currentDiscipline = line
      continue
    }

    for (const topic of heuristicSplitTopics(line)) {
      items.push({
        disciplina: currentDiscipline,
        tema: topic,
        subtema: topic,
      })
    }
  }

  const deduped = dedupeItems(items)

  if (!deduped.length) {
    throw new Error('Nao foi possivel extrair topicos do edital.')
  }

  return {
    boardTitle: fallbackTitle,
    items: deduped,
  }
}

async function parseWithProviders(prompt: string, fallbackTitle: string, content: string) {
  const providers = [callOpenAI, callGemini, callClaude]
  const errors: string[] = []

  for (const provider of providers) {
    try {
      const response = await provider(prompt)
      const payload = parseAiPayload(response.result)
      return { ...payload, provider: response.provider, model: response.model }
    } catch (error) {
      errors.push((error as Error).message)
    }
  }

  const heuristic = parseHeuristically(content, fallbackTitle)
  return {
    ...heuristic,
    provider: 'heuristic' as const,
    model: errors.length ? `fallback-local (${errors.join(' | ').slice(0, 200)})` : 'fallback-local',
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo nao enviado' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande. Maximo: 10 MB' }, { status: 400 })
    }

    const baseTitle = file.name.replace(/\.[^.]+$/, '').trim() || 'Edital Verticalizado'
    const { content, extractionMode } = await extractTextFromFile(file)
    const focusedContent = extractProgramSection(content)
    const parsed = await parseWithProviders(buildPrompt(focusedContent), baseTitle, focusedContent)

    return NextResponse.json({
      suggestedTitle: parsed.boardTitle,
      items: parsed.items,
      extractionMode,
      fileName: file.name,
      provider: parsed.provider,
      model: parsed.model,
      sourceExcerpt: focusedContent.slice(0, 5000),
    })
  } catch (error) {
    console.error('[edital-verticalizado/parse]', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Erro inesperado ao processar o edital.' },
      { status: 500 }
    )
  }
}
