import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { query } = await req.json()
    if (!query) return NextResponse.json({ error: 'query é obrigatório' }, { status: 400 })

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:        process.env.TAVILY_API_KEY,
        query:          `${query} concurso público direito`,
        search_depth:   'advanced',
        include_answer: true,
        include_raw_content: false,
        max_results:    6,
        include_domains: [
          'planalto.gov.br', 'stj.jus.br', 'stf.jus.br',
          'tcu.gov.br', 'dizerodireito.com.br', 'estrategiaconcursos.com.br',
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Tavily error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Search]', error)
    return NextResponse.json({ error: 'Erro na busca' }, { status: 500 })
  }
}
