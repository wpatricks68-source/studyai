import { NextRequest, NextResponse } from 'next/server'

function isHostedEnvironment() {
  return process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV)
}

function sanitizeMessage(value: string) {
  return value
    .replace(/sk-[A-Za-z0-9_\-]+/g, '[redacted-secret]')
    .replace(/tvly-[A-Za-z0-9_\-]+/g, '[redacted-secret]')
}

export async function POST(req: NextRequest) {
  // Mantem a rota disponivel apenas em ambiente local para evitar exposicao publica.
  if (process.env.NODE_ENV === 'production' || isHostedEnvironment()) {
    return NextResponse.json({ error: 'Rota de debug desabilitada fora do ambiente local.' }, { status: 403 })
  }

  const log: string[] = []

  try {
    log.push('1. Iniciando')

    const body = await req.json()
    log.push(`2. Body recebido: content=${Boolean(body.content)}, type=${String(body.type ?? 'desconhecido')}, topic=${Boolean(body.topic)}`)

    const apiKey = process.env.ANTHROPIC_API_KEY
    log.push(`3. API key: ${apiKey ? 'presente' : 'AUSENTE'}`)

    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    log.push('4. Anthropic importado')

    const anthropic = new Anthropic({ apiKey })
    log.push('5. Cliente criado')

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      messages: [{ role: 'user', content: `Responda em 1 linha: o que e ${body.topic ?? 'legalidade'}?` }],
      max_tokens: 50,
    })
    log.push('6. Message OK')

    const result = message.content[0]?.type === 'text' ? message.content[0].text : ''
    log.push('7. Resultado recebido')

    return NextResponse.json({ ok: true, result, log })
  } catch (err: unknown) {
    const error = err as Error & { status?: number; code?: string }
    const safeMessage = sanitizeMessage(error.message)
    log.push(`ERRO: ${safeMessage}`)

    return NextResponse.json({
      ok: false,
      log,
      error: safeMessage,
      status: error.status,
      code: error.code,
    }, { status: 200 })
  }
}
