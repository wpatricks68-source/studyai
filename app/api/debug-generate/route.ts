import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const log: string[] = []

  try {
    log.push('1. Iniciando')

    // Lê body
    const body = await req.json()
    log.push(`2. Body recebido: content=${!!body.content}, type=${body.type}, topic=${body.topic}`)

    const apiKey = process.env.ANTHROPIC_API_KEY
    log.push(`3. API key: ${apiKey ? 'presente' : 'AUSENTE'}`)

    // Importa Anthropic
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    log.push('4. Anthropic importado')

    const anthropic = new Anthropic({ apiKey })
    log.push('5. Cliente criado')

    // Chamada mínima
    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5',
      messages:   [{ role: 'user', content: `Responda em 1 linha: o que é ${body.topic ?? 'legalidade'}?` }],
      max_tokens: 50,
    })
    log.push('6. Message OK')

    const result = message.content[0]?.type === 'text' ? message.content[0].text : ''
    log.push(`7. Resultado: "${result}"`)

    return NextResponse.json({ ok: true, result, log })

  } catch (err: unknown) {
    const e = err as Error & { status?: number; code?: string }
    log.push(`ERRO: ${e.message}`)

    return NextResponse.json({
      ok:      false,
      log,
      error:   e.message,
      status:  e.status,
      code:    e.code,
      stack:   e.stack?.split('\n').slice(0, 5),
    }, { status: 200 })
  }
}
