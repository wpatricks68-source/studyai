'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EditableResumo } from '@/components/study/EditableResumo'
import { getSearchLimits, isProviderAllowed, normalizePlanTier, type PlanTier, type SearchMode } from '@/lib/search-plans'

type GenType   = 'summary' | 'flashcards' | 'questions'
type ViewMode  = 'resumo' | 'flashcards' | 'questoes'
type AIProvider = 'auto' | 'gpt' | 'gemini' | 'claude'
type PaidAIProvider = Exclude<AIProvider, 'auto'>

// ─── Modelos por provider ────────────────────────────────────
const PROVIDER_MODELS: Record<Exclude<AIProvider,'auto'>, { id: string; label: string; tier: 'paid'|'free' }[]> = {
  claude: [
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', tier: 'paid' },
    { id: 'claude-3-5-haiku-20241022',  label: 'Claude 3.5 Haiku',  tier: 'paid' },
    { id: 'claude-3-opus-20240229',    label: 'Claude 3 Opus',     tier: 'paid' },
    { id: 'claude-3-haiku-20240307',   label: 'Claude 3 Haiku (Free)',tier: 'free' },
  ],
  gpt: [
    { id: 'gpt-4o',        label: 'GPT-4o',             tier: 'paid' },
    { id: 'gpt-4o-mini',   label: 'GPT-4o Mini (Free)', tier: 'free' },
    { id: 'gpt-4-turbo',   label: 'GPT-4 Turbo',        tier: 'paid' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Free)',tier: 'free' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash (Free)',  tier: 'free' },
    { id: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro',           tier: 'paid' },
    { id: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash (Free)',  tier: 'free' },
    { id: 'gemini-1.5-flash-8b',   label: 'Gemini 1.5 Flash 8B',      tier: 'free' },
  ],
}

const PROVIDER_META: Record<AIProvider, { label: string; color: string; bg: string; icon: string }> = {
  auto:   { label: 'Alto Busca', color: '#10b981', bg: 'rgba(16,185,129,.15)', icon: '✦' },
  gpt:    { label: 'GPT',          color: '#10a37f', bg: 'rgba(16,163,127,.15)', icon: '⬡' },
  gemini: { label: 'Gemini',       color: '#4285f4', bg: 'rgba(66,133,244,.15)', icon: '◈' },
  claude: { label: 'Claude',       color: '#cc785c', bg: 'rgba(204,120,92,.15)', icon: '◆' },
}

const ADVANCED_PROVIDERS: PaidAIProvider[] = ['gpt', 'gemini', 'claude']

function getPlanLabel(plan: PlanTier) {
  if (plan === 'premium') return 'Premium'
  if (plan === 'basico') return 'Basico'
  return 'Gratuito'
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getProviderModels(provider: PaidAIProvider, planTier: PlanTier) {
  const models = PROVIDER_MODELS[provider] ?? []
  return planTier === 'premium' ? models : models.filter(model => model.tier === 'free')
}

function getDefaultAdvancedProvider(planTier: PlanTier): PaidAIProvider {
  const allowed = ADVANCED_PROVIDERS.filter(provider => isProviderAllowed(planTier, 'advanced', provider))
  return allowed[0] ?? 'gemini'
}

interface Source { title: string; url: string; snippet: string }

interface Flashcard { id?: string; front: string; back: string }

interface Question {
  id?: string;
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

interface FlashcardsConfig {
  quantidade: 5 | 10 | 15 | 20
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

function buildBasicSummary(topic: string, content: string) {
  const clean = content
    .replace(/\s+/g, ' ')
    .trim()

  const excerpt = clean.slice(0, 1800)

  return `## ${topic}

### Visão geral
Resumo temporário gerado sem IA por indisponibilidade do provedor.

### Conteúdo base
${excerpt}

### Pontos principais
- Tema identificado: ${topic}
- Conteúdo coletado com sucesso
- A geração avançada com IA está temporariamente indisponível

### Observação
Tente novamente mais tarde para obter um resumo completo com IA.`
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
  const [showFcModal, setShowFcModal] = useState(false)
  const [qConfig,    setQConfig]    = useState<QuestoesConfig>({ quantidade: 10, tipo: 'misto' })
  const [fcConfig,   setFcConfig]   = useState<FlashcardsConfig>({ quantidade: 10 })
  const abortRef = useRef<AbortController | null>(null)

  // ─── Provider & Model ──────────────────────────────────────
  const [planTier, setPlanTier] = useState<PlanTier>('gratuito')
  const [searchMode, setSearchMode] = useState<SearchMode>('alto')
  const [usageCounts, setUsageCounts] = useState({ alto_busca_count: 0, advanced_busca_count: 0 })
  const [aiProvider, setAiProvider] = useState<AIProvider>('auto')
  const [aiModel,    setAiModel]    = useState<string>('')
  const [usedProvider, setUsedProvider] = useState<string>('')
  const [usedModel,    setUsedModel]    = useState<string>('')
  const [aiNotice, setAiNotice] = useState('')

  const loadPlanState = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setPlanTier('gratuito')
      setUsageCounts({ alto_busca_count: 0, advanced_busca_count: 0 })
      setSearchMode('alto')
      setAiProvider('auto')
      setAiModel('')
      return
    }

    const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    const nextPlanTier = normalizePlanTier(profileRes.data?.plan_tier)
    setPlanTier(nextPlanTier)

    try {
      const usageRes = await supabase
        .from('usage_daily')
        .select('*')
        .eq('user_id', user.id)
        .eq('usage_date', getTodayKey())
        .maybeSingle()

      setUsageCounts({
        alto_busca_count: usageRes.data?.alto_busca_count ?? 0,
        advanced_busca_count: usageRes.data?.advanced_busca_count ?? 0,
      })
    } catch {
      setUsageCounts({ alto_busca_count: 0, advanced_busca_count: 0 })
    }

    if (nextPlanTier === 'gratuito') {
      setSearchMode('alto')
      setAiProvider('auto')
      setAiModel('')
    }
  }, [])

  // Quando muda provider, resetar modelo para o primeiro disponível
  function handleProviderChange(p: AIProvider) {
    if (searchMode === 'alto') {
      setAiProvider('auto')
      setAiModel('')
      return
    }

    if (p === 'auto') return
    setAiProvider(p)

    const models = getProviderModels(p, planTier)
    const currentModelExists = models.some(m => m.id === aiModel)
    if (!currentModelExists) {
      setAiModel(models[0]?.id ?? '')
    }
  }

  function handleSearchModeChange(mode: SearchMode) {
    if (mode === 'advanced' && planTier === 'gratuito') {
      setError('Busca Avancada com IA esta disponivel apenas para usuarios dos planos pagos.')
      return
    }

    setError('')
    setAiNotice('')
    setSearchMode(mode)
  }

  // ─── Estados Manuais ────────────────────────────────────────
  const [showManualFcModal, setShowManualFcModal] = useState(false)
  const [manualFcFront, setManualFcFront] = useState('')
  const [manualFcBack,  setManualFcBack]  = useState('')
  const [editingFcId,   setEditingFcId]   = useState<string | null>(null)

  const [showManualQModal, setShowManualQModal] = useState(false)
  const [manualQTipo, setManualQTipo] = useState<'cv'|'mc'>('cv')
  const [manualQQuestion, setManualQQuestion] = useState('')
  const [manualQOptions, setManualQOptions] = useState(['', '', '', '', ''])
  const [manualQCorrect, setManualQCorrect] = useState<number>(0)
  const [manualQGabarito, setManualQGabarito] = useState<'C'|'E'>('C')
  const [manualQExpl, setManualQExpl] = useState('')
  const [isSavingManual, setIsSavingManual] = useState(false)

  // ─── Estados de Gestão de Flashcards ────────────────────────
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedFcIds, setSelectedFcIds]    = useState<Set<string>>(new Set())

  // ─── Estados de Gestão de Questões ──────────────────────────
  const [isQSelectionMode, setIsQSelectionMode] = useState(false)
  const [selectedQIds, setSelectedQIds]        = useState<Set<string>>(new Set())
  const [editingQId,   setEditingQId]           = useState<string | null>(null)

  // ─── Estado do Sidebar Secundário ───
  const [showSources, setShowSources] = useState(true)

  // Detect mobile and hide sources by default
  useEffect(() => {
    if (window.innerWidth < 1024) setShowSources(false)
  }, [])

  useEffect(() => {
    loadPlanState()
  }, [loadPlanState])

  useEffect(() => {
    if (searchMode === 'alto') {
      if (aiProvider !== 'auto') setAiProvider('auto')
      if (aiModel) setAiModel('')
      return
    }

    const safeProvider = aiProvider === 'auto' ? getDefaultAdvancedProvider(planTier) : aiProvider
    if (safeProvider !== aiProvider) {
      setAiProvider(safeProvider)
      return
    }

    const models = getProviderModels(safeProvider, planTier)
    if (!models.some(model => model.id === aiModel)) {
      setAiModel(models[0]?.id ?? '')
    }
  }, [searchMode, aiProvider, aiModel, planTier])

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

  // ─── LIMPAR SESSÃO (Novo Projeto) ─────────────────────────
  const handleClear = useCallback(() => {
    setDisciplina('')
    setTema('')
    setQuery('')
    setSession(EMPTY)
    setView('resumo')
    setPhase('idle')
    setGenTarget(null)
    setError('')
    setAiNotice('')
    try { sessionStorage.removeItem('busca_session') } catch {}
    
    // Remove id from URL if present
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.has('id')) {
        url.searchParams.delete('id')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [])

  // ─── BUSCA PRINCIPAL ──────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const temaFinal = tema.trim()
    const discFinal = disciplina.trim()
    const requestProvider = searchMode === 'alto' ? 'auto' : aiProvider
    const requestModel = searchMode === 'advanced' && requestProvider !== 'auto' ? aiModel : undefined

    if (!temaFinal) {
      setError('Insira um tema para pesquisar.')
      return
    }

    if (phase === 'searching' || phase === 'generating') return

    const fullQuery = discFinal ? `${discFinal}: ${temaFinal}` : temaFinal

    setQuery(fullQuery)
    setError('')
    setAiNotice('')
    setPhase('searching')
    setGenTarget(null)
    setView('resumo')

    const ac = new AbortController()
    abortRef.current = ac

    try {
      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: fullQuery, searchMode }),
        signal: ac.signal,
      })

      if (!searchRes.ok) {
        const d = await searchRes.json().catch(() => ({}))
        throw new Error(d.error || 'Erro ao pesquisar na web.')
      }

      const searchData = await searchRes.json()
      const sources: Source[] = Array.isArray(searchData.results) ? searchData.results : []

      const iaContext = sources.length > 0
        ? sources
            .map((s, i) => `Fonte ${i + 1}: ${s.title}\n${s.snippet}\n${s.url}`)
            .join('\n\n')
        : fullQuery

      setSession(prev => ({
        ...prev,
        query: fullQuery,
        disciplina: discFinal,
        tema: temaFinal,
        sources,
      }))

      setPhase('generating')
      setGenTarget('summary')

      const resumoRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: iaContext,
          topic: fullQuery,
          type: 'summary',
          searchMode,
          provider: requestProvider,
          model: requestModel,
        }),
        signal: ac.signal,
      })

      let resumo = ''
      let resumoData: any = null

      if (resumoRes.ok) {
        resumoData = await resumoRes.json()
        resumo = resumoData.result ?? ''

        if (resumoData.provider) setUsedProvider(resumoData.provider)
        if (resumoData.model) setUsedModel(resumoData.model)

        if (resumoData.fallbackUsed && resumoData.fallbackMessage) {
          setAiNotice(resumoData.fallbackMessage)
        } else {
          setAiNotice('')
        }
      } else {
        resumo = buildBasicSummary(fullQuery, iaContext)
        setUsedProvider('gemini')
        setUsedModel('fallback-local')
        setAiNotice('IA indisponível no momento. Exibindo resumo básico temporário.')
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      let sessionId: string | null = null

      if (user && resumo) {
        const { data: saved } = await supabase
          .from('study_sessions')
          .insert({
            user_id: user.id,
            title: fullQuery,
            topic: temaFinal,
            materia: discFinal || null,
            content: resumo,
            source_type: 'web',
          })
          .select('id')
          .single()

        sessionId = saved?.id ?? null
      }

      setSession(prev => ({
        ...prev,
        query: fullQuery,
        disciplina: discFinal,
        tema: temaFinal,
        resumo,
        sessionId,
        savedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }))

      setPhase('done')
      setGenTarget(null)
      await loadPlanState()
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return
      setError((e as Error).message || 'Erro inesperado. Tente novamente.')
      setPhase('idle')
    } finally {
      setGenTarget(null)
    }
  }, [tema, disciplina, phase, aiProvider, aiModel, searchMode, loadPlanState])

  // ─── CRIAR MANUALMENTE ────────────────────────────────────
  const handleManualCreate = useCallback(async () => {
    const temaFinal = tema.trim()
    const discFinal = disciplina.trim()
    if (!temaFinal) {
      setError('Insira pelo menos o tema para criar uma sessão.')
      return
    }

    setPhase('searching')
    setError('')
    setAiNotice('')
    const fullQuery = discFinal ? `${discFinal}: ${temaFinal}` : temaFinal
    setQuery(fullQuery)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      let sessionId: string | null = null

      if (user) {
        const { data: saved, error: insertError } = await supabase
          .from('study_sessions')
          .insert({
            user_id:     user.id,
            title:       fullQuery,
            topic:       temaFinal,
            materia:     discFinal || null,
            content:     '<p><br></p>',
            source_type: 'upload', // Changed from 'manual' to bypass Supabase constraint
          })
          .select('id')
          .single()
        
        if (insertError) throw insertError
        sessionId = saved?.id ?? null
      }

      setSession({
        query: fullQuery,
        disciplina: discFinal,
        tema: temaFinal,
        resumo: '<p><br></p>',
        flashcards: [],
        questions: [],
        sources: [{ title: 'Sessão Manual', url: '', snippet: 'Conteúdo inserido manualmente.' }],
        sessionId,
        savedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      })
      setView('resumo')
      setPhase('done')
    } catch (e: unknown) {
      setError((e as Error).message || 'Erro ao inicializar sessão manual.')
      setPhase('idle')
    }
  }, [tema, disciplina])

  // ─── GERAR FLASHCARDS ─────────────────────────────────────
  async function handleFlashcards() {
    if (!session.resumo || genTarget) return
    if (session.flashcards.length > 0) { setView('flashcards'); return }
    setShowFcModal(true)
  }

  async function generateFlashcards(cfg: FlashcardsConfig) {
    setShowFcModal(false)
    setView('flashcards')
    setGenTarget('flashcards')
    setError('')
    setAiNotice('')
    const requestProvider = searchMode === 'alto' ? 'auto' : aiProvider
    const requestModel = searchMode === 'advanced' && requestProvider !== 'auto' ? aiModel : undefined

    try {
      const res = await fetch('/api/ai/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          content:    session.resumo,
          topic:      session.query,
          type:       'flashcards',
          sessionId:  session.sessionId,
          quantidade: cfg.quantidade,
          searchMode,
          provider:   requestProvider,
          model:      requestModel,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Erro ao gerar flashcards.')
      }
      const data = await res.json()

      if (data.provider) setUsedProvider(data.provider)
      if (data.model) setUsedModel(data.model)
      if (data.fallbackUsed && data.fallbackMessage) {
        setAiNotice(data.fallbackMessage)
      } else {
        setAiNotice('')
      }

      let cards: Flashcard[] = []
      try {
        const cleaned = (data.result ?? '').replace(/```json|```/g, '').trim()
        cards = JSON.parse(cleaned)
        if (!Array.isArray(cards)) throw new Error()
      } catch {
        throw new Error('Resposta da IA inválida. Tente novamente.')
      }

      setSession(prev => ({ ...prev, flashcards: data.savedCards || cards }))
    } catch (e: unknown) {
      setError((e as Error).message || 'Erro ao gerar flashcards.')
      setView('resumo')
    } finally {
      setGenTarget(null)
    }
  }

  // ─── GESTÃO DE FLASHCARDS ─────────────────────────────────
  const handleDeleteFc = useCallback(async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('flashcards').delete().eq('id', id)
      if (error) throw error
      setSession(prev => ({
        ...prev,
        flashcards: prev.flashcards.filter(fc => fc.id !== id)
      }))
    } catch (e: unknown) {
      alert((e as Error).message || 'Erro ao excluir flashcard.')
    }
  }, [])

  const handleOpenEditFc = useCallback((fc: Flashcard) => {
    setEditingFcId(fc.id || null)
    setManualFcFront(fc.front)
    setManualFcBack(fc.back)
    setShowManualFcModal(true)
  }, [])

  const handleBulkDeleteFcs = useCallback(async () => {
    if (selectedFcIds.size === 0) return
    if (!confirm(`Excluir ${selectedFcIds.size} flashcards selecionados?`)) return
    
    try {
      const supabase = createClient()
      const ids = Array.from(selectedFcIds)
      const { error } = await supabase.from('flashcards').delete().in('id', ids)
      if (error) throw error
      
      setSession(prev => ({
        ...prev,
        flashcards: prev.flashcards.filter(fc => !fc.id || !selectedFcIds.has(fc.id))
      }))
      setSelectedFcIds(new Set())
      setIsSelectionMode(false)
    } catch (e: unknown) {
      alert((e as Error).message || 'Erro ao excluir múltiplos flashcards.')
    }
  }, [selectedFcIds])

  const toggleFcSelection = useCallback((id: string) => {
    setSelectedFcIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAllFcs = useCallback(() => {
    if (selectedFcIds.size === session.flashcards.length) {
      setSelectedFcIds(new Set())
    } else {
      setSelectedFcIds(new Set(session.flashcards.map(fc => fc.id).filter(Boolean) as string[]))
    }
  }, [selectedFcIds, session.flashcards])

  // ─── GESTÃO DE QUESTÕES ──────────────────────────────────
  const handleDeleteQ = useCallback(async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('questions').delete().eq('id', id)
      if (error) throw error
      setSession(prev => ({
        ...prev,
        questions: prev.questions.filter(q => q.id !== id)
      }))
    } catch (e: unknown) {
      alert((e as Error).message || 'Erro ao excluir questão.')
    }
  }, [])

  const handleOpenEditQ = useCallback((q: Question) => {
    setEditingQId(q.id || null)
    setManualQTipo(q.tipo)
    setManualQQuestion(q.question)
    setManualQOptions(q.options || ['', '', '', '', ''])
    setManualQCorrect(q.correct || 0)
    setManualQGabarito((q.gabarito as 'C'|'E') || 'C')
    setManualQExpl(q.explanation || '')
    setShowManualQModal(true)
  }, [])

  const handleBulkDeleteQs = useCallback(async () => {
    if (selectedQIds.size === 0) return
    if (!confirm(`Excluir ${selectedQIds.size} questões selecionadas?`)) return
    
    try {
      const supabase = createClient()
      const ids = Array.from(selectedQIds)
      const { error } = await supabase.from('questions').delete().in('id', ids)
      if (error) throw error
      
      setSession(prev => ({
        ...prev,
        questions: prev.questions.filter(q => !q.id || !selectedQIds.has(q.id))
      }))
      setSelectedQIds(new Set())
      setIsQSelectionMode(false)
    } catch (e: unknown) {
      alert((e as Error).message || 'Erro ao excluir múltiplas questões.')
    }
  }, [selectedQIds])

  const toggleQSelection = useCallback((id: string) => {
    setSelectedQIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAllQs = useCallback(() => {
    if (selectedQIds.size === session.questions.length) {
      setSelectedQIds(new Set())
    } else {
      setSelectedQIds(new Set(session.questions.map(q => q.id).filter(Boolean) as string[]))
    }
  }, [selectedQIds, session.questions])

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
    setAiNotice('')
    const requestProvider = searchMode === 'alto' ? 'auto' : aiProvider
    const requestModel = searchMode === 'advanced' && requestProvider !== 'auto' ? aiModel : undefined

    try {
      const res = await fetch('/api/ai/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          content:      session.resumo,
          topic:        session.query,
          type:         'questions',
          sessionId:    session.sessionId,
          quantidade:   cfg.quantidade,
          tipoQuestoes: cfg.tipo,
          searchMode,
          provider:     requestProvider,
          model:        requestModel,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Erro ao gerar questões.')
      }
      const data = await res.json()

      if (data.provider) setUsedProvider(data.provider)
      if (data.model) setUsedModel(data.model)
      if (data.fallbackUsed && data.fallbackMessage) {
        setAiNotice(data.fallbackMessage)
      } else {
        setAiNotice('')
      }

      let qs: Question[] = []
      try {
        const cleaned = (data.result ?? '').replace(/```json[\s\S]*?```|```/g, '').trim()
        qs = JSON.parse(cleaned)
        if (!Array.isArray(qs)) throw new Error()
      } catch {
        throw new Error('Resposta da IA inválida. Tente novamente.')
      }

      setSession(prev => ({ ...prev, questions: data.savedQuestions || qs }))
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
    setAiNotice('')

    const fd = new FormData()
    fd.append('file', file)

    const discFinal = disciplina.trim()
    const requestProvider = searchMode === 'alto' ? 'auto' : aiProvider
    const requestModel = searchMode === 'advanced' && requestProvider !== 'auto' ? aiModel : undefined

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
        body:    JSON.stringify({
          content:  data.content,
          topic:    name,
          type:     'summary',
          searchMode,
          provider: requestProvider,
          model:    requestModel,
        }),
      })
      const resumoData = await resumoRes.json()

      if (resumoData.provider) setUsedProvider(resumoData.provider)
      if (resumoData.model) setUsedModel(resumoData.model)
      if (resumoData.fallbackUsed && resumoData.fallbackMessage) {
        setAiNotice(resumoData.fallbackMessage)
      } else {
        setAiNotice('')
      }

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
      await loadPlanState()
    } catch (e: unknown) {
      setError((e as Error).message || 'Erro no upload.')
      setPhase('idle')
    } finally {
      setGenTarget(null)
      e.target.value = ''
    }
  }

  // ─── EXPORTAR PDF ──────────────────────────────────────────
  function handleExportPDF() {
    const { disciplina, tema, resumo, flashcards, questions } = session
    const titulo = disciplina ? `${disciplina} — ${tema || 'Resumo'}` : (tema || 'StudyAI — Resumo')

    // Converte markdown do resumo em HTML simples
    function mdToHtml(md: string): string {
      return md.split('\n').map(line => {
        if (line.startsWith('## '))  return `<h2>${line.slice(3)}</h2>`
        if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`
        if (line.startsWith('- ') || line.startsWith('\u2022 '))
          return `<li>${line.replace(/^[-\u2022] /, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`
        if (line.trim() === '') return '<br/>'
        return `<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`
      }).join('')
    }

    const flashcardsHTML = flashcards.length === 0 ? '<p style="color:#666">Nenhum flashcard gerado.</p>' :
      flashcards.map((fc, i) => `
        <div class="card">
          <div class="card-num">CARD ${i + 1}</div>
          <div class="card-front"><strong>Frente:</strong><br/>${fc.front}</div>
          <div class="card-back"><strong>Verso:</strong><br/>${fc.back}</div>
        </div>`).join('')

    const questoesHTML = questions.length === 0 ? '<p style="color:#666">Nenhuma questão gerada.</p>' :
      questions.map((q, qi) => {
        const gabarito = q.tipo === 'cv'
          ? (q.gabarito === 'C' ? '✓ CERTO' : '✗ ERRADO')
          : `${['A','B','C','D','E'][q.correct ?? 0]} — ${q.options?.[q.correct ?? 0] ?? ''}`
        const opts = q.tipo === 'mc' && q.options
          ? `<ol class="opts">${q.options.map((o, oi) => `<li class="${oi === q.correct ? 'correta' : ''}">${o}</li>`).join('')}</ol>`
          : ''
        return `
          <div class="quest">
            <div class="q-header">
              <span class="q-num">Q${qi + 1}</span>
              <span class="q-tipo">${q.tipo === 'cv' ? 'CERTO / ERRADO' : 'MÚLTIPLA ESCOLHA'}</span>
              ${q.banca ? `<span class="q-banca">${q.banca}</span>` : ''}
            </div>
            <p class="q-enunciado">${q.question}</p>
            ${opts}
            <div class="q-gabarito">► Gabarito: <strong>${gabarito}</strong></div>
            <div class="q-exp">${q.explanation ?? ''}</div>
          </div>`
      }).join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${titulo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', serif; color: #111; background: #fff; padding: 40px 50px; max-width: 900px; margin: 0 auto; font-size: 13px; line-height: 1.75; }
    h1 { font-size: 22px; margin-bottom: 4px; color: #1a1a2e; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 32px; border-bottom: 2px solid #6c63ff; padding-bottom: 10px; }
    .section-title { font-size: 16px; font-weight: 700; color: #6c63ff; margin: 32px 0 16px; padding-left: 10px; border-left: 4px solid #6c63ff; text-transform: uppercase; letter-spacing: 1px; }
    h2 { font-size: 15px; margin: 20px 0 6px; color: #1a1a2e; border-left: 3px solid #6c63ff; padding-left: 10px; }
    h3 { font-size: 13px; font-weight: 700; margin: 14px 0 4px; color: #333; }
    p  { margin: 4px 0; }
    li { margin: 3px 0 3px 20px; }
    strong { color: #1a1a2e; }
    /* Flashcards */
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; page-break-inside: avoid; }
    .card-num { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6c63ff; font-weight: 700; margin-bottom: 8px; }
    .card-front { background: #f7f7ff; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; font-weight: 600; }
    .card-back  { background: #f0fdf8; border-radius: 6px; padding: 8px 12px; color: #065f46; }
    /* Questões */
    .quest { border: 1px solid #ddd; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; page-break-inside: avoid; }
    .q-header { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
    .q-num  { font-size: 11px; font-weight: 700; color: #6c63ff; }
    .q-tipo { font-size: 10px; background: #f0eeff; color: #6c63ff; padding: 2px 7px; border-radius: 4px; font-weight: 700; }
    .q-banca{ font-size: 10px; color: #999; margin-left: auto; }
    .q-enunciado { font-size: 13px; font-weight: 600; margin-bottom: 10px; line-height: 1.6; }
    .opts { margin: 8px 0 8px 20px; }
    .opts li { margin: 4px 0; font-size: 12px; }
    .opts li.correta { font-weight: 700; color: #065f46; }
    .q-gabarito { margin-top: 10px; font-size: 12px; color: #065f46; border-top: 1px dashed #ccc; padding-top: 8px; }
    .q-exp { font-size: 11px; color: #555; margin-top: 6px; line-height: 1.6; }
    @media print {
      body { padding: 20px 30px; }
      .section-title { margin-top: 24px; }
    }
  </style>
</head>
<body>
  <h1>${titulo}</h1>
  <div class="subtitle">Gerado por StudyAI &mdash; ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>

  <div class="section-title">📝 Resumo</div>
  ${mdToHtml(typeof resumo === 'string' ? resumo : '')}

  <div class="section-title">🃟 Flashcards (${flashcards.length})</div>
  ${flashcardsHTML}

  <div class="section-title">❓ Questões (${questions.length})</div>
  ${questoesHTML}

  <script>window.onload = () => window.print()<\/script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  const isLoading  = phase === 'searching' || phase === 'generating'
  const hasContent = phase === 'done' && session.resumo

  // ─── SALVAR FLASHCARD MANUAL ──────────────────────────────
  async function handleSaveManualFc() {
    if (!manualFcFront.trim() || !manualFcBack.trim() || !session.sessionId) return
    setIsSavingManual(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado.')

      if (editingFcId) {
        // Modo Edição
        const { data, error: updateError } = await supabase.from('flashcards').update({
          front: manualFcFront,
          back: manualFcBack
        }).eq('id', editingFcId).select('*').single()

        if (updateError) throw updateError
        if (data) {
          setSession(prev => ({
            ...prev,
            flashcards: prev.flashcards.map(fc => fc.id === editingFcId ? data : fc)
          }))
        }
      } else {
        // Novo Flashcard
        const { data, error: insertError } = await supabase.from('flashcards').insert({
          user_id: user.id,
          session_id: session.sessionId,
          topic: session.tema,
          materia: session.disciplina || null,
          front: manualFcFront,
          back: manualFcBack
        }).select('*').single()
        
        if (insertError) throw insertError
        if (data) setSession(prev => ({ ...prev, flashcards: [...prev.flashcards, data] }))
      }
      
      setShowManualFcModal(false)
      setManualFcFront('')
      setManualFcBack('')
      setEditingFcId(null)
    } catch (e: unknown) {
      alert((e as Error).message || 'Erro ao salvar flashcard.')
    } finally {
      setIsSavingManual(false)
    }
  }

  // ─── SALVAR QUESTÃO MANUAL ────────────────────────────────
  async function handleSaveManualQ() {
    if (!manualQQuestion.trim() || !session.sessionId) return
    if (manualQTipo === 'mc' && manualQOptions.some(o => !o.trim())) {
      alert('Preencha todas as opções da múltipla escolha.')
      return
    }

    setIsSavingManual(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado.')

      const fields = {
        tipo: manualQTipo,
        question: manualQQuestion,
        explanation: manualQExpl,
        options: manualQTipo === 'mc' ? manualQOptions : null,
        correct: manualQTipo === 'mc' ? manualQCorrect : null,
        gabarito: manualQTipo === 'cv' ? manualQGabarito : null
      }

      if (editingQId) {
        // MODO EDIÇÃO — atualizar registro existente
        const { data, error: updateErr } = await supabase
          .from('questions')
          .update(fields)
          .eq('id', editingQId)
          .select('*')
          .single()
        if (updateErr) throw updateErr
        if (data) {
          setSession(prev => ({
            ...prev,
            questions: prev.questions.map(q => q.id === editingQId ? data : q)
          }))
        }
      } else {
        // NOVA QUESTÃO — inserir novo registro
        const { data, error: insertError } = await supabase.from('questions').insert({
          user_id: user.id,
          session_id: session.sessionId,
          topic: session.tema,
          materia: session.disciplina || null,
          banca: 'Autoral',
          ...fields
        }).select('*').single()
        if (insertError) throw insertError
        if (data) setSession(prev => ({ ...prev, questions: [...prev.questions, data] }))
      }

      setShowManualQModal(false)
      setEditingQId(null)
      setManualQQuestion('')
      setManualQExpl('')
      setManualQOptions(['', '', '', '', ''])
      setManualQCorrect(0)
      setManualQGabarito('C')
    } catch (e: unknown) {
      alert((e as Error).message || 'Erro ao salvar questão.')
    } finally {
      setIsSavingManual(false)
    }
  }


  // ─── RENDER ───────────────────────────────────────────────
  const selectedProvider =
    searchMode === 'alto'
      ? 'auto'
      : (aiProvider === 'auto' ? getDefaultAdvancedProvider(planTier) : aiProvider)
  const currentMeta = PROVIDER_META[selectedProvider]
  const currentLimits = getSearchLimits(planTier, searchMode)
  const availableProviders = ADVANCED_PROVIDERS.filter(provider => isProviderAllowed(planTier, 'advanced', provider))
  const availableModels =
    searchMode === 'advanced' && selectedProvider !== 'auto'
      ? getProviderModels(selectedProvider, planTier)
      : []

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

          {/* Arquivo (upload PDF/txt) */}
          <label style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)',
            color: 'var(--muted,#6b7194)',
            fontSize: '13px', cursor: isLoading ? 'default' : 'pointer', whiteSpace: 'nowrap',
            pointerEvents: isLoading ? 'none' : 'auto', opacity: isLoading ? .5 : 1,
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v9M4 7l4 4 4-4"/><rect x="2" y="12" width="12" height="2" rx="1"/></svg>
            Arquivo
            <input type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }} onChange={handleUpload} disabled={isLoading} />
          </label>



          {isLoading ? (
            <button onClick={cancel} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)', background: 'transparent', color: 'var(--red,#ef4444)', fontSize: '13px', cursor: 'pointer' }}>
              Cancelar
            </button>
          ) : (
            <>
              {hasContent && (
                <button
                  onClick={handleClear}
                  title="Limpar sessão para começar um novo projeto"
                  style={{
                    padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)',
                    background: 'transparent', color: 'var(--text,#e8eaf6)',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  Novo
                </button>
              )}
              {!hasContent && (
                <button
                  onClick={handleManualCreate}
                  disabled={!tema.trim()}
                  title="Criar arquivo vazio manualmente"
                  style={{
                    padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)',
                    background: 'transparent', color: !tema.trim() ? 'var(--muted,#6b7194)' : 'var(--text,#e8eaf6)',
                    fontSize: '13px', fontWeight: 600, cursor: !tema.trim() ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  Manual
                </button>
              )}
              <button
                onClick={handleSearch}
                disabled={!tema.trim()}
                style={{
                  padding: '9px 20px', borderRadius: '8px', border: 'none',
                  background: !tema.trim() ? 'var(--surface2,#181d2e)' : currentMeta.color,
                  color: !tema.trim() ? 'var(--muted,#6b7194)' : '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: !tema.trim() ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span style={{ fontSize: '14px' }}>{currentMeta.icon}</span>
                {searchMode === 'alto' ? 'Alto Busca' : `Busca Avancada com ${currentMeta.label}`}
              </button>
            </>
          )}
        </div>

        {/* ── Seletor de Provider ── */}
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', marginRight: '2px', whiteSpace: 'nowrap' }}>Modo:</span>

          <button
            onClick={() => handleSearchModeChange('alto')}
            disabled={isLoading}
            style={{
              padding: '5px 13px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              border: `1px solid ${searchMode === 'alto' ? PROVIDER_META.auto.color : 'var(--border,#1f2640)'}`,
              background: searchMode === 'alto' ? PROVIDER_META.auto.bg : 'transparent',
              color: searchMode === 'alto' ? PROVIDER_META.auto.color : 'var(--muted,#6b7194)',
              cursor: isLoading ? 'default' : 'pointer',
              opacity: isLoading ? .6 : 1,
            }}
          >
            Alto Busca
          </button>

          <button
            onClick={() => handleSearchModeChange('advanced')}
            disabled={isLoading}
            style={{
              padding: '5px 13px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              border: `1px solid ${searchMode === 'advanced' ? '#f59e0b' : 'var(--border,#1f2640)'}`,
              background: searchMode === 'advanced' ? 'rgba(245,158,11,.14)' : 'transparent',
              color: searchMode === 'advanced' ? '#fbbf24' : 'var(--muted,#6b7194)',
              cursor: isLoading ? 'default' : 'pointer',
              opacity: isLoading ? .6 : 1,
            }}
          >
            Busca Avancada com IA {planTier === 'gratuito' ? '• Pro' : ''}
          </button>

          <span style={{
            fontSize: '10px',
            color: 'var(--muted,#6b7194)',
            border: '1px solid var(--border,#1f2640)',
            borderRadius: '12px',
            padding: '3px 10px',
          }}>
            Plano: <strong style={{ color: 'var(--text,#e8eaf6)' }}>{getPlanLabel(planTier)}</strong>
          </span>

          <span style={{
            fontSize: '10px',
            color: 'var(--muted,#6b7194)',
            border: '1px solid var(--border,#1f2640)',
            borderRadius: '12px',
            padding: '3px 10px',
          }}>
            Alto hoje: <strong style={{ color: 'var(--text,#e8eaf6)' }}>{usageCounts.alto_busca_count}/{getSearchLimits(planTier, 'alto').dailySearchLimit}</strong>
          </span>

          <span style={{
            fontSize: '10px',
            color: 'var(--muted,#6b7194)',
            border: '1px solid var(--border,#1f2640)',
            borderRadius: '12px',
            padding: '3px 10px',
          }}>
            Avancada hoje: <strong style={{ color: 'var(--text,#e8eaf6)' }}>
              {planTier === 'gratuito' ? 'bloqueada' : `${usageCounts.advanced_busca_count}/${getSearchLimits(planTier, 'advanced').dailyAdvancedLimit}`}
            </strong>
          </span>

          <span style={{
            fontSize: '10px',
            color: 'var(--muted,#6b7194)',
            border: '1px solid var(--border,#1f2640)',
            borderRadius: '12px',
            padding: '3px 10px',
          }}>
            Resposta: ate {currentLimits.maxResponseChars.toLocaleString('pt-BR')} caracteres
          </span>

          {usedProvider && phase === 'done' && (
            <span style={{
              marginLeft: 'auto', fontSize: '10px', color: 'var(--muted,#6b7194)',
              display: 'flex', alignItems: 'center', gap: '4px',
              border: '1px solid var(--border,#1f2640)', borderRadius: '12px',
              padding: '3px 10px',
            }}>
              Gerado por <strong style={{ color: PROVIDER_META[usedProvider as AIProvider]?.color ?? 'var(--text,#e8eaf6)' }}>
                {PROVIDER_META[usedProvider as AIProvider]?.label ?? usedProvider}
              </strong>
              {usedModel && (
                <span style={{ opacity: .6 }}>· {usedModel.split('-').slice(0,3).join('-')}</span>
              )}
            </span>
          )}
        </div>

        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', marginRight: '2px', whiteSpace: 'nowrap' }}>IA:</span>

          {searchMode === 'alto' ? (
            <span style={{
              fontSize: '11px',
              color: PROVIDER_META.auto.color,
              border: `1px solid ${PROVIDER_META.auto.color}`,
              borderRadius: '999px',
              padding: '5px 10px',
              background: PROVIDER_META.auto.bg,
            }}>
              Alto Busca escolhe automaticamente a IA mais economica para o seu plano.
            </span>
          ) : availableProviders.map(provider => {
            const meta = PROVIDER_META[provider]
            const active = selectedProvider === provider
            return (
              <button
                key={provider}
                onClick={() => handleProviderChange(provider)}
                disabled={isLoading}
                style={{
                  padding: '5px 13px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  border: `1px solid ${active ? meta.color : 'var(--border,#1f2640)'}`,
                  background: active ? meta.bg : 'transparent',
                  color: active ? meta.color : 'var(--muted,#6b7194)',
                  cursor: isLoading ? 'default' : 'pointer',
                  opacity: isLoading ? .6 : 1,
                  transition: 'all .15s',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                <span style={{ fontSize: '13px' }}>{meta.icon}</span>
                {meta.label}
              </button>
            )
          })}

          {/* Dropdown de modelo (quando não é Auto) */}
          {searchMode === 'advanced' && availableModels.length > 0 && (
            <select
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
              disabled={isLoading}
              style={{
                marginLeft: '4px',
                padding: '5px 10px', borderRadius: '8px', fontSize: '12px',
                border: `1px solid ${currentMeta.color}`,
                background: 'var(--surface2,#181d2e)',
                color: currentMeta.color,
                cursor: 'pointer',
                opacity: isLoading ? .6 : 1,
                outline: 'none',
              }}
            >
              {availableModels.map(m => (
                <option key={m.id} value={m.id} style={{ background: '#181d2e', color: '#e8eaf6' }}>
                  {m.label}{m.tier === 'free' ? ' • Free' : ''}
                </option>
              ))}
            </select>
          )}

          {/* Badge do provider/modelo usado na última geração */}
          {usedProvider && phase === 'done' && (
            <span style={{
              marginLeft: 'auto', fontSize: '10px', color: 'var(--muted,#6b7194)',
              display: 'flex', alignItems: 'center', gap: '4px',
              border: '1px solid var(--border,#1f2640)', borderRadius: '12px',
              padding: '3px 10px',
            }}>
              Gerado por <strong style={{ color: PROVIDER_META[usedProvider as AIProvider]?.color ?? 'var(--text,#e8eaf6)' }}>
                {PROVIDER_META[usedProvider as AIProvider]?.label ?? usedProvider}
              </strong>
              {usedModel && (
                <span style={{ opacity: .6 }}>· {usedModel.split('-').slice(0,3).join('-')}</span>
              )}
            </span>
          )}
        </div>

        {/* Status da busca */}
        {isLoading && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: `2px solid ${currentMeta.color}`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
            <span style={{ fontSize: '12px', color: 'var(--muted,#6b7194)' }}>
              {phase === 'searching'
                ? 'Pesquisando na web...'
                : genTarget === 'summary'
                  ? `Gerando resumo com ${currentMeta.label}...`
                  : genTarget === 'flashcards'
                    ? `Criando flashcards com ${currentMeta.label}...`
                    : `Gerando questões com ${currentMeta.label}...`}
            </span>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '8px', fontSize: '12px', color: '#f87171' }}>
            {error}
          </div>
        )}

        {aiNotice && (
          <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(245,158,11,.10)', border: '1px solid rgba(245,158,11,.28)', borderRadius: '8px', fontSize: '12px', color: '#fbbf24' }}>
            {aiNotice}
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
                onClick={() => setView('flashcards')}
                disabled={!session.resumo}
                style={{
                  padding: '5px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 500,
                  cursor: !session.resumo ? 'default' : 'pointer',
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
                onClick={() => setView('questoes')}
                disabled={!session.resumo}
                style={{
                  padding: '5px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 500,
                  cursor: !session.resumo ? 'default' : 'pointer',
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

              {/* Botão EXPORTAR PDF */}
              {hasContent && (
                <button
                  onClick={handleExportPDF}
                  title="Exportar todo o conteúdo em PDF"
                  style={{
                    padding: '5px 14px', borderRadius: '7px', border: '1px solid #6c63ff',
                    background: 'rgba(108,99,255,.12)', color: 'var(--accent,#6c63ff)',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '8px'
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 4h8l4 4v6a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z"/><path d="M10 4v4h4"/><path d="M6 10v3M4.5 11.5L6 13l1.5-1.5" strokeLinecap="round"/></svg>
                  Exportar PDF
                </button>
              )}

              {/* Toggle Sidebar Fontes */}
              <button
                onClick={() => setShowSources(!showSources)}
                title={showSources ? "Esconder Fontes" : "Mostrar Fontes"}
                style={{
                  padding: '5px 12px', borderRadius: '7px', border: '1px solid var(--border,#1f2640)',
                  background: showSources ? 'rgba(108,99,255,.1)' : 'transparent',
                  color: showSources ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {showSources ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13l-5-5 5-5M11 13l-5-5 5-5"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 13l5-5-5-5M13 13l5-5-5-5"/></svg>
                )}
                <span className="hide-on-mobile">Fontes</span>
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
              <div style={{ display: view === 'resumo' ? 'block' : 'none', height: '100%' }}>
                <EditableResumo 
                  content={session.resumo} 
                  loading={genTarget === 'summary'} 
                  sessionId={session.sessionId} 
                />
              </div>

              {/* ── FLASHCARDS ── */}
              <div style={{ display: view === 'flashcards' ? 'block' : 'none', height: '100%' }}>
                <FlashcardsView 
                  cards={session.flashcards} 
                  loading={genTarget === 'flashcards'} 
                  onOpenManual={() => setShowManualFcModal(true)} 
                  onGenerateAI={handleFlashcards}
                  onDelete={handleDeleteFc}
                  onEdit={handleOpenEditFc}
                  isSelectionMode={isSelectionMode}
                  setIsSelectionMode={setIsSelectionMode}
                  selectedIds={selectedFcIds}
                  toggleSelection={toggleFcSelection}
                  onSelectAll={handleSelectAllFcs}
                  onDeleteSelected={handleBulkDeleteFcs}
                />
              </div>

              {/* ── QUESTÕES ── */}
              <div style={{ display: view === 'questoes' ? 'block' : 'none', height: '100%' }}>
                <QuestoesView 
                  questions={session.questions} 
                  loading={genTarget === 'questions'} 
                  onOpenManual={() => setShowManualQModal(true)} 
                  onGenerateAI={handleQuestions}
                  onDelete={handleDeleteQ}
                  onEdit={handleOpenEditQ}
                  isSelectionMode={isQSelectionMode}
                  setIsSelectionMode={setIsQSelectionMode}
                  selectedIds={selectedQIds}
                  toggleSelection={toggleQSelection}
                  onSelectAll={handleSelectAllQs}
                  onDeleteSelected={handleBulkDeleteQs}
                />
              </div>
            </div>
          </div>

          {/* Painel lateral — fontes */}
          <div style={{ 
            width: showSources ? '210px' : '0px', 
            opacity: showSources ? 1 : 0,
            pointerEvents: showSources ? 'auto' : 'none',
            background: 'var(--surface,#111420)', 
            borderLeft: showSources ? '1px solid var(--border,#1f2640)' : 'none', 
            display: 'flex', 
            flexDirection: 'column', 
            flexShrink: 0, 
            overflow: 'hidden',
            transition: 'width 0.24s ease, opacity 0.2s ease'
          }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border,#1f2640)', fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
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
          position: 'fixed', inset: 0, zIndex: 100,
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

      {/* ── Modal de configuração de flashcards ── */}
      {showFcModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowFcModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)',
            borderRadius: '16px', padding: '28px 28px 24px', width: '380px', maxWidth: '90vw',
          }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text,#e8eaf6)', marginBottom: '20px' }}>
              Configurar Flashcards
            </div>

            {/* Quantidade */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Quantidade de cards a gerar
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([5, 10, 15, 20] as const).map(n => (
                  <button key={n} onClick={() => setFcConfig(c => ({ ...c, quantidade: n }))}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      border: '1px solid', cursor: 'pointer', transition: 'all .12s',
                      borderColor: fcConfig.quantidade === n ? 'var(--accent2,#00d4aa)' : 'var(--border,#1f2640)',
                      background:  fcConfig.quantidade === n ? 'rgba(0,212,170,.12)' : 'transparent',
                      color:       fcConfig.quantidade === n ? 'var(--accent2,#00d4aa)' : 'var(--muted,#6b7194)',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', marginTop: '12px', lineHeight: 1.5 }}>
                Escolha quantos flashcards a IA deve criar com base no resumo atual.
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowFcModal(false)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)',
                background: 'transparent', color: 'var(--muted,#6b7194)', fontSize: '13px', cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button onClick={() => generateFlashcards(fcConfig)} style={{
                flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
                background: 'var(--accent2,#00d4aa)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}>
                Gerar {fcConfig.quantidade} flashcards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FLASHCARD MANUAL */}
      {showManualFcModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--surface,#111420)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border,#1f2640)', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text,#e8eaf6)' }}>Novo Flashcard</div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginBottom: '6px' }}>Frente (Pergunta)</div>
              <textarea value={manualFcFront} onChange={e => setManualFcFront(e.target.value)} style={{ width: '100%', height: '80px', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '8px', padding: '10px', color: 'var(--text,#e8eaf6)', fontSize: '13px', outline: 'none', resize: 'none' }} placeholder="O que é..." />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginBottom: '6px' }}>Verso (Resposta)</div>
              <textarea value={manualFcBack} onChange={e => setManualFcBack(e.target.value)} style={{ width: '100%', height: '80px', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '8px', padding: '10px', color: 'var(--text,#e8eaf6)', fontSize: '13px', outline: 'none', resize: 'none' }} placeholder="Significa..." />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setShowManualFcModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border,#1f2640)', color: 'var(--muted,#6b7194)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSaveManualFc} disabled={isSavingManual || !manualFcFront.trim() || !manualFcBack.trim()} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent,#6c63ff)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: isSavingManual ? 'default' : 'pointer', opacity: (isSavingManual || !manualFcFront.trim() || !manualFcBack.trim()) ? 0.6 : 1 }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUESTÃO MANUAL */}
      {showManualQModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--surface,#111420)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border,#1f2640)', width: '500px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text,#e8eaf6)' }}>
              {editingQId ? 'Editar Questão' : 'Nova Questão'}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text,#e8eaf6)' }}>
                <input type="radio" checked={manualQTipo === 'cv'} onChange={() => setManualQTipo('cv')} /> Certo/Errado
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text,#e8eaf6)' }}>
                <input type="radio" checked={manualQTipo === 'mc'} onChange={() => setManualQTipo('mc')} /> Múltipla Escolha
              </label>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginBottom: '6px' }}>Enunciado da Questão</div>
              <textarea value={manualQQuestion} onChange={e => setManualQQuestion(e.target.value)} style={{ width: '100%', height: '80px', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '8px', padding: '10px', color: 'var(--text,#e8eaf6)', fontSize: '13px', outline: 'none', resize: 'none' }} placeholder="Digite a pergunta aqui..." />
            </div>

            {manualQTipo === 'cv' ? (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginBottom: '6px' }}>Gabarito</div>
                <select value={manualQGabarito} onChange={e => setManualQGabarito(e.target.value as 'C'|'E')} style={{ width: '100%', padding: '10px', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '8px', color: 'var(--text,#e8eaf6)', fontSize: '13px', outline: 'none' }}>
                  <option value="C">Certo</option>
                  <option value="E">Errado</option>
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)' }}>Opções (A, B, C, D, E)</div>
                {manualQOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="radio" checked={manualQCorrect === idx} onChange={() => setManualQCorrect(idx)} title="Marcar como correta" />
                    <input value={opt} onChange={e => {
                      const newOpts = [...manualQOptions]; newOpts[idx] = e.target.value; setManualQOptions(newOpts)
                    }} style={{ flex: 1, padding: '8px 10px', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '8px', color: 'var(--text,#e8eaf6)', fontSize: '13px', outline: 'none' }} placeholder={`Opção ${['A','B','C','D','E'][idx]}`} />
                  </div>
                ))}
              </div>
            )}

            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginBottom: '6px' }}>Explicação / Resolução (Opcional)</div>
              <textarea value={manualQExpl} onChange={e => setManualQExpl(e.target.value)} style={{ width: '100%', height: '60px', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '8px', padding: '10px', color: 'var(--text,#e8eaf6)', fontSize: '13px', outline: 'none', resize: 'none' }} placeholder="Por que esta é a resposta correta?" />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => { setShowManualQModal(false); setEditingQId(null) }} style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border,#1f2640)', color: 'var(--muted,#6b7194)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSaveManualQ} disabled={isSavingManual || !manualQQuestion.trim()} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent,#6c63ff)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: isSavingManual ? 'default' : 'pointer', opacity: (isSavingManual || !manualQQuestion.trim()) ? 0.6 : 1 }}>{editingQId ? 'Atualizar' : 'Salvar Questão'}</button>
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
          <h3 key={i} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent,#6c63ff)', margin: '16px 0 6px' }}>
            {line.replace('### ', '')}
          </h3>
        )
        if (line.startsWith('**') && line.endsWith('**')) return (
          <p key={i} style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)', fontWeight: 600, margin: '8px 0 4px' }}>
            {line.replace(/\*\*/g, '')}
          </p>
        )
        if (line.startsWith('- ') || line.startsWith('• ')) return (
          <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text,#e8eaf6)', lineHeight: 1.7, marginBottom: '4px', paddingLeft: '8px' }}>
            <span style={{ color: 'var(--accent,#6c63ff)', flexShrink: 0 }}>•</span>
            <span>{line.replace(/^[-•] /, '')}</span>
          </div>
        )
        if (line.trim() === '') return <div key={i} style={{ height: '8px' }} />
        // Linha normal — processa negrito inline
        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        return (
          <p key={i} style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)', lineHeight: 1.85, margin: '0 0 4px' }}>
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
function FlashcardsView({ 
  cards, loading, onOpenManual, onGenerateAI, 
  onDelete, onEdit, 
  isSelectionMode, setIsSelectionMode,
  selectedIds, toggleSelection,
  onSelectAll, onDeleteSelected
}: { 
  cards: Flashcard[]; loading: boolean; onOpenManual?: () => void; onGenerateAI?: () => void; 
  onDelete: (id: string) => void; onEdit: (fc: Flashcard) => void;
  isSelectionMode: boolean; setIsSelectionMode: (v: boolean) => void;
  selectedIds: Set<string>; toggleSelection: (id: string) => void;
  onSelectAll: () => void; onDeleteSelected: () => void;
}) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({})
  if (loading) return <LoadingDots label="Criando flashcards..." />

  if (cards.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', background: 'var(--surface,#111420)', borderRadius: '12px', border: '1px dashed var(--border,#1f2640)' }}>
        <div style={{ color: 'var(--text,#e8eaf6)', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Nenhum flashcard gerado ainda</div>
        <div style={{ color: 'var(--muted,#6b7194)', fontSize: '13px', marginBottom: '24px', textAlign: 'center' }}>Como você deseja criar seus flashcards para este tema?</div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={onGenerateAI} style={{ padding: '14px 24px', borderRadius: '10px', background: 'rgba(0,212,170,.1)', border: '1px solid #00d4aa', color: '#00d4aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '160px', transition: 'all .2s' }}>
             Gerar com IA
             <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.8 }}>Automático</span>
          </button>
          
          <button onClick={onOpenManual} style={{ padding: '14px 24px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border,#1f2640)', color: 'var(--text,#e8eaf6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '160px', transition: 'all .2s' }}>
             Criar Manualmente
             <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.8, color: 'var(--muted,#6b7194)' }}>Você escreve</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)' }}>
            {cards.length} flashcard{cards.length !== 1 ? 's' : ''}
          </div>
          <button 
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            style={{ 
              padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)',
              background: isSelectionMode ? 'rgba(108,99,255,.15)' : 'transparent',
              color: isSelectionMode ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s'
            }}
          >
            {isSelectionMode ? 'Cancelar Seleção' : 'Selecionar'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isSelectionMode ? (
            <>
              <button 
                onClick={onSelectAll}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)', background: 'transparent', color: 'var(--text,#e8eaf6)', fontSize: '12px', cursor: 'pointer' }}
              >
                {selectedIds.size === cards.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
              </button>
              <button 
                onClick={onDeleteSelected}
                disabled={selectedIds.size === 0}
                style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: selectedIds.size === 0 ? 'default' : 'pointer', opacity: selectedIds.size === 0 ? 0.5 : 1 }}
              >
                Excluir ({selectedIds.size})
              </button>
            </>
          ) : (
            onOpenManual && (
              <button onClick={onOpenManual} style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--accent,#6c63ff)', color: '#fff', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + Novo Flashcard
              </button>
            )
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {cards.map((card, i) => {
          const isSelected = card.id ? selectedIds.has(card.id) : false
          
          return (
            <div
              key={card.id || i}
              onClick={() => {
                if (isSelectionMode && card.id) {
                  toggleSelection(card.id)
                } else {
                  setFlipped(f => ({ ...f, [i]: !f[i] }))
                }
              }}
              style={{
                background: 'var(--surface,#111420)', 
                border: `1px solid ${isSelected ? 'var(--accent,#6c63ff)' : (flipped[i] ? 'var(--accent2,#00d4aa)' : 'var(--border,#1f2640)')}`,
                borderRadius: '12px', padding: '18px 16px', cursor: 'pointer',
                minHeight: '130px', display: 'flex', flexDirection: 'column',
                transition: 'all .2s', userSelect: 'none', position: 'relative',
                boxShadow: isSelected ? '0 0 0 1px var(--accent,#6c63ff)' : 'none'
              }}
            >
              {/* Checkbox em modo de seleção */}
              {isSelectionMode && (
                <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 5 }}>
                  <div style={{ 
                    width: '18px', height: '18px', borderRadius: '4px', 
                    border: `2px solid ${isSelected ? 'var(--accent,#6c63ff)' : 'var(--border,#1f2640)'}`,
                    background: isSelected ? 'var(--accent,#6c63ff)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px'
                  }}>
                    {isSelected && '✓'}
                  </div>
                </div>
              )}

              {/* Ações individuais (X e Editar) */}
              {!isSelectionMode && card.id && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', zIndex: 10 }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(card) }}
                    title="Editar"
                    style={{ background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted,#6b7194)', transition: 'all .15s' }}
                    onMouseOver={e => e.currentTarget.style.color = 'var(--accent,#6c63ff)'}
                    onMouseOut={e => e.currentTarget.style.color = 'var(--muted,#6b7194)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); if(confirm('Excluir este flashcard?')) onDelete(card.id!) }}
                    title="Excluir"
                    style={{ background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted,#6b7194)', transition: 'all .15s' }}
                    onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseOut={e => e.currentTarget.style.color = 'var(--muted,#6b7194)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              )}

              {!flipped[i] ? (
                <>
                  <div style={{ fontSize: '10px', color: 'var(--accent,#6c63ff)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', marginTop: isSelectionMode ? '10px' : '0' }}>
                    Pergunta {i + 1}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)', lineHeight: 1.6, fontWeight: 500, paddingRight: !isSelectionMode ? '60px' : '0' }}>
                    {card.front}
                  </div>
                  {!isSelectionMode && (
                    <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', marginTop: 'auto', paddingTop: '12px' }}>
                      Toque para ver a resposta
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: '10px', color: 'var(--accent2,#00d4aa)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                    Resposta
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)', lineHeight: 1.7 }}>
                    {card.back}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sub-componente: QUESTÕES ──────────────────────────────
function QuestoesView({ 
  questions, loading, onOpenManual, onGenerateAI,
  onDelete, onEdit,
  isSelectionMode, setIsSelectionMode,
  selectedIds, toggleSelection,
  onSelectAll, onDeleteSelected
}: { 
  questions: Question[]; loading: boolean; onOpenManual?: () => void; onGenerateAI?: () => void;
  onDelete: (id: string) => void; onEdit: (q: Question) => void;
  isSelectionMode: boolean; setIsSelectionMode: (v: boolean) => void;
  selectedIds: Set<string>; toggleSelection: (id: string) => void;
  onSelectAll: () => void; onDeleteSelected: () => void;
}) {
  const [answers,      setAnswers]      = useState<Record<number, string | number>>({})
  const [revealed,     setRevealed]     = useState<Record<number, boolean>>({})
  const [showGabarito, setShowGabarito] = useState(false)

  if (loading) return <LoadingDots label="Gerando questões..." />

  if (questions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', background: 'var(--surface,#111420)', borderRadius: '12px', border: '1px dashed var(--border,#1f2640)', maxWidth: '760px' }}>
        <div style={{ color: 'var(--text,#e8eaf6)', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Nenhuma questão gerada ainda</div>
        <div style={{ color: 'var(--muted,#6b7194)', fontSize: '13px', marginBottom: '24px', textAlign: 'center' }}>Como você deseja começar a criar questões para este tema?</div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={onGenerateAI} style={{ padding: '14px 24px', borderRadius: '10px', background: 'rgba(245,158,11,.1)', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '160px', transition: 'all .2s' }}>
             Gerar com IA
             <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.8 }}>Automático</span>
          </button>
          
          <button onClick={onOpenManual} style={{ padding: '14px 24px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border,#1f2640)', color: 'var(--text,#e8eaf6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '160px', transition: 'all .2s' }}>
             Criar Manualmente
             <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.8, color: 'var(--muted,#6b7194)' }}>Você elabora</span>
          </button>
        </div>
      </div>
    )
  }

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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)' }}>
            {questions.length} questão{questions.length !== 1 ? 'ões' : ''}
          </div>
          <button 
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            style={{ 
              padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)',
              background: isSelectionMode ? 'rgba(108,99,255,.15)' : 'transparent',
              color: isSelectionMode ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s'
            }}
          >
            {isSelectionMode ? 'Cancelar Seleção' : 'Selecionar'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isSelectionMode ? (
            <>
              <button 
                onClick={onSelectAll}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)', background: 'transparent', color: 'var(--text,#e8eaf6)', fontSize: '12px', cursor: 'pointer' }}
              >
                {selectedIds.size === questions.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
              </button>
              <button 
                onClick={onDeleteSelected}
                disabled={selectedIds.size === 0}
                style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: selectedIds.size === 0 ? 'default' : 'pointer', opacity: selectedIds.size === 0 ? 0.5 : 1 }}
              >
                Excluir ({selectedIds.size})
              </button>
            </>
          ) : (
            onOpenManual && (
              <button onClick={onOpenManual} style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--accent,#6c63ff)', color: '#fff', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + Nova Questão
              </button>
            )
          )}
        </div>
      </div>

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
        const isSelected = q.id ? selectedIds.has(q.id) : false
        const isCorrect = q.tipo === 'cv'
          ? answers[qi] === q.gabarito
          : answers[qi] === q.correct

        return (
          <div key={q.id || qi} 
            onClick={() => isSelectionMode && q.id && toggleSelection(q.id)}
            style={{
              background: 'var(--surface,#111420)', 
              border: `1px solid ${isSelected ? 'var(--accent,#6c63ff)' : 'var(--border,#1f2640)'}`,
              borderRadius: '12px', padding: '18px', marginBottom: '14px',
              position: 'relative', transition: 'all .2s',
              cursor: isSelectionMode ? 'pointer' : 'default',
              boxShadow: isSelected ? '0 0 0 1px var(--accent,#6c63ff)' : 'none'
            }}>
            
            {/* Checkbox em modo de seleção */}
            {isSelectionMode && (
              <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 5 }}>
                <div style={{ 
                  width: '18px', height: '18px', borderRadius: '4px', 
                  border: `2px solid ${isSelected ? 'var(--accent,#6c63ff)' : 'var(--border,#1f2640)'}`,
                  background: isSelected ? 'var(--accent,#6c63ff)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px'
                }}>
                  {isSelected && '✓'}
                </div>
              </div>
            )}

            {/* Ações individuais (X e Editar) */}
            {!isSelectionMode && q.id && (
              <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '6px', zIndex: 10 }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(q) }}
                  title="Editar Questão"
                  style={{ background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted,#6b7194)', transition: 'all .15s' }}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--accent,#6c63ff)'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--muted,#6b7194)'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm('Excluir esta questão permanentemente?')) onDelete(q.id!) }}
                  title="Excluir Questão"
                  style={{ background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted,#6b7194)', transition: 'all .15s' }}
                  onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--muted,#6b7194)'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            )}
            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', color: 'var(--accent,#6c63ff)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, paddingLeft: isSelectionMode ? '24px' : '0' }}>
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
              {q.banca && !q.id && (
                <span style={{ fontSize: '10px', color: 'var(--muted,#6b7194)' }}>{q.banca}</span>
              )}
            </div>

            {/* Enunciado */}
            <div style={{ fontSize: '14px', color: 'var(--text,#e8eaf6)', lineHeight: 1.75, marginBottom: '16px', fontWeight: 500, paddingRight: '64px', paddingLeft: isSelectionMode ? '24px' : '0' }}>
              {q.question}
            </div>

            {/* Opções Certo/Errado */}
            {q.tipo === 'cv' ? (
              <div style={{ display: 'flex', gap: '8px', paddingLeft: isSelectionMode ? '24px' : '0' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: isSelectionMode ? '24px' : '0' }}>
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
