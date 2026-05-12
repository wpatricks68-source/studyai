'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EditableResumo } from '@/components/study/EditableResumo'
import ResumoPrintWindow from '@/components/study/ResumoPrintWindow'
import InteractiveQuestionsPanel from '@/components/study/InteractiveQuestionsPanel'
import { getSearchLimits, isProviderAllowed, normalizePlanTier, type PlanTier, type SearchMode } from '@/lib/search-plans'

type GenType   = 'summary' | 'flashcards' | 'questions'
type ViewMode  = 'resumo' | 'flashcards' | 'questoes'
type AIProvider = 'auto' | 'gpt' | 'gemini' | 'claude' | 'deepseek'
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
    { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash (Free)',  tier: 'free' },
    { id: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash (Free)',  tier: 'free' },
    { id: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro',           tier: 'paid' },
    { id: 'gemini-1.5-flash-8b',   label: 'Gemini 1.5 Flash 8B',      tier: 'free' },
  ],
  deepseek: [
    { id: 'deepseek-chat',         label: 'DeepSeek Chat (Free)',      tier: 'free' },
    { id: 'deepseek-coder',       label: 'DeepSeek Coder',           tier: 'free' },
  ],
}

const PROVIDER_META: Record<AIProvider, { label: string; color: string; bg: string; icon: string }> = {
  auto:   { label: 'Alto Busca', color: '#10b981', bg: 'rgba(16,185,129,.15)', icon: '✦' },
  gpt:    { label: 'GPT',          color: '#10a37f', bg: 'rgba(16,163,127,.15)', icon: '⬡' },
  gemini: { label: 'Gemini',       color: '#4285f4', bg: 'rgba(66,133,244,.15)', icon: '◈' },
  claude: { label: 'Claude',       color: '#cc785c', bg: 'rgba(204,120,92,.15)', icon: '◆' },
  deepseek:{ label: 'DeepSeek',    color: '#4f46e5', bg: 'rgba(79,70,229,.15)', icon: '◉' },
}

const ADVANCED_PROVIDERS: PaidAIProvider[] = ['gpt', 'gemini', 'claude', 'deepseek']

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
  const [showModelSelect, setShowModelSelect] = useState(false)

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

  // ─── Estados de Importação de Arquivo ────────────────────────
  const [showImportModal, setShowImportModal] = useState(false)
  const [showImportQModal, setShowImportQModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importDisciplina, setImportDisciplina] = useState('')
  const [importTema, setImportTema] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState('')
  const [importTarget, setImportTarget] = useState<'flashcards' | 'questions'>('flashcards')

  // ─── Estados de Gestão de Questões ──────────────────────────
  const [isQSelectionMode, setIsQSelectionMode] = useState(false)
  const [selectedQIds, setSelectedQIds]        = useState<Set<string>>(new Set())
  const [editingQId,   setEditingQId]           = useState<string | null>(null)

  // ─── Estado do Sidebar Secundário ───
  const [showSources, setShowSources] = useState(true)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showResumoWindow, setShowResumoWindow] = useState(false)

  // ─── Estado de Disciplinas Salvas (Painel de Disciplina) ───
  const [savedDisciplinas, setSavedDisciplinas] = useState<string[]>([])
  const [showDiscDropdown, setShowDiscDropdown] = useState(false)
  const [isCreatingDisc, setIsCreatingDisc] = useState(false)
  const [newDiscName, setNewDiscName] = useState('')

  // Detect mobile and hide sources by default
  useEffect(() => {
    if (window.innerWidth < 1024) setShowSources(false)
  }, [])

  // Carregar disciplinas salvas do Painel de Disciplina
  useEffect(() => {
    const loadDisciplinas = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('materia')
        .eq('user_id', user.id)

      if (sessions) {
        const disciplinas = Array.from(new Set(
          sessions.map((s: any) => s.materia).filter(Boolean)
        )) as string[]
        setSavedDisciplinas(disciplinas.sort())
      }
    }
    loadDisciplinas()
  }, [])

  // Atualizar lista de disciplinas quando disciplina muda
  useEffect(() => {
    if (disciplina && !savedDisciplinas.includes(disciplina)) {
      setSavedDisciplinas(prev => [...prev, disciplina].sort())
    }
  }, [disciplina])

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

  // ─── IMPORTAR FLASHCARDS/QUESTÕES DE ARQUIVO ────────────────
  const handleImportFile = useCallback(async () => {
    if (!importFile) {
      setImportError('Selecione um arquivo TXT ou CSV.')
      return
    }
    const topic = importTema.trim()
    if (!topic) {
      setImportError('Informe o tema para organizar o conteúdo.')
      return
    }

    setImportBusy(true)
    setImportError('')

    try {
      const fd = new FormData()
      fd.append('file', importFile)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json().catch(() => ({}))
      if (!uploadRes.ok || uploadData.error) {
        throw new Error(uploadData.error || 'Não foi possível ler o arquivo.')
      }

      const rawContent = String(uploadData.content ?? '').trim()
      if (!rawContent) throw new Error('O arquivo está vazio ou sem texto legível.')

      const disc = importDisciplina.trim()
      const title = disc ? `${disc}: ${topic}` : topic
      const isCsv = importFile.name.toLowerCase().endsWith('.csv')

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada. Faça login novamente.')

      let sessionId = session.sessionId
      if (!sessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from('study_sessions')
          .insert({
            user_id: user.id,
            title,
            topic,
            materia: disc || null,
            content: `## ${title}\n\nConteúdo importado de ${importFile.name}.\n\n${rawContent.slice(0, 12000)}`,
            source_type: 'upload',
          })
          .select('id')
          .single()

        if (sessionError) throw sessionError
        sessionId = newSession?.id ?? null
      }

      if (importTarget === 'flashcards') {
        const parsedCards = parseFlashcardsFromText(rawContent, isCsv)
        if (parsedCards.length === 0) {
          throw new Error('Nenhum par pergunta/resposta encontrado. Use CSV com colunas pergunta/resposta ou TXT com linhas no formato "pergunta;resposta".')
        }

        const { error: cardsError } = await supabase
          .from('flashcards')
          .insert(parsedCards.map(card => ({
            user_id: user.id,
            session_id: sessionId,
            front: card.front,
            back: card.back,
            topic,
            materia: disc || null,
          })))

        if (cardsError) throw cardsError

        const { data: updatedCards } = await supabase
          .from('flashcards')
          .select('*')
          .eq('session_id', sessionId)
        
        if (updatedCards) {
          setSession(prev => ({ ...prev, flashcards: [...prev.flashcards, ...updatedCards] }))
        }
        
        alert(`Importados ${parsedCards.length} flashcards com sucesso!`)
      } else {
        const parsedQuestions = parseQuestionsFromText(rawContent, isCsv)
        if (parsedQuestions.length === 0) {
          throw new Error('Nenhuma questão encontrada. Use o formato: cv;comando;C "explicação" ou mc;comando;a;b;c;d;e;gabarito "explicação"')
        }

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(parsedQuestions.map(q => ({
            user_id: user.id,
            session_id: sessionId,
            question: q.question,
            tipo: q.tipo,
            options: q.options,
            correct: q.correct,
            gabarito: q.gabarito,
            explanation: q.explanation,
            topic,
            materia: disc || null,
          })))

        if (questionsError) throw questionsError

        const { data: updatedQuestions } = await supabase
          .from('questions')
          .select('*')
          .eq('session_id', sessionId)
        
        if (updatedQuestions) {
          setSession(prev => ({ ...prev, questions: [...prev.questions, ...updatedQuestions] }))
        }
        
        alert(`Importadas ${parsedQuestions.length} questões com sucesso!`)
      }

      if (importTarget === 'flashcards') {
        setShowImportModal(false)
      } else {
        setShowImportQModal(false)
      }
      setImportFile(null)
      setImportDisciplina('')
      setImportTema('')
    } catch (error) {
      setImportError((error as Error).message || 'Erro ao importar arquivo.')
    } finally {
      setImportBusy(false)
    }
  }, [importFile, importDisciplina, importTema, session.sessionId, importTarget, setShowImportQModal])

  function parseFlashcardsFromText(content: string, isCsv: boolean) {
    const cards: { front: string; back: string }[] = []
    
    if (isCsv) {
      const lines = content.split(/\r?\n/).filter(line => line.trim())
      if (lines.length === 0) return []
      
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
      const frontIdx = headers.findIndex(h => ['front', 'frente', 'pergunta', 'questao', 'question'].includes(h))
      const backIdx = headers.findIndex(h => ['back', 'verso', 'resposta', 'answer', 'gabarito'].includes(h))
      
      const startIdx = (frontIdx >= 0 && backIdx >= 0) ? 1 : 0
      const fIdx = frontIdx >= 0 ? frontIdx : 0
      const bIdx = backIdx >= 0 ? backIdx : 1
      
      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''))
        if (cols[fIdx] && cols[bIdx]) {
          cards.push({ front: cols[fIdx], back: cols[bIdx] })
        }
      }
    } else {
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      for (const line of lines) {
        const separators = [';', '|', '=>']
        for (const sep of separators) {
          if (line.includes(sep)) {
            const [front, back] = line.split(sep).map(s => s.trim())
            if (front && back) {
              cards.push({ front, back })
              break
            }
          }
        }
      }
    }
    
    return cards
  }

  function parseQuestionsFromText(content: string, isCsv: boolean) {
    const questions: { question: string; tipo: 'cv' | 'mc'; options: string[] | null; correct: number | null; gabarito: string | null; explanation: string | null }[] = []
    
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    
    for (const line of lines) {
      const parts = line.split(';').map(p => p.trim())
      
      if (parts.length < 2) continue
      
      const tipo = parts[0].toLowerCase()
      
      if (tipo === 'cv' || tipo === 'c/e' || tipo === 'ce') {
        if (parts.length < 3) continue
        const cmd = parts[1]
        let gab = parts[2].toUpperCase()
        let explanation: string | null = null
        
        const expMatch = gab.match(/^(C|E)\s*"(.+)"$/)
        if (expMatch) {
          gab = expMatch[1]
          explanation = expMatch[2]
        }
        
        if (cmd && (gab === 'C' || gab === 'E')) {
          questions.push({ question: cmd, tipo: 'cv', options: null, correct: null, gabarito: gab, explanation })
        }
      } else if (tipo === 'mc' || tipo === 'multipla') {
        if (parts.length < 8) continue
        const cmd = parts[1]
        const opts = parts.slice(2, 7)
        let gab = parts[7].toLowerCase()
        let explanation: string | null = null
        
        const expMatch = gab.match(/^([a-e])\s*"(.+)"$/)
        if (expMatch) {
          gab = expMatch[1]
          explanation = expMatch[2]
        }
        
        const correctIdx = ['a', 'b', 'c', 'd', 'e'].indexOf(gab)
        
        if (cmd && opts.every(o => o) && correctIdx >= 0) {
          const labeledOpts = opts.map((o, i) => `${['A','B','C','D','E'][i]}) ${o}`)
          questions.push({ question: cmd, tipo: 'mc', options: labeledOpts, correct: correctIdx, gabarito: null, explanation })
        }
      }
    }
    
    return questions
  }

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

  const handleOpenEditQ = useCallback((q: import('@/components/study/InteractiveQuestionsPanel').InteractiveQuestion) => {
    setEditingQId(q.id || null)
    setManualQTipo(q.tipo as 'cv'|'mc')
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

      {/* ── Botão Flutuante / Trigger para Busca ── */}
      {!isLoading && hasContent && (
        <button
          onClick={() => setShowSearchModal(true)}
          title="Nova Busca / Configurações"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: showSources ? '264px' : '72px',
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            background: 'var(--accent,#6c63ff)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(108,99,255,0.3)',
            cursor: 'pointer',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </button>
      )}

      {/* ── Modal de Busca ── */}
      {showSearchModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setShowSearchModal(false)}>
          <div 
            onClick={e => e.stopPropagation()} 
            style={{
              background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)',
              borderRadius: '20px', width: '800px', maxWidth: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              position: 'relative', overflow: 'visible'
            }}
          >
            {/* Header do Modal */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border,#1f2640)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(108,99,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent,#6c63ff)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text,#e8eaf6)' }}>Nova Pesquisa StudyAI</div>
              </div>
              <button 
                onClick={() => setShowSearchModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted,#6b7194)', cursor: 'pointer', padding: '5px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Barra de busca interna - Disciplina com seletor */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                {/* Disciplina com dropdown */}
                <div style={{ position: 'relative', width: '240px' }}>
                  {isCreatingDisc ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        value={newDiscName}
                        onChange={e => setNewDiscName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            if (newDiscName.trim()) setDisciplina(newDiscName.trim())
                            setIsCreatingDisc(false)
                            setNewDiscName('')
                          }
                          if (e.key === 'Escape') {
                            setIsCreatingDisc(false)
                            setNewDiscName('')
                          }
                        }}
                        autoFocus
                        placeholder="Nome da disciplina"
                        style={{
                          flex: 1,
                          background: 'var(--surface2,#181d2e)', border: '1px solid var(--accent,#6c63ff)',
                          borderRadius: '12px', padding: '12px 16px', color: 'var(--text,#e8eaf6)',
                          fontSize: '14px', outline: 'none'
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newDiscName.trim()) setDisciplina(newDiscName.trim())
                          setIsCreatingDisc(false)
                          setNewDiscName('')
                        }}
                        style={{
                          padding: '8px 12px', borderRadius: '10px', border: 'none',
                          background: 'var(--accent,#6c63ff)', color: '#fff', fontSize: '12px', cursor: 'pointer'
                        }}
                      >
                        OK
                      </button>
                      <button
                        onClick={() => { setIsCreatingDisc(false); setNewDiscName('') }}
                        style={{
                          padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border,#1f2640)',
                          background: 'transparent', color: 'var(--muted,#6b7194)', fontSize: '12px', cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => { if (!isLoading) setShowDiscDropdown(!showDiscDropdown) }}
                        style={{
                          background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)',
                          borderRadius: '12px', padding: '12px 16px', color: disciplina ? 'var(--text,#e8eaf6)' : 'var(--muted,#6b7194)',
                          fontSize: '14px', cursor: isLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          transition: 'all .15s'
                        }}
                      >
                        <span>{disciplina || 'Selecionar / Nova'}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {disciplina && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDisciplina(''); setShowDiscDropdown(false) }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--muted,#6b7194)', cursor: 'pointer', padding: '2px', fontSize: '12px', lineHeight: 1 }}
                              title="Limpar disciplina"
                            >
                              ✕
                            </button>
                          )}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                        </div>
                      </div>
                      {showDiscDropdown && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                          background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)',
                          borderRadius: '10px', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                          maxHeight: '200px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                        }}>
                          <div style={{ padding: '6px', borderBottom: '1px solid var(--border,#1f2640)', display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => { setIsCreatingDisc(true); setNewDiscName(''); setShowDiscDropdown(false) }}
                              style={{
                                flex: 1, padding: '8px', borderRadius: '8px', border: '1px dashed var(--accent,#6c63ff)',
                                background: 'rgba(108,99,255,.08)', color: 'var(--accent,#6c63ff)',
                                fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                              Nova Disciplina
                            </button>
                          </div>
                          <div style={{ overflowY: 'auto', maxHeight: '160px' }}>
                            {savedDisciplinas.length === 0 ? (
                              <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--muted,#6b7194)' }}>
                                Nenhuma disciplina salva
                              </div>
                            ) : (
                              savedDisciplinas.map(d => (
                                <button
                                  key={d}
                                  onClick={() => { setDisciplina(d); setShowDiscDropdown(false) }}
                                  style={{
                                    width: '100%', padding: '10px 14px', border: 'none', textAlign: 'left',
                                    background: disciplina === d ? 'rgba(108,99,255,.15)' : 'transparent',
                                    color: disciplina === d ? 'var(--accent,#6c63ff)' : 'var(--text,#e8eaf6)',
                                    fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid rgba(31,38,64,.5)'
                                  }}
                                  onMouseOver={e => { if (disciplina !== d) e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
                                  onMouseOut={e => { if (disciplina !== d) e.currentTarget.style.background = 'transparent' }}
                                >
                                  {d}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <span style={{ color: 'var(--muted,#6b7194)', fontSize: '20px' }}>›</span>
                <input
                  value={tema}
                  onChange={e => setTema(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (handleSearch(), setShowSearchModal(false))}
                  placeholder="Tema (ex: Princípio da Legalidade)"
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)',
                    borderRadius: '12px', padding: '12px 16px', color: 'var(--text,#e8eaf6)',
                    fontSize: '14px', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end' }}>
                <label style={{
                  padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border,#1f2640)',
                  color: 'var(--muted,#6b7194)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  Arquivo
                  <input type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }} onChange={e => { handleUpload(e); setShowSearchModal(false); }} />
                </label>
                
                <button
                  onClick={() => { handleClear(); }}
                  style={{
                    padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border,#1f2640)',
                    background: 'transparent', color: 'var(--text,#e8eaf6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 6L6 19M6 6l13 13"/></svg>
                  Novo
                </button>
                
                <button
                  onClick={async () => { 
                    if (!tema.trim()) {
                      setError('Insira pelo menos o tema para criar uma sessão.');
                      return;
                    }
                    await handleManualCreate(); 
                    setShowSearchModal(false); 
                  }}
                  style={{
                    padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border,#1f2640)',
                    background: 'transparent', color: 'var(--text,#e8eaf6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  Manual
                </button>

                <button
                  onClick={() => { handleSearch(); setShowSearchModal(false); }}
                  disabled={!tema.trim()}
                  style={{
                    padding: '10px 24px', borderRadius: '10px', border: 'none',
                    background: !tema.trim() ? 'var(--surface2,#181d2e)' : currentMeta.color,
                    color: !tema.trim() ? 'var(--muted,#6b7194)' : '#fff',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <span>{currentMeta.icon}</span>
                  {searchMode === 'alto' ? 'Iniciar Alto Busca' : `Buscar com ${currentMeta.label}`}
                </button>
              </div>

              <div style={{ marginTop: '24px', padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border,#1f2640)', overflow: 'visible' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Configurações de IA</div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleSearchModeChange('alto')}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      border: `1px solid ${searchMode === 'alto' ? PROVIDER_META.auto.color : 'var(--border,#1f2640)'}`,
                      background: searchMode === 'alto' ? PROVIDER_META.auto.bg : 'transparent',
                      color: searchMode === 'alto' ? PROVIDER_META.auto.color : 'var(--muted,#6b7194)',
                      cursor: 'pointer'
                    }}
                  >
                    ✦ Alto Busca
                  </button>
                  <button
                    onClick={() => handleSearchModeChange('advanced')}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      border: `1px solid ${searchMode === 'advanced' ? '#f59e0b' : 'var(--border,#1f2640)'}`,
                      background: searchMode === 'advanced' ? 'rgba(245,158,11,.14)' : 'transparent',
                      color: searchMode === 'advanced' ? '#fbbf24' : 'var(--muted,#6b7194)',
                      cursor: 'pointer'
                    }}
                  >
                    Busca Avançada
                  </button>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', padding: '4px 10px', borderRadius: '8px', background: 'var(--surface2,#181d2e)' }}>
                      Plano: {getPlanLabel(planTier)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', padding: '4px 10px', borderRadius: '8px', background: 'var(--surface2,#181d2e)' }}>
                      Limite: {usageCounts.alto_busca_count}/{getSearchLimits(planTier, 'alto').dailySearchLimit}
                    </span>
                  </div>
                </div>

                {searchMode === 'advanced' && (
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', overflow: 'visible' }}>
                    {availableProviders.map(provider => {
                      const meta = PROVIDER_META[provider]
                      const active = selectedProvider === provider
                      return (
                        <button
                          key={provider}
                          onClick={() => { handleProviderChange(provider); setShowModelSelect(false); }}
                          style={{
                            padding: '5px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                            border: `1px solid ${active ? meta.color : 'var(--border,#1f2640)'}`,
                            background: active ? meta.bg : 'transparent',
                            color: active ? meta.color : 'var(--muted,#6b7194)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                          }}
                        >
                          <span>{meta.icon}</span>
                          {meta.label}
                        </button>
                      )
                    })}
                    {selectedProvider !== 'auto' && availableModels.length > 0 && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setShowModelSelect(!showModelSelect)}
                          style={{
                            padding: '5px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                            border: `1px solid ${showModelSelect ? '#8b5cf6' : 'var(--border,#1f2640)'}`,
                            background: showModelSelect ? 'rgba(139,92,246,.15)' : 'var(--surface2,#181d2e)',
                            color: showModelSelect ? '#a78bfa' : 'var(--muted,#6b7194)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                          {availableModels.find(m => m.id === aiModel)?.label || 'Selecionar Modelo'}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                        </button>
                        {showModelSelect && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                            background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)',
                            borderRadius: '10px', padding: '6px', minWidth: '180px', zIndex: 9999,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                          }}>
                            {availableModels.map(model => (
                              <button
                                key={model.id}
                                onClick={() => { setAiModel(model.id); setShowModelSelect(false); }}
                                style={{
                                  width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '11px',
                                  border: 'none', background: aiModel === model.id ? 'rgba(139,92,246,.2)' : 'transparent',
                                  color: aiModel === model.id ? '#a78bfa' : 'var(--text,#e8eaf6)',
                                  cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}
                              >
                                <span>{model.label}</span>
                                {model.tier === 'free' && <span style={{ fontSize: '9px', color: '#10b981', background: 'rgba(16,185,129,.15)', padding: '2px 6px', borderRadius: '4px' }}>Free</span>}
                                {model.tier === 'paid' && <span style={{ fontSize: '9px', color: '#f59e0b', background: 'rgba(245,158,11,.15)', padding: '2px 6px', borderRadius: '4px' }}>Paid</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showResumoWindow && hasContent && (
        <ResumoPrintWindow
          title={session.disciplina ? `${session.disciplina} - ${session.tema || 'Resumo'}` : (session.tema || 'StudyAI - Resumo')}
          subtitle={[session.disciplina, session.tema, session.savedAt ? `Salvo as ${session.savedAt}` : null].filter(Boolean).join(' - ')}
          resumo={session.resumo}
          flashcards={session.flashcards}
          questions={session.questions}
          onClose={() => setShowResumoWindow(false)}
        />
      )}

      {/* ── Estado vazio ── */}
      {!hasContent && !isLoading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px', padding: '40px' }}>
          <button 
            onClick={() => setShowSearchModal(true)}
            style={{
              width: '64px', height: '64px', borderRadius: '16px',
              background: 'var(--accent,#6c63ff)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(108,99,255,0.3)', transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Nova Pesquisa"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text,#e8eaf6)', marginTop: '8px' }}>Pesquise por Disciplina e Tema</div>
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

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
             <button
                onClick={() => { 
                  if (!tema.trim()) {
                    setError('Insira um tema para criar uma sessão manual.');
                    setShowSearchModal(true);
                    return;
                  }
                  handleManualCreate(); 
                }}
                style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border,#1f2640)', background: 'rgba(108,99,255,0.05)', color: 'var(--accent,#6c63ff)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Sessão Manual
              </button>
              <button
                onClick={handleClear}
                style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border,#1f2640)', background: 'transparent', color: 'var(--muted,#6b7194)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Novo / Limpar
              </button>
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

              {/* Botão ABRIR JANELA */}
              {hasContent && view === 'resumo' && (
                <button
                  onClick={() => setShowResumoWindow(true)}
                  title="Abrir resumo em janela"
                  style={{
                    padding: '5px 14px', borderRadius: '7px', border: '1px solid #6c63ff',
                    background: 'rgba(108,99,255,.12)', color: 'var(--accent,#6c63ff)',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '8px'
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>
                  Abrir janela
                </button>
              )}

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
              <div style={{ display: view === 'resumo' ? 'block' : 'none', minHeight: '100%' }}>
                <EditableResumo 
                  content={session.resumo} 
                  loading={genTarget === 'summary'} 
                  sessionId={session.sessionId} 
                />

                {/* Área de Flashcards - abaixo do resumo */}
                <div style={{ maxWidth: '820px', margin: '24px auto 0' }}>
                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text,#e8eaf6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
                      Flashcards
                      {session.flashcards.length > 0 && (
                        <span style={{ fontSize: '11px', color: '#00d4aa', background: 'rgba(0,212,170,.12)', padding: '2px 8px', borderRadius: '10px' }}>
                          {session.flashcards.length}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={handleFlashcards}
                        disabled={!session.resumo || genTarget === 'flashcards'}
                        style={{
                          padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                          border: '1px solid #00d4aa', background: 'transparent', color: '#00d4aa',
                          cursor: !session.resumo || genTarget === 'flashcards' ? 'not-allowed' : 'pointer',
                          opacity: !session.resumo || genTarget === 'flashcards' ? 0.5 : 1,
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 12h18"/></svg>
                        {genTarget === 'flashcards' ? 'Gerando...' : 'Gerar com IA'}
                      </button>
                      <button
                        onClick={() => {
                          if (!session.sessionId && !session.resumo) {
                            alert('Faça uma pesquisa primeiro ou crie uma sessão.')
                            return
                          }
                          setShowImportModal(true)
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                          border: '1px solid var(--border,#1f2640)', background: 'transparent',
                          color: 'var(--muted,#6b7194)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        Importar TXT/CSV
                      </button>
                      <button
                        onClick={() => {
                          if (!session.sessionId) {
                            alert('Salve o resumo primeiro para criar flashcards.')
                            return
                          }
                          setEditingFcId(null)
                          setManualFcFront('')
                          setManualFcBack('')
                          setShowManualFcModal(true)
                        }}
                        disabled={!session.resumo}
                        style={{
                          padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                          border: '1px solid var(--border,#1f2640)', background: 'transparent',
                          color: 'var(--muted,#6b7194)', cursor: !session.resumo ? 'not-allowed' : 'pointer',
                          opacity: !session.resumo ? 0.5 : 1,
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Criar manualmente
                      </button>
                    </div>
                  </div>

                  {/* Lista de flashcards existentes */}
                  {session.flashcards.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {session.flashcards.map((fc, i) => (
                        <div key={fc.id || i} style={{ background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            <div style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid var(--border,#1f2640)' }}>
                              <div style={{ fontSize: '9px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Frente</div>
                              <div style={{ fontSize: '12px', color: 'var(--text,#e8eaf6)', lineHeight: 1.5 }}>{fc.front}</div>
                            </div>
                            <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(0,212,170,.05)' }}>
                              <div style={{ fontSize: '9px', color: '#00d4aa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Verso</div>
                              <div style={{ fontSize: '12px', color: 'var(--text,#e8eaf6)', lineHeight: 1.5 }}>{fc.back}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px', padding: '4px' }}>
                              <button onClick={() => handleOpenEditFc(fc)} title="Editar" style={{ background: 'transparent', border: 'none', color: 'var(--muted,#6b7194)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button onClick={() => handleDeleteFc(fc.id!)} title="Excluir" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', background: 'var(--surface2,#181d2e)', borderRadius: '10px', border: '1px dashed var(--border,#1f2640)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)' }}>
                        Nenhum flashcard ainda. Use os botões acima para criar.
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ maxWidth: '820px', margin: '24px auto 0', paddingBottom: '24px' }}>
                  <InteractiveQuestionsPanel
                    questions={session.questions}
                    loading={genTarget === 'questions'}
                    title="Questões do Tema"
                    maxWidth="100%"
                    genTarget={genTarget}
                    onDelete={handleDeleteQ}
                    onEdit={handleOpenEditQ}
                    onGenerateAI={handleQuestions}
                    onOpenManual={() => {
                      setEditingQId(null)
                      setManualQQuestion('')
                      setManualQOptions(['', '', '', '', ''])
                      setManualQCorrect(0)
                      setManualQGabarito('C')
                      setManualQExpl('')
                      setShowManualQModal(true)
                    }}
                    onImport={() => {
                      setImportTarget('questions')
                      setShowImportQModal(true)
                    }}
                  />
                </div>
              </div>

              {/* ── FLASHCARDS ── */}
              <div style={{ display: view === 'flashcards' ? 'block' : 'none', minHeight: '100%', maxWidth: '820px', margin: '0 auto' }}>
                <FlashcardsView 
                  cards={session.flashcards} 
                  loading={genTarget === 'flashcards'} 
                  onOpenManual={() => {
                    setEditingFcId(null)
                    setManualFcFront('')
                    setManualFcBack('')
                    setShowManualFcModal(true)
                  }} 
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
              <div style={{ display: view === 'questoes' ? 'block' : 'none', minHeight: '100%', maxWidth: '820px', margin: '0 auto' }}>
                <QuestoesView 
                  questions={session.questions} 
                  loading={genTarget === 'questions'} 
                  onOpenManual={() => {
                    setEditingQId(null)
                    setManualQQuestion('')
                    setManualQOptions(['', '', '', '', ''])
                    setManualQCorrect(0)
                    setManualQGabarito('C')
                    setManualQExpl('')
                    setShowManualQModal(true)
                  }} 
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
            width: showSources ? '240px' : '48px', 
            background: 'var(--surface,#111420)', 
            borderLeft: '1px solid var(--border,#1f2640)', 
            display: 'flex', 
            flexDirection: 'column', 
            flexShrink: 0, 
            overflow: 'hidden',
            transition: 'width 0.24s ease'
          }}>
            <div style={{
              padding: showSources ? '12px 14px' : '12px 8px',
              borderBottom: '1px solid var(--border,#1f2640)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: showSources ? 'space-between' : 'center',
              gap: '8px',
              minHeight: '46px',
            }}>
              {showSources && (
                <div style={{ fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                  Fontes consultadas
                </div>
              )}
              <button
                onClick={() => setShowSources(!showSources)}
                title={showSources ? "Esconder Fontes" : "Mostrar Fontes"}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  border: '1px solid var(--border,#1f2640)',
                  background: showSources ? 'rgba(108,99,255,.1)' : 'transparent',
                  color: showSources ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {showSources ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                )}
              </button>
            </div>
            <div style={{ display: showSources ? 'block' : 'none', flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
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
              <div style={{ display: showSources ? 'block' : 'none', padding: '12px 14px', borderTop: '1px solid var(--border,#1f2640)' }}>
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

      {/* MODAL IMPORTAR TXT/CSV */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(3,5,12,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
          <div style={{ width: '100%', maxWidth: '560px', background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '12px', color: 'var(--text,#e8eaf6)', boxShadow: '0 24px 70px rgba(0,0,0,.45)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 18px', borderBottom: '1px solid var(--border,#1f2640)' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>Importar TXT/CSV</div>
                <div style={{ color: 'var(--muted,#6b7194)', fontSize: '12px', marginTop: '3px' }}>Converter arquivo em flashcards sem IA.</div>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportError(''); }} disabled={importBusy} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)', background: 'var(--surface2,#181d2e)', color: 'var(--text,#e8eaf6)', cursor: importBusy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ padding: '18px', display: 'grid', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '7px', fontSize: '12px', fontWeight: 700 }}>
                Arquivo
                <input
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  disabled={importBusy}
                  onChange={event => setImportFile(event.target.files?.[0] ?? null)}
                  style={{ width: '100%', border: '1px dashed var(--border,#1f2640)', borderRadius: '8px', padding: '12px', background: 'var(--surface2,#181d2e)', color: 'var(--text,#e8eaf6)', fontSize: '13px' }}
                />
                <span style={{ color: 'var(--muted,#6b7194)', fontSize: '11px', lineHeight: 1.5, fontWeight: 500 }}>
                  CSV: colunas pergunta/resposta. TXT: uma linha por card no formato pergunta;resposta, pergunta|resposta ou pergunta=&gt;resposta.
                </span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '7px', fontSize: '12px', fontWeight: 700 }}>
                  Disciplina
                  <input
                    value={importDisciplina}
                    disabled={importBusy}
                    onChange={event => setImportDisciplina(event.target.value)}
                    placeholder="Ex: Direito Administrativo"
                    style={{ minHeight: '40px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)', background: 'var(--surface2,#181d2e)', color: 'var(--text,#e8eaf6)', padding: '0 12px', fontSize: '13px' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: '7px', fontSize: '12px', fontWeight: 700 }}>
                  Tema
                  <input
                    value={importTema}
                    disabled={importBusy}
                    onChange={event => setImportTema(event.target.value)}
                    placeholder="Ex: Atos administrativos"
                    style={{ minHeight: '40px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)', background: 'var(--surface2,#181d2e)', color: 'var(--text,#e8eaf6)', padding: '0 12px', fontSize: '13px' }}
                  />
                </label>
              </div>

              {importError && (
                <div style={{ padding: '10px', borderRadius: '8px', background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444', fontSize: '12px' }}>
                  {importError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => { setShowImportModal(false); setImportError(''); }} disabled={importBusy} style={{ padding: '10px 18px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border,#1f2640)', color: 'var(--muted,#6b7194)', fontSize: '13px', cursor: importBusy ? 'default' : 'pointer' }}>Cancelar</button>
                <button onClick={handleImportFile} disabled={importBusy || !importFile || !importTema.trim()} style={{ padding: '10px 18px', borderRadius: '8px', background: importBusy || !importFile || !importTema.trim() ? 'var(--surface2,#181d2e)' : 'var(--accent,#6c63ff)', border: 'none', color: importBusy || !importFile || !importTema.trim() ? 'var(--muted,#6b7194)' : '#fff', fontSize: '13px', fontWeight: 600, cursor: importBusy || !importFile || !importTema.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {importBusy ? (
                    <>Processando...</>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                      Importar Flashcards
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR QUESTÕES */}
      {showImportQModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(3,5,12,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
          <div style={{ width: '100%', maxWidth: '560px', background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '12px', color: 'var(--text,#e8eaf6)', boxShadow: '0 24px 70px rgba(0,0,0,.45)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 18px', borderBottom: '1px solid var(--border,#1f2640)' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>Importar Questões</div>
                <div style={{ color: 'var(--muted,#6b7194)', fontSize: '12px', marginTop: '3px' }}>Converter arquivo em questões sem IA.</div>
              </div>
              <button onClick={() => { setShowImportQModal(false); setImportError(''); setImportFile(null); }} disabled={importBusy} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)', background: 'var(--surface2,#181d2e)', color: 'var(--text,#e8eaf6)', cursor: importBusy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ padding: '18px', display: 'grid', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '7px', fontSize: '12px', fontWeight: 700 }}>
                Arquivo
                <input
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  disabled={importBusy}
                  onChange={event => setImportFile(event.target.files?.[0] ?? null)}
                  style={{ width: '100%', border: '1px dashed var(--border,#1f2640)', borderRadius: '8px', padding: '12px', background: 'var(--surface2,#181d2e)', color: 'var(--text,#e8eaf6)', fontSize: '13px' }}
                />
                <span style={{ color: 'var(--muted,#6b7194)', fontSize: '11px', lineHeight: 1.5, fontWeight: 500 }}>
                  <b>Certo/Errado:</b> cv;comando;C ou cv;comando;E "explicação"<br/>
                  <b>Múltipla:</b> mc;comando;a;b;c;d;e;gabarito "explicação" (gabarito: a-e)
                </span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '7px', fontSize: '12px', fontWeight: 700 }}>
                  Disciplina
                  <input
                    value={importDisciplina}
                    disabled={importBusy}
                    onChange={event => setImportDisciplina(event.target.value)}
                    placeholder="Ex: Direito Administrativo"
                    style={{ minHeight: '40px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)', background: 'var(--surface2,#181d2e)', color: 'var(--text,#e8eaf6)', padding: '0 12px', fontSize: '13px' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: '7px', fontSize: '12px', fontWeight: 700 }}>
                  Tema
                  <input
                    value={importTema}
                    disabled={importBusy}
                    onChange={event => setImportTema(event.target.value)}
                    placeholder="Ex: Atos administrativos"
                    style={{ minHeight: '40px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)', background: 'var(--surface2,#181d2e)', color: 'var(--text,#e8eaf6)', padding: '0 12px', fontSize: '13px' }}
                  />
                </label>
              </div>

              {importError && (
                <div style={{ padding: '10px', borderRadius: '8px', background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444', fontSize: '12px' }}>
                  {importError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => { setShowImportQModal(false); setImportError(''); setImportFile(null); }} disabled={importBusy} style={{ padding: '10px 18px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border,#1f2640)', color: 'var(--muted,#6b7194)', fontSize: '13px', cursor: importBusy ? 'default' : 'pointer' }}>Cancelar</button>
                <button onClick={handleImportFile} disabled={importBusy || !importFile || !importTema.trim()} style={{ padding: '10px 18px', borderRadius: '8px', background: importBusy || !importFile || !importTema.trim() ? 'var(--surface2,#181d2e)' : 'var(--accent,#6c63ff)', border: 'none', color: importBusy || !importFile || !importTema.trim() ? 'var(--muted,#6b7194)' : '#fff', fontSize: '13px', fontWeight: 600, cursor: importBusy || !importFile || !importTema.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {importBusy ? (
                    <>Processando...</>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                      Importar Questões
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

{/* MODAL QUESTÃO MANUAL — Janela Flutuante */}
      {showManualQModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => { setShowManualQModal(false); setEditingQId(null) }} />
          <div style={{ position: 'relative', background: 'var(--surface,#111420)', borderRadius: '16px', border: '1px solid var(--border,#1f2640)', width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            {/* Header da janela */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border,#1f2640)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2,#181d2e)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text,#e8eaf6)' }}>
                  {editingQId ? 'Editar Questão' : 'Nova Questão'}
                </div>
              </div>
              <button onClick={() => { setShowManualQModal(false); setEditingQId(null) }} style={{ background: 'transparent', border: 'none', color: 'var(--muted,#6b7194)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseOver={e => e.currentTarget.style.background = 'var(--surface,#111420)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Corpo do formulário */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Tipo de questão */}
              <div>
                <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Tipo de Questão</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', border: `2px solid ${manualQTipo === 'cv' ? '#f59e0b' : 'var(--border,#1f2640)'}`, background: manualQTipo === 'cv' ? 'rgba(245,158,11,.1)' : 'var(--surface2,#181d2e)', cursor: 'pointer', transition: 'all .15s' }}>
                    <input type="radio" checked={manualQTipo === 'cv'} onChange={() => setManualQTipo('cv')} style={{ display: 'none' }} />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={manualQTipo === 'cv' ? '#f59e0b' : 'var(--muted,#6b7194)'} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: manualQTipo === 'cv' ? '#f59e0b' : 'var(--muted,#6b7194)' }}>Certo / Errado</span>
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', border: `2px solid ${manualQTipo === 'mc' ? '#f59e0b' : 'var(--border,#1f2640)'}`, background: manualQTipo === 'mc' ? 'rgba(245,158,11,.1)' : 'var(--surface2,#181d2e)', cursor: 'pointer', transition: 'all .15s' }}>
                    <input type="radio" checked={manualQTipo === 'mc'} onChange={() => setManualQTipo('mc')} style={{ display: 'none' }} />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={manualQTipo === 'mc' ? '#f59e0b' : 'var(--muted,#6b7194)'} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: manualQTipo === 'mc' ? '#f59e0b' : 'var(--muted,#6b7194)' }}>Múltipla Escolha</span>
                  </label>
                </div>
              </div>

              {/* Enunciado */}
              <div>
                <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Enunciado da Questão</div>
                <textarea value={manualQQuestion} onChange={e => setManualQQuestion(e.target.value)} style={{ width: '100%', height: '100px', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '10px', padding: '12px', color: 'var(--text,#e8eaf6)', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} placeholder="Digite a pergunta aqui..." />
              </div>

              {/* Gabarito ou Opções */}
              {manualQTipo === 'cv' ? (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Gabarito</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setManualQGabarito('C')} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: `2px solid ${manualQGabarito === 'C' ? '#10b981' : 'var(--border,#1f2640)'}`, background: manualQGabarito === 'C' ? 'rgba(16,185,129,.15)' : 'var(--surface2,#181d2e)', color: manualQGabarito === 'C' ? '#10b981' : 'var(--muted,#6b7194)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}>✓ CERTO</button>
                    <button onClick={() => setManualQGabarito('E')} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: `2px solid ${manualQGabarito === 'E' ? '#ef4444' : 'var(--border,#1f2640)'}`, background: manualQGabarito === 'E' ? 'rgba(239,68,68,.15)' : 'var(--surface2,#181d2e)', color: manualQGabarito === 'E' ? '#ef4444' : 'var(--muted,#6b7194)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}>✕ ERRADO</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Opções — Marque a correta</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {manualQOptions.map((opt, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => setManualQCorrect(idx)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: `2px solid ${manualQCorrect === idx ? '#10b981' : 'var(--border,#1f2640)'}`, background: manualQCorrect === idx ? '#10b981' : 'var(--surface2,#181d2e)', color: manualQCorrect === idx ? '#fff' : 'var(--muted,#6b7194)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                          {['A','B','C','D','E'][idx]}
                        </button>
                        <input value={opt} onChange={e => {
                          const newOpts = [...manualQOptions]; newOpts[idx] = e.target.value; setManualQOptions(newOpts)
                        }} style={{ flex: 1, padding: '10px 12px', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '8px', color: 'var(--text,#e8eaf6)', fontSize: '13px', outline: 'none' }} placeholder={`Opção ${['A','B','C','D','E'][idx]}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explicação */}
              <div>
                <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Explicação / Resolução (Opcional)</div>
                <textarea value={manualQExpl} onChange={e => setManualQExpl(e.target.value)} style={{ width: '100%', height: '80px', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '10px', padding: '12px', color: 'var(--text,#e8eaf6)', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} placeholder="Por que esta é a resposta correta?" />
              </div>
            </div>

            {/* Rodapé */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border,#1f2640)', display: 'flex', gap: '10px', justifyContent: 'flex-end', background: 'var(--surface2,#181d2e)' }}>
              <button onClick={() => { setShowManualQModal(false); setEditingQId(null) }} style={{ padding: '10px 18px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border,#1f2640)', color: 'var(--muted,#6b7194)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSaveManualQ} disabled={isSavingManual || !manualQQuestion.trim()} style={{ padding: '10px 24px', borderRadius: '10px', background: 'var(--accent,#6c63ff)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: isSavingManual ? 'default' : 'pointer', opacity: (isSavingManual || !manualQQuestion.trim()) ? 0.6 : 1, boxShadow: '0 4px 12px rgba(108,99,255,.3)' }}>{editingQId ? 'Atualizar' : 'Salvar Questão'}</button>
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
              {!isSelectionMode && (
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
                    disabled={!card.id}
                    style={{ background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '6px', width: '26px', height: '26px', cursor: !card.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: !card.id ? 'var(--border,#1f2640)' : 'var(--muted,#6b7194)', transition: 'all .15s', opacity: !card.id ? 0.4 : 1 }}
                    onMouseOver={e => card.id && (e.currentTarget.style.color = '#ef4444')}
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
            {!isSelectionMode && (
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
                  onClick={(e) => { e.stopPropagation(); if(confirm('Excluir esta questão?')) onDelete(q.id!) }}
                  title="Excluir Questão"
                  disabled={!q.id}
                  style={{ background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', borderRadius: '6px', width: '28px', height: '28px', cursor: !q.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: !q.id ? 'var(--border,#1f2640)' : 'var(--muted,#6b7194)', transition: 'all .15s', opacity: !q.id ? 0.4 : 1 }}
                  onMouseOver={e => q.id && (e.currentTarget.style.color = '#ef4444')}
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
