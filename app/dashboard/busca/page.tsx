'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Tab = 'editor' | 'questoes'
type GenType = 'summary' | 'flashcards' | 'questions'

interface SearchResult {
  title: string
  url: string
  content: string
}

export default function BuscaPage() {
  const [query, setQuery]           = useState('')
  const [searching, setSearching]   = useState(false)
  const [content, setContent]       = useState('')
  const [sessionId, setSessionId]   = useState<string | null>(null)
  const [generating, setGenerating] = useState<GenType | null>(null)
  const [aiResult, setAiResult]     = useState('')
  const [tab, setTab]               = useState<Tab>('editor')
  const [sources, setSources]       = useState<SearchResult[]>([])

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setContent('')
    setAiResult('')
    setSources([])
    setSessionId(null)

    try {
      const res  = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()

      // Montar conteúdo consolidado a partir dos resultados
      const results: SearchResult[] = data.results ?? []
      setSources(results.slice(0, 4))

      const baseContent = [
        data.answer ? `Síntese: ${data.answer}` : '',
        ...results.slice(0, 4).map((r: SearchResult) =>
          `## ${r.title}\n${r.content?.slice(0, 1200) ?? ''}`
        ),
      ].filter(Boolean).join('\n\n')

      setContent(baseContent || 'Nenhum conteúdo encontrado. Tente um tema mais específico.')

      // Gerar resumo automático com IA
      if (baseContent) {
        setGenerating('summary')
        const aiRes  = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `${query}\n\n${baseContent}`, type: 'summary' }),
        })
        const aiData = await aiRes.json()
        setAiResult(aiData.result ?? '')

        // Salvar sessão no Supabase
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: session } = await supabase
            .from('study_sessions')
            .insert({
              user_id:     user.id,
              title:       query,
              topic:       query,
              content:     aiData.result ?? baseContent,
              source_type: 'web',
            })
            .select()
            .single()
          setSessionId(session?.id ?? null)
        }
      }
    } catch (e) {
      console.error(e)
      setContent('Erro na busca. Verifique sua conexão e tente novamente.')
    } finally {
      setSearching(false)
      setGenerating(null)
    }
  }

  async function handleGenerate(type: GenType) {
    if (!content || generating) return
    setGenerating(type)
    setAiResult('')

    try {
      const res  = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `${query}\n\n${content}`, type, sessionId }),
      })
      const data = await res.json()
      setAiResult(data.result ?? '')
      if (type === 'questions') setTab('questoes')
    } finally {
      setGenerating(null)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSearching(true)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res  = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      setQuery(file.name.replace(/\.[^.]+$/, ''))
      setContent(data.content ?? '')
    } finally {
      setSearching(false)
    }
  }

  const showEditor = content || searching

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Search bar */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Digite um tema para estudar..."
            style={{
              flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '9px 14px', color: 'var(--text)',
              fontSize: '14px', outline: 'none',
            }}
          />
          <label style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
            color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            PDF
            <input type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }} onChange={handleUpload} />
          </label>
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            style={{
              padding: '9px 20px', borderRadius: '8px', border: 'none',
              background: searching ? 'var(--surface2)' : 'var(--accent)',
              color: searching ? 'var(--muted)' : '#fff',
              fontSize: '13px', fontWeight: 600, cursor: searching ? 'default' : 'pointer',
            }}
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {!showEditor ? (
        /* Estado vazio */
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '40px', opacity: .3 }}>⌕</div>
          <div style={{ fontSize: '16px', color: 'var(--text)', fontWeight: 500 }}>Pesquise um tema para começar</div>
          <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '340px', lineHeight: 1.6 }}>
            Digite qualquer assunto do seu concurso. A IA buscará na web e gerará um resumo completo automaticamente.
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Editor area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px', background: 'var(--surface)',
              borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap',
            }}>
              {(['summary', 'flashcards', 'questions'] as GenType[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleGenerate(t)}
                  disabled={!content || !!generating}
                  style={{
                    padding: '5px 12px', borderRadius: '7px', border: '1px solid var(--border)',
                    background: generating === t ? 'rgba(108,99,255,.2)' : 'transparent',
                    color: generating === t ? 'var(--accent)' : 'var(--muted)',
                    fontSize: '12px', cursor: content && !generating ? 'pointer' : 'default',
                    transition: 'all .12s',
                  }}
                >
                  {generating === t ? '...' : t === 'summary' ? 'Resumo' : t === 'flashcards' ? 'Flashcards' : 'Questões'}
                </button>
              ))}
              {sessionId && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--green)' }}>
                  ✓ Sessão salva
                </span>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {(['editor', 'questoes'] as Tab[]).map(t => (
                <div
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '9px 16px', fontSize: '13px', cursor: 'pointer',
                    color: tab === t ? 'var(--accent)' : 'var(--muted)',
                    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all .15s',
                  }}
                >
                  {t === 'editor' ? 'Área de estudo' : 'Questões'}
                </div>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '22px 28px' }}>
              {tab === 'editor' ? (
                <div style={{ fontSize: '14px', lineHeight: 1.9, color: '#c8cae6' }}>
                  {searching && !aiResult ? (
                    <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
                      Pesquisando e gerando resumo...
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {aiResult || content}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                  {aiResult && generating === null
                    ? <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left', color: '#c8cae6', fontSize: '13px' }}>{aiResult}</pre>
                    : 'Clique em "Questões" na barra acima para gerar questões sobre este tema.'}
                </div>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div style={{ width: '200px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Fontes
              </div>
              {sources.map((s, i) => (
                <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: i < sources.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.4, marginBottom: '2px' }}>{s.title}</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    {s.url ? new URL(s.url).hostname : ''}
                  </div>
                </div>
              ))}
              {sources.length === 0 && searching && (
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Carregando...</div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
