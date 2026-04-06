import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const log: string[] = []

  try {
    log.push('1. Iniciando')

    // Lê body
    const body = await req.json()
    log.push(`2. Body recebido: content=${!!body.content}, type=${body.type}, topic=${body.topic}`)

    const apiKey = process.env.OPENAI_API_KEY
    log.push(`3. API key: ${apiKey ? 'presente' : 'AUSENTE'}`)

    // Importa OpenAI
    const { default: OpenAI } = await import('openai')
    log.push('4. OpenAI importado')

    const openai = new OpenAI({ apiKey })
    log.push('5. Cliente criado')

    // Chamada mínima
    const completion = await openai.chat.completions.create({
      model:      'gpt-4o-mini',
      messages:   [{ role: 'user', content: `Responda em 1 linha: o que é ${body.topic ?? 'legalidade'}?` }],
      max_tokens: 50,
    })
    log.push('6. Completion OK')

    const result = completion.choices[0]?.message?.content ?? ''
    log.push(`7. Resultado: "${result}"`)

    return NextResponse.json({ ok: true, result, log })

  } catch (err: unknown) {
    const e = err as Error & { status?: number; code?: string; response?: { status: number; data: unknown } }
    log.push(`ERRO: ${e.message}`)

    return NextResponse.json({
      ok:      false,
      log,
      error:   e.message,
      status:  e.status,
      code:    e.code,
      // Erro detalhado da OpenAI se disponível
      detail:  e.response?.data ?? null,
      stack:   e.stack?.split('\n').slice(0, 5),
    }, { status: 200 }) // status 200 para o browser mostrar o JSON
  }
}
