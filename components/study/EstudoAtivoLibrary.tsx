'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Play, Square, Timer, Clock, ChevronRight, RotateCcw, AlertCircle, Maximize2, LayoutGrid, Smartphone, X, ChevronLeft } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface Flashcard {
  id: string
  front: string
  back: string
  topic: string | null
  materia: string | null
  session_id: string | null
  difficulty?: number | null
}

interface Question {
  id: string
  question: string
  tipo: 'cv' | 'mc'
  options: string[] | null
  correct: number | null
  gabarito: string | null
  explanation: string | null
  banca: string | null
  topic: string | null
  materia: string | null
  session_id: string | null
}

interface TopicGroup {
  topic: string
  flashcards: Flashcard[]
  questions: Question[]
}

interface DisciplinaGroup {
  disciplina: string
  topics: TopicGroup[]
  totalFlashcards: number
  totalQuestions: number
}

interface Props {
  flashcards: Flashcard[]
  questions: Question[]
}

// ─── Helpers ─────────────────────────────────────────────────

function groupData(flashcards: Flashcard[], questions: Question[]): DisciplinaGroup[] {
  const map = new Map<string, Map<string, TopicGroup>>()

  const getDisc = (materia: string | null) => materia?.trim() || 'Sem disciplina'
  const getTopic = (topic: string | null) => topic?.trim() || 'Sem tema'

  for (const fc of flashcards) {
    const disc  = getDisc(fc.materia)
    const topic = getTopic(fc.topic)
    if (!map.has(disc)) map.set(disc, new Map())
    const topicMap = map.get(disc)!
    if (!topicMap.has(topic)) topicMap.set(topic, { topic, flashcards: [], questions: [] })
    topicMap.get(topic)!.flashcards.push(fc)
  }

  for (const q of questions) {
    const disc  = getDisc(q.materia)
    const topic = getTopic(q.topic)
    if (!map.has(disc)) map.set(disc, new Map())
    const topicMap = map.get(disc)!
    if (!topicMap.has(topic)) topicMap.set(topic, { topic, flashcards: [], questions: [] })
    topicMap.get(topic)!.questions.push(q)
  }

  return Array.from(map.entries()).map(([disciplina, topicMap]) => {
    const topics = Array.from(topicMap.values())
    return {
      disciplina,
      topics,
      totalFlashcards: topics.reduce((s, t) => s + t.flashcards.length, 0),
      totalQuestions:  topics.reduce((s, t) => s + t.questions.length, 0),
    }
  }).sort((a, b) => a.disciplina.localeCompare(b.disciplina))
}

// ─── Main Component ──────────────────────────────────────────

export default function EstudoAtivoLibrary({ flashcards, questions }: Props) {
  const groups = groupData(flashcards, questions)

  const [selectedDisc,  setSelectedDisc]  = useState<string | null>(groups[0]?.disciplina ?? null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [activeTab,     setActiveTab]     = useState<'flashcards' | 'questoes'>('flashcards')
  const [isDeleting,    setIsDeleting]    = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [timerMode,    setTimerMode]     = useState<'chrono' | 'timer'>('chrono')
  const [seconds,      setSeconds]       = useState(0)
  const [timerInput,   setTimerInput]    = useState(20) // Default 20 mins
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  
  // Auto-hide on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) setIsSidebarOpen(false)
  }, [])

  // Focus Mode States
  const [showFocusMode, setShowFocusMode] = useState(false)
  const [fcLayout, setFcLayout] = useState<'grid' | 'single'>('single')
  const [sessionQueue, setSessionQueue] = useState<string[]>([])
  const [cardSchedules, setCardSchedules] = useState<Record<string, number>>({})
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [liveDifficulties, setLiveDifficulties] = useState<Record<string, number>>({})

  const router = useRouter()

  const discGroup   = groups.find(g => g.disciplina === selectedDisc) ?? null
  const topicGroup  = discGroup?.topics.find(t => t.topic === selectedTopic) ?? null

  // Lógica do Timer
  useEffect(() => {
    let interval: any
    if (sessionActive) {
      interval = setInterval(() => {
        setSeconds(s => {
          if (timerMode === 'timer') {
            if (s <= 0) {
              setSessionActive(false)
              alert("Tempo esgotado!")
              return 0
            }
            return s - 1
          }
          return s + 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [sessionActive, timerMode])

  // Keyboard navigation for focus mode
  useEffect(() => {
    if (!showFocusMode || activeTab !== 'flashcards' || fcLayout !== 'single' || !topicGroup) return
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const nextId = getNextBestCard()
        if (nextId) setActiveCardId(nextId)
      }
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [showFocusMode, fcLayout, activeTab, topicGroup, sessionQueue, cardSchedules])

  // Initialize/Reset session queue and difficulties when topic changes or focus mode starts
  useEffect(() => {
    if (topicGroup) {
      const ids = topicGroup.flashcards.map(c => c.id)
      const initialDiffs: Record<string, number> = {}
      topicGroup.flashcards.forEach(c => { if (c.difficulty) initialDiffs[c.id] = c.difficulty })
      
      setLiveDifficulties(initialDiffs)
      
      if (showFocusMode) {
        setSessionQueue(ids)
        setCardSchedules({})
        setActiveCardId(ids[0] || null)
      }
    }
  }, [showFocusMode, selectedTopic, topicGroup?.flashcards.length])

  const getNextBestCard = (customQueue?: string[], customSchedules?: Record<string, number>, excludeId?: string) => {
    const queue = customQueue || sessionQueue
    const schedules = customSchedules || cardSchedules
    
    if (queue.length === 0) return null
    const now = Date.now()
    
    const available = queue.filter(id => !schedules[id] || now >= schedules[id])
    
    if (available.length > 0) {
      const getPrio = (id: string) => liveDifficulties[id] || 0
      const sorted = [...available].sort((a, b) => getPrio(b) - getPrio(a))
      if (sorted.length > 1 && excludeId) return sorted[0] === excludeId ? sorted[1] : sorted[0]
      return sorted[0]
    }
    
    const nextToReady = [...queue].sort((a, b) => (schedules[a] || 0) - (schedules[b] || 0))
    return nextToReady[0]
  }

  const handleRate = (cardId: string, level: number) => {
    const now = Date.now()
    const newSchedules = { ...cardSchedules }
    let newQueue = [...sessionQueue]
    
    // Atualizar estado de dificuldades local imediatamente para feedback visual
    setLiveDifficulties(prev => ({ ...prev, [cardId]: level }))

    if (level === 1) { // FÁCIL: Retirar da fila
      newQueue = newQueue.filter(id => id !== cardId)
      setSessionQueue(newQueue)
    } else if (level === 2) { // REGULAR: 10 min
      newSchedules[cardId] = now + 10 * 60 * 1000
      setCardSchedules(newSchedules)
    } else if (level === 3) { // DIFÍCIL: 1 min
      newSchedules[cardId] = now + 1 * 60 * 1000
      setCardSchedules(newSchedules)
    }
    
    // Pular para o próximo automaticamente usando os novos estados calculados
    setTimeout(() => {
      const nextId = getNextBestCard(newQueue, newSchedules, cardId)
      setActiveCardId(nextId)
    }, 450)

    // Update DB as síncrono
    const supabase = createClient()
    supabase.from('flashcards').update({ difficulty: level }).eq('id', cardId).then()
  }

  const startSession = () => {
    if (timerMode === 'timer') {
      setSeconds(timerInput * 60)
    } else {
      setSeconds(0)
    }
    setSessionActive(true)
  }

  const endSession = async () => {
    if (!confirm("Deseja encerrar esta sessão e registrar o tempo nas estatísticas?")) return
    setSessionActive(false)
    
    // Calcular minutos decorridos
    let finalSeconds = seconds
    if (timerMode === 'timer') {
      finalSeconds = (timerInput * 60) - seconds
    }
    const mins = Math.max(1, Math.round(finalSeconds / 60))

    // Tentar encontrar uma session_id para o tópico atual
    const firstItem = topicGroup?.flashcards[0] || topicGroup?.questions[0]
    if (firstItem?.session_id) {
      const supabase = createClient()
      // Pegar duração atual
      const { data: sess } = await supabase.from('study_sessions').select('duration_min').eq('id', firstItem.session_id).single()
      const currentMin = sess?.duration_min || 0
      
      await supabase.from('study_sessions')
        .update({ duration_min: currentMin + mins })
        .eq('id', firstItem.session_id)
      
      alert(`Sessão encerrada! +${mins} min registrados nas estatísticas.`)
    } else {
      alert("Sessão encerrada. (Não foi possível vincular a uma matéria específica para salvar o tempo).")
    }
    setSeconds(0)
  }

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }


  // Auto-select first topic when discipline changes
  const handleSelectDisc = (disc: string) => {
    setSelectedDisc(disc)
    const g = groups.find(d => d.disciplina === disc)
    setSelectedTopic(g?.topics[0]?.topic ?? null)
    setActiveTab('flashcards')
  }

  const handleDeleteDisc = async (e: React.MouseEvent, g: DisciplinaGroup) => {
    e.stopPropagation()
    if (!confirm(`Tem certeza que deseja apagar a disciplina "${g.disciplina}" e todo o seu conteúdo de Estudo Ativo?`)) return
    
    setIsDeleting(true)
    try {
      const fcIds = g.topics.flatMap(t => t.flashcards).map(c => c.id)
      const qIds = g.topics.flatMap(t => t.questions).map(q => q.id)
      
      const supabase = createClient()
      if (fcIds.length > 0) {
        // chunk to prevent url length issues
        for (let i = 0; i < fcIds.length; i += 100) {
          await supabase.from('flashcards').delete().in('id', fcIds.slice(i, i + 100))
        }
      }
      if (qIds.length > 0) {
        for (let i = 0; i < qIds.length; i += 100) {
          await supabase.from('questions').delete().in('id', qIds.slice(i, i + 100))
        }
      }
      
      if (selectedDisc === g.disciplina) {
        setSelectedDisc(null)
        setSelectedTopic(null)
      }
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteTopic = async (e: React.MouseEvent, t: TopicGroup, discName: string) => {
    e.stopPropagation()
    if (!confirm(`Tem certeza que deseja apagar o tema "${t.topic}" e todo o seu conteúdo?`)) return
    
    setIsDeleting(true)
    try {
      const fcIds = t.flashcards.map(c => c.id)
      const qIds = t.questions.map(q => q.id)
      
      const supabase = createClient()
      if (fcIds.length > 0) await supabase.from('flashcards').delete().in('id', fcIds)
      if (qIds.length > 0) await supabase.from('questions').delete().in('id', qIds)
      
      if (selectedTopic === t.topic && selectedDisc === discName) {
        setSelectedTopic(null)
      }
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  if (groups.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px', color: 'var(--muted,#6b7194)', padding: '40px', background: 'var(--bg,#0a0c12)' }}>
        <div style={{ fontSize: '40px', opacity: .25 }}>🎓</div>
        <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text,#e8eaf6)' }}>Nenhum conteúdo salvo ainda</div>
        <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '360px', lineHeight: 1.7 }}>
          Gere flashcards e questões na página <strong>Busca + IA</strong> e eles aparecerão aqui organizados por disciplina e tema.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', background: 'var(--bg,#0a0c12)', opacity: isDeleting ? 0.6 : 1, pointerEvents: isDeleting ? 'none' : 'auto' }}>

      {/* ── Painel esquerdo: disciplinas e temas ── */}
      <div style={{
        width: isSidebarOpen ? '240px' : '0px', 
        opacity: isSidebarOpen ? 1 : 0,
        flexShrink: 0,
        background: 'var(--surface,#111420)', 
        borderRight: isSidebarOpen ? '1px solid var(--border,#1f2640)' : 'none',
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        transition: 'width 0.25s ease, opacity 0.2s ease',
        position: 'relative'
      }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border,#1f2640)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--muted,#6b7194)', fontWeight: 600 }}>
            Estudo Ativo
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginTop: '4px' }}>
            {flashcards.length} flashcard{flashcards.length !== 1 ? 's' : ''} · {questions.length} questão(ões)
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {groups.map(g => (
            <div key={g.disciplina} style={{ marginBottom: '4px' }}>
              {/* Disciplina header */}
              <button
                onClick={() => handleSelectDisc(g.disciplina)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px',
                  borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: selectedDisc === g.disciplina ? 'rgba(108,99,255,.15)' : 'transparent',
                  color:      selectedDisc === g.disciplina ? 'var(--accent,#6c63ff)' : 'var(--text,#e8eaf6)',
                  borderLeft: selectedDisc === g.disciplina ? '2px solid var(--accent,#6c63ff)' : '2px solid transparent',
                  transition: 'all .12s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
                }}
              >
                  <span style={{ fontSize: '12px', fontWeight: 600, flex: 1, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {g.disciplina}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '10px', padding: '1px 6px', borderRadius: '8px', flexShrink: 0,
                      background: selectedDisc === g.disciplina ? 'rgba(108,99,255,.2)' : 'var(--surface2,#181d2e)',
                      color: selectedDisc === g.disciplina ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)',
                    }}>
                      {g.topics.length}
                    </span>
                    <button
                      onClick={(e) => handleDeleteDisc(e, g)}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--muted,#6b7194)', opacity: .7, transition: 'all .15s'
                      }}
                      title="Excluir disciplina e tudo nela"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </button>

              {/* Temas da disciplina selecionada */}
              {selectedDisc === g.disciplina && (
                <div style={{ marginLeft: '10px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {g.topics.map(t => (
                    <button
                      key={t.topic}
                      onClick={() => { setSelectedTopic(t.topic); setActiveTab('flashcards') }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '6px 10px',
                        borderRadius: '6px', border: 'none', cursor: 'pointer',
                        background: selectedTopic === t.topic ? 'rgba(108,99,255,.1)' : 'transparent',
                        color:      selectedTopic === t.topic ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)',
                        fontSize: '12px', lineHeight: 1.4, transition: 'all .1s',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px',
                      }}
                    >
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.topic}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', flexShrink: 0, opacity: .7 }}>
                        </span>
                        <button
                          onClick={(e) => handleDeleteTopic(e, t, g.disciplina)}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: selectedTopic === t.topic ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)', opacity: .7, transition: 'all .15s'
                          }}
                          title="Excluir tema e questões/flashcards dele"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Painel direito: conteúdo do tema ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        
        {/* Toggle Button (when sidebar is closed) */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            style={{
              position: 'absolute', top: '15px', left: '15px', zIndex: 10,
              width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border,#1f2640)',
              background: 'var(--surface,#111420)', color: 'var(--accent,#6c63ff)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
            title="Abrir Menu"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {!topicGroup ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: 'var(--muted,#6b7194)' }}>
            <div style={{ fontSize: '32px', opacity: .25 }}>📚</div>
            <div style={{ fontSize: '14px', color: 'var(--text,#e8eaf6)' }}>Selecione um tema</div>
          </div>
        ) : (
          <>
            {/* Header do tema */}
            <div style={{ padding: '14px 20px 0', borderBottom: '1px solid var(--border,#1f2640)', background: 'var(--surface,#111420)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isSidebarOpen && (
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                      width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border,#1f2640)',
                      background: 'transparent', color: 'var(--muted,#6b7194)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="Recolher Menu"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--accent,#6c63ff)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
                    {selectedDisc}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text,#e8eaf6)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {topicGroup.topic}

                {/* Session Controller */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => { setShowFocusMode(true) }}
                    style={{
                      background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)',
                      color: 'var(--accent,#6c63ff)', borderRadius: '10px', padding: '6px 14px',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px', transition: 'all .15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(108,99,255,0.18)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(108,99,255,0.1)'}
                  >
                    <Maximize2 size={14} /> Foco Total
                  </button>

                  {!sessionActive ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface2,#181d2e)', padding: '4px 8px', borderRadius: '10px', border: '1px solid var(--border,#1f2640)' }}>
                      <select 
                        value={timerMode} 
                        onChange={e => setTimerMode(e.target.value as any)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '11px', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="chrono">Cronômetro</option>
                        <option value="timer">Temporizador</option>
                      </select>
                      {timerMode === 'timer' && (
                        <input 
                          type="number" 
                          value={timerInput} 
                          onChange={e => setTimerInput(Number(e.target.value))}
                          style={{ width: '40px', background: 'transparent', border: 'none', color: '#fff', fontSize: '11px', textAlign: 'center', fontWeight: 700, borderLeft: '1px solid var(--border)', marginLeft: '4px' }}
                          title="Minutos"
                        />
                      )}
                      <button 
                        onClick={startSession}
                        style={{ background: 'var(--accent,#6c63ff)', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Play size={12} fill="currentColor" /> Iniciar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface2,#181d2e)', padding: '5px 12px', borderRadius: '10px', border: '1px solid var(--accent,#6c63ff)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent,#6c63ff)' }}>
                        {timerMode === 'chrono' ? <Clock size={14} /> : <Timer size={14} />}
                        <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700 }}>{formatTime(seconds)}</span>
                      </div>
                      <button 
                        onClick={endSession}
                        style={{ background: 'var(--red,#ef4444)', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Square size={10} fill="currentColor" /> Encerrar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0' }}>
                {(['flashcards', 'questoes'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '7px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: '13px', fontWeight: activeTab === tab ? 600 : 400,
                      color:       activeTab === tab ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)',
                      borderBottom: activeTab === tab ? '2px solid var(--accent,#6c63ff)' : '2px solid transparent',
                      transition: 'all .12s',
                    }}
                  >
                    {tab === 'flashcards'
                      ? `Flashcards (${topicGroup.flashcards.length})`
                      : `Questões (${topicGroup.questions.length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {activeTab === 'flashcards' ? (
                <FlashcardsPanel 
                  cards={topicGroup.flashcards} 
                  externalDifficulties={liveDifficulties}
                  onRate={(id, level) => handleRate(id, level)}
                />
              ) : (
                <QuestoesPanel questions={topicGroup.questions} />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Focus Mode Overlay ── */}
      {showFocusMode && topicGroup && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'var(--bg,#0a0c12)', display: 'flex', flexDirection: 'column',
          color: 'var(--text,#e8eaf6)'
        }}>
          {/* Top Bar */}
          <div style={{
            height: '60px', padding: '0 24px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', borderBottom: '1px solid var(--border,#1f2640)',
            background: 'var(--surface,#111420)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text,#e8eaf6)' }}>{topicGroup.topic}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px' }}>{selectedDisc}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {activeTab === 'flashcards' && (
                <div style={{ display: 'flex', background: 'var(--surface2,#181d2e)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border,#1f2640)' }}>
                  <button
                    onClick={() => setFcLayout('grid')}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      background: fcLayout === 'grid' ? '#6c63ff' : 'transparent',
                      color: fcLayout === 'grid' ? '#fff' : '#6b7194',
                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600
                    }}
                  >
                    <LayoutGrid size={14} /> Ver Todos
                  </button>
                  <button
                    onClick={() => setFcLayout('single')}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      background: fcLayout === 'single' ? '#6c63ff' : 'transparent',
                      color: fcLayout === 'single' ? '#fff' : '#6b7194',
                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600
                    }}
                  >
                    <Smartphone size={14} /> Um por Vez
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowFocusMode(false)}
                style={{
                  background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', color: 'var(--text,#e8eaf6)', borderRadius: '8px',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all .15s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--border,#1f2640)'}
                onMouseOut={e => e.currentTarget.style.background = 'var(--surface2,#181d2e)'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: fcLayout === 'grid' || activeTab === 'questoes' ? '1200px' : '820px' }}>
              {activeTab === 'flashcards' ? (
                fcLayout === 'grid' ? (
                  <FlashcardsPanel 
                    cards={topicGroup.flashcards} 
                    externalDifficulties={liveDifficulties}
                    onRate={(id, level) => handleRate(id, level)} 
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', margin: '0 auto', maxWidth: '800px' }}>
                    <div style={{ width: '100%' }}>
                      {activeCardId ? (
                        <FlashcardsPanel 
                          cards={[topicGroup.flashcards.find(c => c.id === activeCardId)!]} 
                          externalDifficulties={liveDifficulties}
                          isLarge={true} 
                          onRate={(id, level) => handleRate(id, level)}
                        />
                      ) : (
                        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--surface,#111420)', borderRadius: '16px', border: '1px solid var(--border,#1f2640)' }}>
                          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎉</div>
                          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text,#e8eaf6)' }}>Parabéns!</div>
                          <div style={{ fontSize: '14px', color: 'var(--muted,#6b7194)', marginTop: '8px' }}>
                            Você revisou todos os cards marcados como fáceis nesta sessão. 
                            {sessionQueue.length > 0 ? ' Os restantes estão em intervalo.' : ''}
                          </div>
                          <button onClick={() => setShowFocusMode(false)} style={{ marginTop: '24px', padding: '10px 24px', borderRadius: '8px', background: '#6c63ff', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                            Sair do Foco
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Carousel Controls */}
                    {activeCardId && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button
                          onClick={() => {
                            const nextId = getNextBestCard(undefined, undefined, activeCardId)
                            if (nextId) setActiveCardId(nextId)
                          }}
                          style={{
                            width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--border,#1f2640)',
                            background: 'var(--surface,#111420)', color: 'var(--text,#e8eaf6)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                          title="Pular Card"
                        >
                          <RotateCcw size={20} />
                        </button>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted,#6b7194)', minWidth: '120px', textAlign: 'center' }}>
                          Restantes: {sessionQueue.length}
                        </div>
                        <button
                          onClick={() => {
                            const nextId = getNextBestCard(undefined, undefined, activeCardId)
                            if (nextId) setActiveCardId(nextId)
                          }}
                          style={{
                            width: '44px', height: '44px', borderRadius: '50%', border: '1px solid #1f2640',
                            background: '#111420', color: '#fff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                          title="Próximo"
                        >
                          <ChevronRight size={24} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <QuestoesPanel questions={topicGroup.questions} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Flashcards Panel ────────────────────────────────────────

function FlashcardsPanel({ cards, isLarge = false, onRate, externalDifficulties }: { cards: Flashcard[], isLarge?: boolean, onRate?: (id: string, level: number) => void, externalDifficulties?: Record<string, number> }) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({})
  const [internalDifficulties, setInternalDifficulties] = useState<Record<string, number>>({})

  // Merge internal and external difficulties
  const difficulties = externalDifficulties || internalDifficulties

  useEffect(() => {
    if (!externalDifficulties) {
      const initial: Record<string, number> = {}
      cards.forEach(c => { if (c.difficulty) initial[c.id] = c.difficulty })
      setInternalDifficulties(initial)
    }
    setFlipped({})
  }, [cards, externalDifficulties])

  const handleDifficulty = async (cardId: string, level: number) => {
    if (!externalDifficulties) {
      setInternalDifficulties(prev => ({ ...prev, [cardId]: level }))
    }
    
    // Update DB
    const supabase = createClient()
    await supabase.from('flashcards').update({ difficulty: level }).eq('id', cardId)
    
    // Call callback if exists
    if (onRate) onRate(cardId, level)

    // Flip back
    setFlipped(prev => ({ ...prev, [cardId]: false }))
  }

  if (cards.length === 0) {
    return (
      <div style={{ color: 'var(--muted,#6b7194)', fontSize: '13px', padding: '20px 0' }}>
        Nenhum flashcard gerado para este tema ainda.
      </div>
    )
  }

  return (
    <div>
      <style>{`
        .scene {
          perspective: 1000px;
        }
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
          min-height: ${isLarge ? '380px' : '160px'};
          cursor: pointer;
        }
        .card-flipped {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border: 1px solid var(--border,#1f2640);
        }
        .card-back {
          transform: rotateY(180deg);
          box-shadow: inset 0 0 40px rgba(0,0,0,0.2);
        }
      `}</style>

      <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginBottom: '16px' }}>
        {cards.length} flashcard{cards.length !== 1 ? 's' : ''} — clique para virar e avaliar
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isLarge ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {cards.map((card) => {
          const isFlipped = !!flipped[card.id]
          const diff = difficulties[card.id] || 0
          
          let bg = 'var(--surface,#111420)'
          let dotColor = 'var(--accent,#6c63ff)'
          if (diff === 1) { bg = 'rgba(16,185,129,0.1)'; dotColor = '#10b981' }
          if (diff === 2) { bg = 'rgba(245,158,11,0.1)'; dotColor = '#f59e0b' }
          if (diff === 3) { bg = 'rgba(239,68,68,0.1)';   dotColor = '#ef4444' }

          return (
            <div key={card.id} className="scene" style={{ height: isLarge ? '380px' : '160px' }}>
              <div 
                className={`card-inner ${isFlipped ? 'card-flipped' : ''}`}
                onClick={() => !isFlipped && setFlipped(f => ({ ...f, [card.id]: true }))}
              >
                {/* FRONT */}
                <div className="card-front" style={{ background: bg, borderColor: diff > 0 ? dotColor : 'var(--border,#1f2640)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontSize: isLarge ? '13px' : '10px', color: dotColor, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                      Frente
                    </div>
                    {diff > 0 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor }} />}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isLarge ? '0 30px' : '0' }}>
                    <div style={{ fontSize: isLarge ? '24px' : '14px', color: 'var(--text,#e8eaf6)', lineHeight: 1.6, fontWeight: 600 }}>
                      {card.front}
                    </div>
                  </div>
                  {!isFlipped && (
                    <div style={{ fontSize: '9px', color: 'var(--muted,#6b7194)', marginTop: '8px', textTransform: 'uppercase' }}>
                      Clique para ver resposta
                    </div>
                  )}
                </div>

                {/* BACK */}
                <div className="card-back" style={{ background: 'var(--surface2,#181d2e)', borderColor: 'var(--accent2,#00d4aa)' }}>
                  <div style={{ fontSize: isLarge ? '13px' : '10px', color: 'var(--accent2,#00d4aa)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 700 }}>
                    Resposta
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: isLarge ? '10px 30px' : '4px 0' }}>
                    <div style={{ fontSize: isLarge ? '20px' : '13px', color: 'var(--text,#e8eaf6)', lineHeight: 1.6 }}>
                      {card.back}
                    </div>
                  </div>
                  
                  {/* Difficulty Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }} onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => handleDifficulty(card.id, 3)}
                      style={{ flex: 1, padding: isLarge ? '12px' : '6px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontSize: isLarge ? '12px' : '9px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      DIFÍCIL
                    </button>
                    <button 
                      onClick={() => handleDifficulty(card.id, 2)}
                      style={{ flex: 1, padding: isLarge ? '12px' : '6px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: '#fff', fontSize: isLarge ? '12px' : '9px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      REGULAR
                    </button>
                    <button 
                      onClick={() => handleDifficulty(card.id, 1)}
                      style={{ flex: 1, padding: isLarge ? '12px' : '6px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontSize: isLarge ? '12px' : '9px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      FÁCIL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Questões Panel ──────────────────────────────────────────

function QuestoesPanel({ questions }: { questions: Question[] }) {
  const [answers,  setAnswers]  = useState<Record<string, string | number>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [showGab,  setShowGab]  = useState(false)

  if (questions.length === 0) {
    return (
      <div style={{ color: 'var(--muted,#6b7194)', fontSize: '13px', padding: '20px 0' }}>
        Nenhuma questão gerada para este tema ainda.
      </div>
    )
  }

  const totalResp  = Object.keys(revealed).length
  const totalCertas = Object.entries(revealed).filter(([id]) => {
    const q = questions.find(q => q.id === id)
    if (!q) return false
    return q.tipo === 'cv' ? answers[id] === q.gabarito : answers[id] === q.correct
  }).length
  const pct = totalResp > 0 ? Math.round(totalCertas / totalResp * 100) : 0
  const pctColor = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ maxWidth: '760px' }}>

      {/* Placar */}
      {totalResp > 0 && (
        <div style={{
          background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)',
          borderRadius: '12px', padding: '14px 18px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: pctColor, minWidth: '56px' }}>{pct}%</div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)', fontWeight: 500 }}>
              {totalCertas} de {totalResp} corretas
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', marginTop: '2px' }}>
              {questions.length - totalResp > 0
                ? `${questions.length - totalResp} ainda não respondida(s)`
                : 'Todas respondidas!'}
            </div>
          </div>
        </div>
      )}

      {/* Lista de questões */}
      {questions.map((q) => {
        const answered  = answers[q.id] !== undefined
        const rev       = revealed[q.id]
        const isCorrect = q.tipo === 'cv'
          ? answers[q.id] === q.gabarito
          : answers[q.id] === q.correct

        return (
          <div key={q.id} style={{
            background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)',
            borderRadius: '12px', padding: '18px', marginBottom: '14px',
          }}>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '10px', padding: '2px 7px', borderRadius: '4px', fontWeight: 600,
                  background: q.tipo === 'cv' ? 'rgba(245,158,11,.12)' : 'rgba(108,99,255,.12)',
                  color: q.tipo === 'cv' ? '#f59e0b' : 'var(--accent,#6c63ff)',
                }}>
                  {q.tipo === 'cv' ? 'CERTO / ERRADO' : 'MÚLTIPLA ESCOLHA'}
                </span>
              </div>
              {q.banca && <span style={{ fontSize: '10px', color: 'var(--muted,#6b7194)' }}>{q.banca}</span>}
            </div>

            {/* Enunciado */}
            <div style={{ fontSize: '14px', color: 'var(--text,#e8eaf6)', lineHeight: 1.75, marginBottom: '16px', fontWeight: 500 }}>
              {q.question}
            </div>

            {/* Opções C/E */}
            {q.tipo === 'cv' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['C', 'E'] as const).map(opt => {
                  const selected = answers[q.id] === opt
                  const isRight  = opt === q.gabarito
                  let bg = 'var(--surface2,#181d2e)', brd = 'var(--border,#1f2640)', clr = 'var(--muted,#6b7194)'
                  if (rev) {
                    if (isRight)           { bg = 'rgba(16,185,129,.12)'; brd = '#10b981'; clr = '#34d399' }
                    else if (selected)     { bg = 'rgba(239,68,68,.1)';   brd = '#ef4444'; clr = '#f87171' }
                  } else if (selected) {
                    bg = 'rgba(108,99,255,.12)'; brd = 'var(--accent,#6c63ff)'; clr = 'var(--accent,#6c63ff)'
                  }
                  return (
                    <button key={opt}
                      onClick={() => !rev && setAnswers(a => ({ ...a, [q.id]: opt }))}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {(q.options ?? []).map((opt, oi) => {
                  const selected = answers[q.id] === oi
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
                      onClick={() => !rev && setAnswers(a => ({ ...a, [q.id]: oi }))}
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
                        {['A', 'B', 'C', 'D', 'E'][oi]}
                      </div>
                      <div style={{ fontSize: '13px', color: clr, lineHeight: 1.6, paddingTop: '2px' }}>{opt}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Confirmar / Feedback */}
            {!rev ? (
              <button
                onClick={() => answered && setRevealed(r => ({ ...r, [q.id]: true }))}
                disabled={!answered}
                style={{
                  marginTop: '14px', width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
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
                <div style={{ fontSize: '12px', color: 'var(--text,#e8eaf6)', lineHeight: 1.65 }}>
                  {q.explanation}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Gabarito */}
      <div style={{ marginTop: '8px', paddingTop: '20px', borderTop: '1px solid var(--border,#1f2640)' }}>
        <button
          onClick={() => setShowGab(g => !g)}
          style={{
            width: '100%', padding: '11px', borderRadius: '10px', cursor: 'pointer',
            border: '1px solid var(--border,#1f2640)',
            background: showGab ? 'rgba(108,99,255,.12)' : 'transparent',
            color: showGab ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)',
            fontSize: '13px', fontWeight: 600, transition: 'all .15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 1.5v11M2 7h10" strokeLinecap="round"/>
          </svg>
          {showGab ? 'Ocultar Gabarito' : 'Ver Gabarito'}
        </button>

        {showGab && (
          <div style={{ marginTop: '16px', background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border,#1f2640)', fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Gabarito — {questions.length} questão(ões)
            </div>
            {questions.map((q, qi) => {
              const letraCorreta = q.tipo === 'cv'
                ? (q.gabarito === 'C' ? 'CERTO' : 'ERRADO')
                : `${['A', 'B', 'C', 'D', 'E'][q.correct ?? 0]}`
              const textoOpcao = q.tipo === 'mc' ? ` — ${q.options?.[q.correct ?? 0] ?? ''}` : ''
              return (
                <div key={q.id} style={{
                  padding: '12px 16px',
                  borderBottom: qi < questions.length - 1 ? '1px solid var(--border,#1f2640)' : 'none',
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                }}>
                  <div style={{ minWidth: '28px', fontSize: '11px', color: 'var(--accent,#6c63ff)', fontWeight: 700, paddingTop: '2px' }}>Q{qi + 1}</div>
                  <div style={{
                    fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap', marginTop: '1px',
                    background: q.tipo === 'cv' ? 'rgba(245,158,11,.12)' : 'rgba(108,99,255,.12)',
                    color: q.tipo === 'cv' ? '#f59e0b' : 'var(--accent,#6c63ff)',
                  }}>
                    {q.tipo === 'cv' ? 'C/E' : 'MC'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 700,
                      color: q.tipo === 'cv' ? (q.gabarito === 'C' ? '#34d399' : '#f87171') : '#34d399',
                    }}>
                      {letraCorreta}
                    </span>
                    {textoOpcao && <span style={{ fontSize: '12px', color: 'var(--text,#e8eaf6)' }}>{textoOpcao}</span>}
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
