import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSearchLimits, normalizePlanTier, type SearchMode } from '@/lib/search-plans'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

    const { query, searchMode = 'alto' } = await req.json() as { query?: string; searchMode?: SearchMode }
    if (!query?.trim()) return NextResponse.json({ error: 'query e obrigatorio' }, { status: 400 })

    const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    const planTier = normalizePlanTier(profileRes.data?.plan_tier)
    const limits = getSearchLimits(planTier, searchMode)

    if (searchMode === 'advanced' && !limits.canUseAdvanced) {
      return NextResponse.json({ error: 'Seu plano atual nao permite Busca Avancada com IA.' }, { status: 403 })
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${query.trim()} direito concurso publico CESPE FGV`,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: true,
        max_results: Math.max(limits.maxSources, 3),
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

    if (!response.ok) throw new Error('Falha na API de busca')

    const data = await response.json()
    const results = (data.results ?? [])
      .map((r: { title: string; url: string; content?: string; raw_content?: string; score?: number }) => ({
        title: r.title,
        url: r.url,
        content: (r.raw_content ?? r.content ?? '').slice(0, limits.maxCharsPerSource),
        score: r.score ?? 0,
      }))
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)

    return NextResponse.json({
      answer: data.answer ?? '',
      results: results.slice(0, limits.maxSources),
      planTier,
      searchMode,
      limits: {
        maxSources: limits.maxSources,
        maxCharsPerSource: limits.maxCharsPerSource,
      },
    })
  } catch (error) {
    console.error('[Search]', error)
    return NextResponse.json({ error: 'Erro na busca. Tente novamente.' }, { status: 500 })
  }
}
