import { NextResponse } from 'next/server'

function isHostedEnvironment() {
  return process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV)
}

function sanitizeMessage(value: string) {
  return value
    .replace(/sk-[A-Za-z0-9_\-]+/g, '[redacted-secret]')
    .replace(/tvly-[A-Za-z0-9_\-]+/g, '[redacted-secret]')
}

export async function GET() {
  // Mantem a rota disponivel apenas em ambiente local para evitar exposicao publica.
  if (process.env.NODE_ENV === 'production' || isHostedEnvironment()) {
    return NextResponse.json({ error: 'Rota de debug desabilitada fora do ambiente local.' }, { status: 403 })
  }

  const results: Record<string, string> = {}

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const tavilyKey = process.env.TAVILY_API_KEY

  results['ANTHROPIC_API_KEY'] = !anthropicKey
    ? 'AUSENTE'
    : anthropicKey.startsWith('sk-ant-')
      ? 'PRESENTE (formato esperado)'
      : 'PRESENTE (formato inesperado)'

  results['NEXT_PUBLIC_SUPABASE_URL'] = supabaseUrl ? 'PRESENTE' : 'AUSENTE'
  results['TAVILY_API_KEY'] = tavilyKey ? 'PRESENTE' : 'AUSENTE'

  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
      })
      const data = await res.json()

      if (res.ok) {
        const models: string[] = (data.data ?? []).map((m: { id: string }) => m.id)
        const hasOpus = models.some(model => model.includes('opus'))
        const hasSonnet = models.some(model => model.includes('sonnet'))
        const hasHaiku = models.some(model => model.includes('haiku'))

        results['Anthropic conexao'] = 'OK - chave valida'
        results['claude-opus'] = hasOpus ? 'DISPONIVEL' : 'NAO DISPONIVEL'
        results['claude-sonnet'] = hasSonnet ? 'DISPONIVEL' : 'NAO DISPONIVEL'
        results['claude-haiku'] = hasHaiku ? 'DISPONIVEL' : 'NAO DISPONIVEL'
      } else {
        results['Anthropic conexao'] = `ERRO ${res.status}: ${sanitizeMessage(String(data?.error?.message ?? 'sem detalhes'))}`
      }
    } catch (error) {
      results['Anthropic conexao'] = `FALHA DE REDE: ${sanitizeMessage((error as Error).message)}`
    }
  } else {
    results['Anthropic conexao'] = 'NAO TESTADO - chave ausente'
  }

  if (tavilyKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyKey, query: 'teste', max_results: 1 }),
      })
      results['Tavily conexao'] = res.ok ? 'OK' : `ERRO ${res.status}`
    } catch (error) {
      results['Tavily conexao'] = `FALHA: ${sanitizeMessage((error as Error).message)}`
    }
  } else {
    results['Tavily conexao'] = 'NAO TESTADO - chave ausente'
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ambiente: process.env.VERCEL_ENV ?? 'local',
    resultados: results,
  })
}
