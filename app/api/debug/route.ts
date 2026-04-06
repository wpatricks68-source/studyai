import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, string> = {}

  // 1. Checa variáveis de ambiente
  const openaiKey = process.env.OPENAI_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const tavilyKey = process.env.TAVILY_API_KEY

  results['OPENAI_API_KEY'] = !openaiKey
    ? 'AUSENTE'
    : openaiKey.startsWith('sk-')
      ? `OK (${openaiKey.slice(0, 8)}...)`
      : `FORMATO ESTRANHO (começa com: ${openaiKey.slice(0, 6)})`

  results['NEXT_PUBLIC_SUPABASE_URL'] = supabaseUrl
    ? `OK (${supabaseUrl.slice(0, 30)}...)`
    : 'AUSENTE'

  results['TAVILY_API_KEY'] = tavilyKey
    ? `OK (${tavilyKey.slice(0, 8)}...)`
    : 'AUSENTE'

  // 2. Testa conexão real com a OpenAI
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${openaiKey}` },
      })
      const data = await res.json()

      if (res.ok) {
        // Lista os modelos disponíveis na conta
        const models: string[] = (data.data ?? []).map((m: { id: string }) => m.id)
        const hasGpt4o     = models.some(m => m.includes('gpt-4o'))
        const hasGpt4oMini = models.some(m => m.includes('gpt-4o-mini'))
        const hasGpt35     = models.some(m => m.includes('gpt-3.5'))

        results['OpenAI conexão'] = 'OK — chave válida'
        results['gpt-4o']         = hasGpt4o     ? 'DISPONÍVEL' : 'NÃO DISPONÍVEL'
        results['gpt-4o-mini']    = hasGpt4oMini ? 'DISPONÍVEL' : 'NÃO DISPONÍVEL'
        results['gpt-3.5-turbo']  = hasGpt35     ? 'DISPONÍVEL' : 'NÃO DISPONÍVEL'
      } else {
        results['OpenAI conexão'] = `ERRO ${res.status}: ${data?.error?.message ?? 'sem detalhes'}`
        results['OpenAI código']  = data?.error?.code ?? 'desconhecido'
      }
    } catch (e) {
      results['OpenAI conexão'] = `FALHA DE REDE: ${(e as Error).message}`
    }
  } else {
    results['OpenAI conexão'] = 'NÃO TESTADO — chave ausente'
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
