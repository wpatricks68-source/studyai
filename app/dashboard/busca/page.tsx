'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EditableResumo } from '@/components/study/EditableResumo'

type GenType  = 'summary' | 'flashcards' | 'questions'
type ViewMode = 'resumo' | 'flashcards' | 'questoes'

interface Source { title: string; url: string; snippet: string }

interface Flashcard { front: string; back: string }

interface Question {
  question: string
  tipo: 'cv' | 'mc'
  options?: string[]
  correct?: number
  gabarito?: string
  explanation: string
  banca?: string
}

interface QuestoesConfig {
  quantidade: 5 | 10 | 15 | 20
  tipo: 'cv' | 'mc' | 'misto'
}

interface SessionState {
  query:       string       // disciplina: tema
  disciplina:  string
  tema:        string
  resumo:      string
  flashcards:  Flashcard[]
  questions:   Question[]
  sources:     Source[]
  sessionId:   string | null
  savedAt:     string | null
}

// ─── Estado vazio inicial ───────────────────────────────────
const EMPTY: SessionState = {
  query: '', disciplina: '', tema: '', resumo: '',
  flashcards: [], questions: [],
  sources: [], sessionId: null, savedAt: null,
}

export default function BuscaPage() {
  const [disciplina, setDisciplina] = useState('')
  const [tema,       setTema]       = useState('')
  const [query,      setQuery]      = useState('') // disciplina: tema — mantido para compatibilidade
  const [session,    setSession]    = useState<SessionState>(EMPTY)
  const [view,       setView]       = useState<ViewMode>('resumo')
  const [phase,      setPhase]      = useState<'idle' | 'searching' | 'generating' | 'done'>('idle')
  const [genTarget,  setGenTarget]  = useState<GenType | null>(null)
  const [error,      setError]      = useState('')
  const [showQModal, setShowQModal] = useState(false)
  const [qConfig,    setQConfig]    = useState<QuestoesConfig>({ quantidade: 10, tipo: 'misto' })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      const params = new URLSearchParams(window.location.search)
      const idParam = params.get('id')
      
      if (idParam) {
        setPhase('searching')
        const supabase = createClient()
        const [
          { data, error },
          { data: flashcardsData },
          { data: questionsData }
        ] = await Promise.all([
          supabase.from('study_sessions').select('*').eq('id', idParam).single(),
          supabase.from('flashcards').select('*').eq('session_id', idParam),
          supabase.from('questions').select('*').eq('session_id', idParam)
        ])
        
        if (data && !error) {
          const mat  = data.materia ?? ''
          const top  = data.topic ?? ''
          setDisciplina(mat)
          setTema(top)
          setQuery(mat ? `${mat}: ${top}` : top)
          setSession({
            query:      mat ? `${mat}: ${top}` : top,
            disciplina: mat,
            tema:       top,
            resumo:     data.content ?? '',
            flashcards: Array.isArray(flashcardsData) ? flashcardsData : [],
            questions:  Array.isArray(questionsData)  ? questionsData  : [],
            sources:    [],
            sessionId:  data.id,
            savedAt:    new Date(data.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          })
          setView('resumo')
          setPhase('done')
        } else {
          setPhase('idle')
        }
        return
      }
      
      try {
        const raw = sessionStorage.getItem('busca_session')
        if (!raw) return
        const { session: s, query: q, disciplina: d, tema: t, view: v } = JSON.parse(raw)
        if (s?.resumo) {
          setSession(s)
          setQuery(q ?? '')
          setDisciplina(d ?? '')
          setTema(t ?? '')
          setView(v ?? 'resumo')
          setPhase('done')
        }
      } catch {}
    }
    loadSession()
  }, [])

  useEffect(() => {
    if (phase === 'done' && session.resumo) {
      try {
        sessionStorage.setItem('busca_session', JSON.stringify({ session, query, disciplina, tema, view }))
      } catch {}
    } else if (phase === 'idle' && !session.resumo) {
      sessionStorage.removeItem('busca_session')
    }
  }, [session, query, disciplina, tema, view, phase])

  // ─── Cancelar busca em andamento ──────────────────────────
  function cancel() {
    abortRef.current?.abort()
    setPhase('idle')
    setGenTarget(null)
  }

  // ─── BUSCA PRINCIPAL ──────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const temaFinal = tema.trim()
    const discFinal = disciplina.trim()
    if (!temaFinal || phase !== 'idle') return
    const fullQuery = discFinal ? `${discFinal}: ${temaFinal}` : temaFinal
    setQuery(fullQuery)
    setError('')
    setPhase('searching')
    setSession(EMPTY)
    setView('resumo')
    try { sessionStorage.removeItem('busca_session') } catch {}

    const ac = new AbortController()
    abortRef.current = ac

    try {
      // 1. Busca na web
      const searchRes = await fetch('/api/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: fullQuery }),
        signal:  ac.signal,
      })
      if (!searchRes.ok) throw new Error('Falha na busca. Tente novamente.')
      const searchData = await searchRes.json()

      const rawResults: Array<{ title: string; url: string; content: string }> = searchData.results ?? []
      const sources: Source[] = rawResults.slice(0, 5).map(r => ({
        title:   r.title,
        url:     r.url,
        snippet: (r.content ?? '').slice(0, 200),
      }))

      const contextBlocks = rawResults.slice(0, 5).map((r, i) =>
        `[Fonte ${i + 1}] ${r.title}\n${(r.content ?? '').slice(0, 2000)}`
      ).join('\n\n---\n\n')

      const iaContext = searchData.answer
        ? `Síntese encontrada:\n${searchData.answer}\n\n---\n\nFontes completas:\n${contextBlocks}`
        : contextBlocks

      if (!iaContext.trim()) {
        throw new Error('Nenhum conteúdo encontrado. Tente um tema mais específico.')
      }

      setSession(prev => ({ ...prev, query: fullQuery, disciplina: discFinal, tema: temaFinal, sources }))

      // 2. Gera resumo com IA
      setPhase('generating')
      setGenTarget('summary')

      const resumoRes = await fetch('/api/ai/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          content: iaContext,
          topic:   fullQuery,
          type:    'summary',
        }),
        signal: ac.signal,
      })
      if (!resumoRes.ok) throw new Error('Erro ao gerar resumo com IA.')
      const resumoData = await resumoRes.json()
      const resumo = resumoData.result ?? ''

      // 3. Salva sessão no Supabase — agora com materia = disciplina
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      let sessionId: string | null = null

      if (user && resumo) {
        const { data: saved } = await supabase
          .from('study_sessions')
          .insert({
            user_id:     user.id,
            title:       fullQuery,
            topic:       temaFinal,
            materia:     discFinal || null,
            content:     resumo,
            source_type: 'web',
          })
          .select('id')
          .single()
        sessionId = saved?.id ?? null
      }

      setSession(prev => ({
        ...prev,
        resumo,
        sessionId,
        savedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }))
      setPhase('done')
      setGenTarget(null)

    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return
      setError((e as Error).message || 'Erro inesperado. Tente novamente.')
      setPhase('idle')
    } finally {
      setGenTarget(null)
    }
  }, [tema, disciplina, phase])

  // ─── GERAR FLASHCARDS ─────────────────────────────────────
  async function handleFlashcards() {
    if (!session.resumo || genTarget) return
    setView('flashcards')
    if (session.flashcards.length > 0) return

    setGenTarget('flashcards')
    setError('')

    try {
      const res = await fetch('/api/ai/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          content:   session.resumo,
          topic:     session.query,
          type:      'flashcards',
          sessionId: session.sessionId,
        }),
      })
      if (!res.ok) throw new Error('Erro ao gerar flashcards.')
      const data = await res.json()

      let cards: Flashcard[] = []
      try {
        const cleaned = (data.result ?? '').replace(/```json|```/g, '').trim()
        cards = JSON.parse(cleaned)
      } catch {
        throw new Error('Resposta da IA inválida. Tente novamente.')
      }

      setSession(prev => ({ ...prev, flashcards: cards }))
      setView('flashcards')
    } catch (e: unknown) {
      setError((e as Error).message || 'Erro ao gerar flashcards.')
    } finally {
      setGenTarget(null)
    }
  }

  // ─── GERAR QUESTÕES — abre modal de configuração ─────────
  function handleQuestions() {
    if (!session.resumo || genTarget) return
    if (session.questions.length > 0) { setView('questoes'); return }
    setShowQModal(true)
  }

  async function generateQuestions(cfg: QuestoesConfig) {
    setShowQModal(false)
    setView('questoes')
    setGenTarget('questions')
    setError('')

    try {
      const res = await fetch('/api/ai/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          content:       session.resumo,
          topic:         session.query,
          type:          'questions',
          sessionId:     session.sessionId,
          quantidade:    cfg.quantidade,
          tipoQuestoes:  cfg.tipo,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Erro ao gerar questões.')
      }
      const data = await res.json()

      let qs: Question[] = []
      try {
        const cleaned = (data.result ?? '').replace(/```json[\s\S]*?```|```/g, '').trim()
        qs = JSON.parse(cleaned)
        if (!Array.isArray(qs)) throw new Error()
      } catch {
        throw new Error('Resposta da IA inválida. Tente novamente.')
      }

      setSession(prev => ({ ...prev, questions: qs }))
    } catch (e: unknown) {
      setError((e as Error).message || 'Erro ao gerar questões.')
      setView('resumo')
    } finally {
      setGenTarget(null)
    }
  }

  // ─── UPLOAD ───────────────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhase('searching')
    setError('')

    const fd = new FormData()
    fd.append('file', file)

    const discFinal = disciplina.trim()

    try {
      const res  = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const name = file.name.replace(/\.[^.]+$/, '')
      setTema(name)
      setQuery(discFinal ? `${discFinal}: ${name}` : name)

      setPhase('generating')
      setGenTarget('summary')

      const resumoRes = await fetch('/api/ai/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: data.content, topic: name, type: 'summary' }),
      })
      const resumoData = await resumoRes.json()

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      let sessionId: string | null = null
      if (user) {
        const { data: saved } = await supabase
          .from('study_sessions')
          .insert({
            user_id: user.id,
            title: discFinal ? `${discFinal}: ${name}` : name,
            topic: name,
            materia: discFinal || null,
            content: resumoData.result ?? '',
            source_type: 'upload',
          })
          .select('id').single()
        sessionId = saved?.id ?? null
      }

      setSession({
        query:      discFinal ? `${discFinal}: ${name}` : name,
        disciplina: discFinal,
        tema:       name,
        resumo:     resumoData.result ?? '',
        flashcards: [], questions: [],
        sources: [{ title: file.name, url: '', snippet: 'Arquivo enviado pelo usuário' }],
        sessionId,
        savedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      })
      setView('resumo')
      setPhase('done')
    } catch (e: unknown) {
      setError((e as Error).message || 'Erro no upload.')
      setPhase('idle')
    } finally {
      setGenTarget(null)
      e.target.value = ''
    }
  }

  const isLoading  = phase === 'searching' || phase === 'generating'
  const hasContent = phase === 'done' && session.resumo

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg,#0a0c12)' }}>

      {/* ── Barra de busca ── */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border,#1f2640)', background: 'var(--surface,#111420)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

          {/* Campo Disciplina */}
          <input
            value={disciplina}
            onChange={e => setDisciplina(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Disciplina (ex: Dir. Constitucional)"
            disabled={isLoading}
            style={{
              width: '210px', flexShrink: 0,
              background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)',
              borderRadius: '10px', padding: '9px 14px', color: 'var(--text,#e8eaf6)',
              fontSize: '14px', outline: 'none', opacity: isLoading ? .6 : 1,
            }}
          />

          <span style={{ color: 'var(--muted,#6b7194)', fontSize: '16px', flexShrink: 0 }}>›</span>

          {/* Campo Tema */}
          <input
            value={tema}
            onChange={e => setTema(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Tema (ex: Princípio da Legalidade)"
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)',
              borderRadius: '10px', padding: '9px 14px', color: 'var(--text,#e8eaf6)',
              fontSize: '14px', outline: 'none', opacity: isLoading ? .6 : 1,
            }}
          />

          {/* PDF */}
          <label style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)',
            color: 'var(--muted,#6b7194)',
            fontSize: '13px', cursor: isLoading ? 'default' : 'pointer', whiteSpace: 'nowrap',
            pointerEvents: isLoading ? 'none' : 'auto', opacity: isLoading ? .5 : 1,
          }}>
            PDF
            <input type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }} onChange={handleUpload} disabled={isLoading} />
          </label>

          {isLoading ? (
            <button onClick={cancel} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)', background: 'transparent', color: 'var(--red,#ef4444)', fontSize: '13px', cursor: 'pointer' }}>
              Cancelar
            </button>
          ) : (
            <button
              onClick={handleSearch}
              disabled={!tema.trim()}
              style={{
                padding: '9px 20px', borderRadius: '8px', border: 'none',
                background: !tema.trim() ? 'var(--surface2,#181d2e)' : 'var(--accent,#6c63ff)',
                color: !tema.trim() ? 'var(--muted,#6b7194)' : '#fff',
                fontSize: '13px', fontWeight: 600, cursor: !tema.trim() ? 'default' : 'pointer',
              }}
            >
              Buscar
            </button>
          )}
        </div>

        {/* Status da busca */}
        {isLoading && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--accent,#6c63ff)', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
            <span style={{ fontSize: '12px', color: 'var(--muted,#6b7194)' }}>
              {phase === 'searching'
                ? 'Pesquisando na web...'
                : genTarget === 'summary'
                  ? 'Gerando resumo com IA...'
                  : genTarget === 'flashcards'
                    ? 'Criando flashcards...'
                    : 'Gerando questões...'}
            </span>

          </div>
        )}

        {/* Erro */}
        {error && (
          <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '8px', fontSize: '12px', color: '#f87171' }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Estado vazio ── */}
      {!hasContent && !isLoading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px', padding: '40px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted,#6b7194)" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text,#e8eaf6)' }}>Pesquise por Disciplina e Tema</div>
          <div style={{ fontSize: '13px', color: 'var(--muted,#6b7194)', textAlign: 'center', maxWidth: '400px', lineHeight: 1.7 }}>
            Informe a disciplina (ex: Direito Administrativo) e o tema específico. A IA gera resumo, flashcards e questões salvos por disciplina.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
            {[
              { disc: 'Direito Constitucional',  tema: 'Princípio da Legalidade' },
              { disc: 'Direito Administrativo',  tema: 'Licitações Lei 14.133' },
              { disc: 'Direito Penal',           tema: 'Habeas Corpus' },
              { disc: 'Direito Administrativo',  tema: 'Poderes da Administração' },
            ].map(s => (
              <button
                key={s.tema}
                onClick={() => { setDisciplina(s.disc); setTema(s.tema) }}
                style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border,#1f2640)', background: 'transparent', color: 'var(--muted,#6b7194)', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ color: 'var(--accent,#6c63ff)', fontSize: '10px', display: 'block' }}>{s.disc}</span>
                {s.tema}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {isLoading && !session.resumo && (
        <div style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>
          {[80, 60, 90, 50, 70].map((w, i) => (
            <div key={i} style={{ height: '14px', background: 'var(--surface,#111420)', borderRadius: '7px', marginBottom: '12px', width: `${w}%`, opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      )}

      {/* ── Conteúdo principal ── */}
      {(hasContent || (isLoading && session.resumo)) && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Coluna principal */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Toolbar de ações IA */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', background: 'var(--surface,#111420)',
              borderBottom: '1px solid var(--border,#1f2640)', flexShrink: 0, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', marginRight: '4px' }}>Gerar:</span>

              {/* Botão RESUMO */}
              <button
                onClick={() => setView('resumo')}
                style={{
                  padding: '5px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', border: '1px solid',
                  borderColor: view === 'resumo' ? 'var(--accent,#6c63ff)' : 'var(--border,#1f2640)',
                  background: view === 'resumo' ? 'rgba(108,99,255,.15)' : 'transparent',
                  color: view === 'resumo' ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)',
                  transition: 'all .12s',
                }}
              >
                Resumo {view === 'resumo' && session.resumo ? '✓' : ''}
              </button>

              {/* Botão FLASHCARDS */}
              <button
                onClick={handleFlashcards}
                disabled={!session.resumo || !!genTarget}
                style={{
                  padding: '5px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 500,
                  cursor: !session.resumo || !!genTarget ? 'default' : 'pointer',
                  border: '1px solid',
                  borderColor: view === 'flashcards' ? '#00d4aa' : 'var(--border,#1f2640)',
                  background: genTarget === 'flashcards' ? 'rgba(0,212,170,.1)' : view === 'flashcards' ? 'rgba(0,212,170,.1)' : 'transparent',
                  color: genTarget === 'flashcards' || view === 'flashcards' ? '#00d4aa' : 'var(--muted,#6b7194)',
                  opacity: !session.resumo ? .4 : 1,
                  transition: 'all .12s',
                }}
              >
                {genTarget === 'flashcards' ? 'Gerando...' : `Flashcards ${session.flashcards.length > 0 ? `(${session.flashcards.length}) ✓` : ''}`}
              </button>

              {/* Botão QUESTÕES */}
              <button
                onClick={handleQuestions}
                disabled={!session.resumo || !!genTarget}
                style={{
                  padding: '5px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 500,
                  cursor: !session.resumo || !!genTarget ? 'default' : 'pointer',
                  border: '1px solid',
                  borderColor: view === 'questoes' ? '#f59e0b' : 'var(--border,#1f2640)',
                  background: genTarget === 'questions' ? 'rgba(245,158,11,.1)' : view === 'questoes' ? 'rgba(245,158,11,.1)' : 'transparent',
                  color: genTarget === 'questions' || view === 'questoes' ? '#f59e0b' : 'var(--muted,#6b7194)',
                  opacity: !session.resumo ? .4 : 1,
                  transition: 'all .12s',
                }}
              >
                {genTarget === 'questions' ? 'Gerando...' : `Questões ${session.questions.length > 0 ? `(${session.questions.length}) ✓` : ''}`}
              </button>

              {/* Status salvo */}
              {session.savedAt && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--green,#10b981)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Salvo às {session.savedAt}
                </span>
              )}
            </div>

            {/* Área de conteúdo */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>

              {/* ── RESUMO ── */}
              {view === 'resumo' && (
                <EditableResumo 
                  content={session.resumo} 
                  loading={genTarget === 'summary'} 
                  sessionId={session.sessionId} 
                />
              )}

              {/* ── FLASHCARDS ── */}
              {view === 'flashcards' && (
                <FlashcardsView cards={session.flashcards} loading={genTarget === 'flashcards'} />
              )}

              {/* ── QUESTÕES ── */}
              {view === 'questoes' && (
                <QuestoesView questions={session.questions} loading={genTarget === 'questions'} />
              )}
            </div>
          </div>

          {/* Painel lateral — fontes */}
          <div style={{ width: '210px', background: 'var(--surface,#111420)', borderLeft: '1px solid var(--border,#1f2640)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border,#1f2640)', fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Fontes consultadas
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
              {session.sources.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', padding: '10px 0' }}>Carregando...</div>
              ) : session.sources.map((s, i) => (
                <div key={i} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: i < session.sources.length - 1 ? '1px solid var(--border,#1f2640)' : 'none' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text,#e8eaf6)', lineHeight: 1.5, marginBottom: '3px', fontWeight: 500 }}>
                    {s.title}
                  </div>
                  {s.url && (
                    <div style={{ fontSize: '10px', color: 'var(--accent,#6c63ff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(() => { try { return new URL(s.url).hostname } catch { return s.url } })()}
                    </div>
                  )}
                  {s.snippet && (
                    <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', marginTop: '3px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {s.snippet}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {session.query && (
              <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border,#1f2640)' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Tema</div>
                <div style={{ fontSize: '12px', color: 'var(--text,#e8eaf6)', fontWeight: 500, lineHeight: 1.4 }}>{session.query}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de configuração de questões ── */}
      {showQModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowQModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)',
            borderRadius: '16px', padding: '28px 28px 24px', width: '380px', maxWidth: '90vw',
          }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text,#e8eaf6)', marginBottom: '20px' }}>
              Configurar Questões
            </div>

            {/* Quantidade */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Quantidade
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([5, 10, 15, 20] as const).map(n => (
                  <button key={n} onClick={() => setQConfig(c => ({ ...c, quantidade: n }))}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      border: '1px solid', cursor: 'pointer', transition: 'all .12s',
                      borderColor: qConfig.quantidade === n ? 'var(--accent,#6c63ff)' : 'var(--border,#1f2640)',
                      background:  qConfig.quantidade === n ? 'rgba(108,99,255,.18)' : 'transparent',
                      color:       qConfig.quantidade === n ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Estilo
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {([
                  { v: 'cv',    label: 'Certo / Errado',       sub: 'Estilo CEBRASPE / CESPE' },
                  { v: 'mc',    label: 'Múltipla Escolha',     sub: 'A / B / C / D / E (5 alternativas)' },
                  { v: 'misto', label: 'Misto',                sub: 'Combina os dois estilos' },
                ] as const).map(({ v, label, sub }) => (
                  <button key={v} onClick={() => setQConfig(c => ({ ...c, tipo: v }))}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all .12s',
                      border: '1px solid',
                      borderColor: qConfig.tipo === v ? 'var(--accent,#6c63ff)' : 'var(--border,#1f2640)',
                      background:  qConfig.tipo === v ? 'rgba(108,99,255,.12)' : 'transparent',
                    }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: qConfig.tipo === v ? 'var(--accent,#6c63ff)' : 'var(--text,#e8eaf6)' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', marginTop: '2px' }}>
                      {sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowQModal(false)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)',
                background: 'transparent', color: 'var(--muted,#6b7194)', fontSize: '13px', cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button onClick={() => generateQuestions(qConfig)} style={{
                flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
                background: 'var(--accent,#6c63ff)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}>
                Gerar {qConfig.quantidade} questões
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── Sub-componente: RESUMO ────────────────────────────────
function ResumoView({ content, loading }: { content: string; loading: boolean }) {
  if (loading) return <LoadingDots label="Gerando resumo..." />

  // Renderiza markdown básico
  const lines = content.split('\n')
  return (
    <div style={{ maxWidth: '760px' }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return (
          <h2 key={i} style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text,#e8eaf6)', margin: '20px 0 8px', borderLeft: '3px solid var(--accent,#6c63ff)', paddingLeft: '12px' }}>
            {line.replace('## ', '')}
          </h2>
        )
        if (line.startsWith('### ')) return (
          <h3 key={i} style={{ fontSize: '14px', fontWeight: 600, color: '#a09cf7', margin: '16px 0 6px' }}>
            {line.replace('### ', '')}
          </h3>
        )
        if (line.startsWith('**') && line.endsWith('**')) return (
          <p key={i} style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)', fontWeight: 600, margin: '8px 0 4px' }}>
            {line.replace(/\*\*/g, '')}
          </p>
        )
        if (line.startsWith('- ') || line.startsWith('• ')) return (
          <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#c8cae6', lineHeight: 1.7, marginBottom: '4px', paddingLeft: '8px' }}>
            <span style={{ color: 'var(--accent,#6c63ff)', flexShrink: 0 }}>•</span>
            <span>{line.replace(/^[-•] /, '')}</span>
          </div>
        )
        if (line.trim() === '') return <div key={i} style={{ height: '8px' }} />
        // Linha normal — processa negrito inline
        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        return (
          <p key={i} style={{ fontSize: '13px', color: '#c8cae6', lineHeight: 1.85, margin: '0 0 4px' }}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j} style={{ color: 'var(--text,#e8eaf6)', fontWeight: 600 }}>{part.replace(/\*\*/g, '')}</strong>
                : part
            )}
          </p>
        )
      })}
    </div>
  )
}

// ─── Sub-componente: FLASHCARDS ────────────────────────────
function FlashcardsView({ cards, loading }: { cards: Flashcard[]; loading: boolean }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({})
  if (loading) return <LoadingDots label="Criando flashcards..." />
  if (cards.length === 0) return <div style={{ color: 'var(--muted,#6b7194)', fontSize: '13px' }}>Nenhum flashcard gerado ainda.</div>

  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginBottom: '16px' }}>
        {cards.length} flashcard{cards.length !== 1 ? 's' : ''} — clique em cada card para ver a resposta
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {cards.map((card, i) => (
          <div
            key={i}
            onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}
            style={{
              background: 'var(--surface,#111420)', border: `1px solid ${flipped[i] ? 'var(--accent2,#00d4aa)' : 'var(--border,#1f2640)'}`,
              borderRadius: '12px', padding: '18px 16px', cursor: 'pointer',
              minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
              transition: 'border-color .2s', userSelect: 'none',
            }}
          >
            {!flipped[i] ? (
              <>
                <div style={{ fontSize: '10px', color: 'var(--accent,#6c63ff)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Pergunta {i + 1}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)', lineHeight: 1.6, fontWeight: 500 }}>
                  {card.front}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', marginTop: '12px' }}>
                  Toque para ver a resposta
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '10px', color: '#00d4aa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Resposta
                </div>
                <div style={{ fontSize: '13px', color: '#c8cae6', lineHeight: 1.7 }}>
                  {card.back}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sub-componente: QUESTÕES ──────────────────────────────
function QuestoesView({ questions, loading }: { questions: Question[]; loading: boolean }) {
  const [answers,      setAnswers]      = useState<Record<number, string | number>>({})
  const [revealed,     setRevealed]     = useState<Record<number, boolean>>({})
  const [showGabarito, setShowGabarito] = useState(false)

  if (loading) return <LoadingDots label="Gerando questões..." />
  if (questions.length === 0) return (
    <div style={{ color: 'var(--muted,#6b7194)', fontSize: '13px', padding: '20px 0' }}>
      Nenhuma questão gerada ainda.
    </div>
  )

  const totalRespondidas = Object.keys(revealed).length
  const totalCorretas    = Object.entries(revealed).filter(([qi, rev]) => {
    if (!rev) return false
    const q = questions[Number(qi)]
    return q.tipo === 'cv' ? answers[Number(qi)] === q.gabarito : answers[Number(qi)] === q.correct
  }).length
  const pct = totalRespondidas > 0 ? Math.round(totalCorretas / totalRespondidas * 100) : 0
  const pctColor = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ maxWidth: '760px' }}>

      {/* ── Placar ── */}
      {totalRespondidas > 0 && (
        <div style={{
          background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)',
          borderRadius: '12px', padding: '14px 18px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: pctColor, minWidth: '56px' }}>
            {pct}%
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)', fontWeight: 500 }}>
              {totalCorretas} de {totalRespondidas} corretas
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', marginTop: '2px' }}>
              {questions.length - totalRespondidas > 0
                ? `${questions.length - totalRespondidas} questão(ões) ainda não respondida(s)`
                : 'Todas respondidas!'}
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de questões ── */}
      {questions.map((q, qi) => {
        const answered  = answers[qi] !== undefined
        const rev       = revealed[qi]
        const isCorrect = q.tipo === 'cv'
          ? answers[qi] === q.gabarito
          : answers[qi] === q.correct

        return (
          <div key={qi} style={{
            background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)',
            borderRadius: '12px', padding: '18px', marginBottom: '14px',
          }}>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', color: 'var(--accent,#6c63ff)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                  Q{qi + 1}
                </span>
                <span style={{
                  fontSize: '10px', padding: '2px 7px', borderRadius: '4px', fontWeight: 600,
                  background: q.tipo === 'cv' ? 'rgba(245,158,11,.12)' : 'rgba(108,99,255,.12)',
                  color: q.tipo === 'cv' ? '#f59e0b' : 'var(--accent,#6c63ff)',
                }}>
                  {q.tipo === 'cv' ? 'CERTO / ERRADO' : 'MÚLTIPLA ESCOLHA'}
                </span>
              </div>
              {q.banca && (
                <span style={{ fontSize: '10px', color: 'var(--muted,#6b7194)' }}>{q.banca}</span>
              )}
            </div>

            {/* Enunciado */}
            <div style={{ fontSize: '14px', color: 'var(--text,#e8eaf6)', lineHeight: 1.75, marginBottom: '16px', fontWeight: 500 }}>
              {q.question}
            </div>

            {/* Opções Certo/Errado */}
            {q.tipo === 'cv' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['C', 'E'] as const).map(opt => {
                  const selected = answers[qi] === opt
                  const isRight  = opt === q.gabarito
                  let bg = 'var(--surface2,#181d2e)', brd = 'var(--border,#1f2640)', clr = 'var(--muted,#6b7194)'
                  if (rev) {
                    if (isRight)               { bg = 'rgba(16,185,129,.12)'; brd = '#10b981'; clr = '#34d399' }
                    else if (selected)         { bg = 'rgba(239,68,68,.1)';   brd = '#ef4444'; clr = '#f87171' }
                  } else if (selected) {
                    bg = 'rgba(108,99,255,.12)'; brd = 'var(--accent,#6c63ff)'; clr = 'var(--accent,#6c63ff)'
                  }
                  return (
                    <button key={opt}
                      onClick={() => !rev && setAnswers(a => ({ ...a, [qi]: opt }))}
                      style={{
                        flex: 1, padding: '11px', borderRadius: '8px',
                        border: `1px solid ${brd}`, background: bg, color: clr,
                        fontSize: '13px', fontWeight: 700,
                        cursor: rev ? 'default' : 'pointer', transition: 'all .15s',
                      }}>
                      {opt === 'C' ? '✓ Certo' : '✗ Errado'}
                    </button>
                  )
                })}
              </div>
            ) : (
              /* Opções múltipla escolha */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {(q.options ?? []).map((opt, oi) => {
                  const selected = answers[qi] === oi
                  const isRight  = oi === q.correct
                  let bg = 'var(--surface2,#181d2e)', brd = 'var(--border,#1f2640)', clr = 'var(--text,#e8eaf6)'
                  if (rev) {
                    if (isRight)       { bg = 'rgba(16,185,129,.12)'; brd = '#10b981'; clr = '#34d399' }
                    else if (selected) { bg = 'rgba(239,68,68,.1)';   brd = '#ef4444'; clr = '#f87171' }
                  } else if (selected) {
                    bg = 'rgba(108,99,255,.12)'; brd = 'var(--accent,#6c63ff)'
                  }
                  return (
                    <div key={oi}
                      onClick={() => !rev && setAnswers(a => ({ ...a, [qi]: oi }))}
                      style={{
                        display: 'flex', gap: '10px', padding: '10px 12px', borderRadius: '8px',
                        border: `1px solid ${brd}`, background: bg,
                        cursor: rev ? 'default' : 'pointer', transition: 'all .15s', alignItems: 'flex-start',
                      }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: `1.5px solid ${brd}`, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700, color: clr,
                      }}>
                        {['A','B','C','D','E'][oi]}
                      </div>
                      <div style={{ fontSize: '13px', color: clr, lineHeight: 1.6, paddingTop: '2px' }}>{opt}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Confirmar / feedback */}
            {!rev ? (
              <button
                onClick={() => answered && setRevealed(r => ({ ...r, [qi]: true }))}
                disabled={!answered}
                style={{
                  marginTop: '14px', width: '100%', padding: '10px', borderRadius: '8px',
                  border: 'none',
                  background: answered ? 'var(--accent,#6c63ff)' : 'var(--surface2,#181d2e)',
                  color: answered ? '#fff' : 'var(--muted,#6b7194)',
                  fontSize: '13px', fontWeight: 600,
                  cursor: answered ? 'pointer' : 'default', transition: 'all .15s',
                }}>
                Confirmar resposta
              </button>
            ) : (
              <div style={{
                marginTop: '12px', padding: '12px 14px', borderRadius: '8px',
                background: isCorrect ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)',
                border: `1px solid ${isCorrect ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.25)'}`,
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: isCorrect ? '#34d399' : '#f87171', marginBottom: '6px' }}>
                  {isCorrect ? '✓ Resposta correta!' : '✗ Resposta incorreta'}
                </div>
                <div style={{ fontSize: '12px', color: '#c8cae6', lineHeight: 1.65 }}>
                  {q.explanation}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* ── Seção de Gabarito ── */}
      <div style={{ marginTop: '8px', paddingTop: '20px', borderTop: '1px solid var(--border,#1f2640)' }}>
        <button
          onClick={() => setShowGabarito(g => !g)}
          style={{
            width: '100%', padding: '11px', borderRadius: '10px', cursor: 'pointer',
            border: '1px solid var(--border,#1f2640)',
            background: showGabarito ? 'rgba(108,99,255,.12)' : 'transparent',
            color: showGabarito ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)',
            fontSize: '13px', fontWeight: 600, transition: 'all .15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 1.5v11M2 7h10" strokeLinecap="round"/>
          </svg>
          {showGabarito ? 'Ocultar Gabarito' : 'Ver Gabarito'}
        </button>

        {showGabarito && (
          <div style={{ marginTop: '16px', background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border,#1f2640)', fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Gabarito — {questions.length} questão(ões)
            </div>
            {questions.map((q, qi) => {
              const letraCorreta = q.tipo === 'cv'
                ? (q.gabarito === 'C' ? 'CERTO' : 'ERRADO')
                : `${['A','B','C','D','E'][q.correct ?? 0]}`
              const textoOpcao = q.tipo === 'mc' ? ` — ${q.options?.[q.correct ?? 0] ?? ''}` : ''

              return (
                <div key={qi} style={{
                  padding: '12px 16px', borderBottom: qi < questions.length - 1 ? '1px solid var(--border,#1f2640)' : 'none',
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                }}>
                  {/* Número */}
                  <div style={{ minWidth: '28px', fontSize: '11px', color: 'var(--accent,#6c63ff)', fontWeight: 700, paddingTop: '2px' }}>
                    Q{qi + 1}
                  </div>
                  {/* Badge tipo */}
                  <div style={{
                    fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap', marginTop: '1px',
                    background: q.tipo === 'cv' ? 'rgba(245,158,11,.12)' : 'rgba(108,99,255,.12)',
                    color: q.tipo === 'cv' ? '#f59e0b' : 'var(--accent,#6c63ff)',
                  }}>
                    {q.tipo === 'cv' ? 'C/E' : 'MC'}
                  </div>
                  {/* Resposta */}
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 700,
                      color: q.tipo === 'cv'
                        ? (q.gabarito === 'C' ? '#34d399' : '#f87171')
                        : '#34d399',
                    }}>
                      {letraCorreta}
                    </span>
                    {textoOpcao && (
                      <span style={{ fontSize: '12px', color: '#c8cae6' }}>{textoOpcao}</span>
                    )}
                    {q.banca && (
                      <span style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', marginLeft: '8px' }}>({q.banca})</span>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', marginTop: '4px', lineHeight: 1.5 }}>
                      {q.explanation}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Loading dots ─────────────────────────────────────────
function LoadingDots({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted,#6b7194)', fontSize: '13px', padding: '20px 0' }}>
      <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--accent,#6c63ff)', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      {label}
    </div>
  )
}