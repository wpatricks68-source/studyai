import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { query } = await req.json()
    if (!query?.trim()) return NextResponse.json({ error: 'query é obrigatório' }, { status: 400 })

    // Query enriquecida para concursos
    const enrichedQuery = `${query.trim()} direito concurso público CESPE FGV`

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:             process.env.TAVILY_API_KEY,
        query:               enrichedQuery,
        search_depth:        'advanced',        // pesquisa profunda
        include_answer:      true,              // síntese automática do Tavily
        include_raw_content: true,              // conteúdo completo das páginas
        max_results:         7,
        // Domínios confiáveis para concursos
        include_domains: [
          'planalto.gov.br',
          'stj.jus.br',
          'stf.jus.br',
          'tcu.gov.br',
          'agu.gov.br',
          'dizerodireito.com.br',
          'estrategiaconcursos.com.br',
          'grancursosonline.com.br',
          'conjur.com.br',
          'jus.com.br',
          'ambito-juridico.com.br',
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[Search Tavily]', err)
      throw new Error('Falha na API de busca')
    }

    const data = await response.json()

    // Limpa e normaliza os resultados
    const results = (data.results ?? []).map((r: {
      title: string
      url: string
      content?: string
      raw_content?: string
      score?: number
    }) => ({
      title:   r.title,
      url:     r.url,
      // raw_content tem o texto completo; content é o snippet
      content: r.raw_content?.slice(0, 3000) ?? r.content ?? '',
      score:   r.score ?? 0,
    }))

    // Ordena por score de relevância
    results.sort((a: { score: number }, b: { score: number }) => b.score - a.score)

    return NextResponse.json({
      answer:  data.answer ?? '',
      results: results.slice(0, 6),
    })

  } catch (error) {
    console.error('[Search]', error)
    return NextResponse.json({ error: 'Erro na busca. Tente novamente.' }, { status: 500 })
  }
}
