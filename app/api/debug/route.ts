import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, string> = {}

  // 1. Checa variáveis de ambiente
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const tavilyKey = process.env.TAVILY_API_KEY

  results['ANTHROPIC_API_KEY'] = !anthropicKey
    ? 'AUSENTE'
    : anthropicKey.startsWith('sk-ant-')
      ? `OK (${anthropicKey.slice(0, 12)}...)`
      : `FORMATO ESTRANHO (começa com: ${anthropicKey.slice(0, 8)})`

  results['NEXT_PUBLIC_SUPABASE_URL'] = supabaseUrl
    ? `OK (${supabaseUrl.slice(0, 30)}...)`
    : 'AUSENTE'

  results['TAVILY_API_KEY'] = tavilyKey
    ? `OK (${tavilyKey.slice(0, 8)}...)`
    : 'AUSENTE'

  // 2. Testa conexão real com a Anthropic
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
        const hasOpus   = models.some(m => m.includes('opus'))
        const hasSonnet = models.some(m => m.includes('sonnet'))
        const hasHaiku  = models.some(m => m.includes('haiku'))

        results['Anthropic conexão'] = 'OK — chave válida'
        results['claude-opus-4-6']   = hasOpus   ? 'DISPONÍVEL' : 'NÃO DISPONÍVEL'
        results['claude-sonnet-4-6'] = hasSonnet ? 'DISPONÍVEL' : 'NÃO DISPONÍVEL'
        results['claude-haiku-4-5']  = hasHaiku  ? 'DISPONÍVEL' : 'NÃO DISPONÍVEL'
      } else {
        results['Anthropic conexão'] = `ERRO ${res.status}: ${data?.error?.message ?? 'sem detalhes'}`
      }
    } catch (e) {
      results['Anthropic conexão'] = `FALHA DE REDE: ${(e as Error).message}`
    }
  } else {
    results['Anthropic conexão'] = 'NÃO TESTADO — chave ausente'
  }

  // 3. Testa conexão com a Tavily
  if (tavilyKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyKey, query: 'teste', max_results: 1 }),
      })
      results['Tavily conexão'] = res.ok ? 'OK' : `ERRO ${res.status}`
    } catch (e) {
      results['Tavily conexão'] = `FALHA: ${(e as Error).message}`
    }
  } else {
    results['Tavily conexão'] = 'NÃO TESTADO — chave ausente'
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ambiente:  process.env.VERCEL_ENV ?? 'local',
    resultados: results,
  }, { status: 200 })
}
