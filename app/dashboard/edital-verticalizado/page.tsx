'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { EditalBoard, EditalTopic } from '@/types/database'

type StatusFilter = 'all' | 'pending' | 'in-progress' | 'done'

type ManualForm = {
  disciplina: string
  tema: string
  subtema: string
}

type ParsedResponse = {
  suggestedTitle: string
  items: Array<{ disciplina: string; tema: string; subtema: string }>
  extractionMode: string
  fileName: string
  provider: string
  model: string
  sourceExcerpt: string
}

const box: React.CSSProperties = {
  background: 'var(--surface,#111420)',
  border: '1px solid var(--border,#1f2640)',
  borderRadius: 18,
}

const buttonBase: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,.08)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'all .16s ease',
}

const inputBase: React.CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid var(--border,#1f2640)',
  background: 'var(--surface2,#181d2e)',
  color: 'var(--text,#e8eaf6)',
  padding: '11px 13px',
  fontSize: 14,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--muted,#6b7194)',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 7,
}

const emptyForm: ManualForm = {
  disciplina: '',
  tema: '',
  subtema: '',
}

function formatDateTime(value: string | null) {
  if (!value) return 'Ainda nao processado'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function createDefaultBoardTitle(length: number) {
  return `Edital ${length + 1}`
}

function toggleLabel(value: boolean, activeLabel: string, inactiveLabel: string) {
  return value ? activeLabel : inactiveLabel
}

export default function EditalVerticalizadoPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [boards, setBoards] = useState<EditalBoard[]>([])
  const [topicsByBoard, setTopicsByBoard] = useState<Record<string, EditalTopic[]>>({})
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingBoard, setSavingBoard] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dbError, setDbError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualForm, setManualForm] = useState<ManualForm>(emptyForm)
  const [savingManual, setSavingManual] = useState(false)
  const [expandedDisciplines, setExpandedDisciplines] = useState<Record<string, boolean>>({})
  const [titleDraft, setTitleDraft] = useState('')

  const activeBoard = boards.find(board => board.id === activeBoardId) ?? null
  const activeTopics = activeBoard ? topicsByBoard[activeBoard.id] ?? [] : []
  const missingTables = !!dbError && /edital_boards|edital_topics/i.test(dbError)

  useEffect(() => {
    void loadBoards()
  }, [])

  useEffect(() => {
    setTitleDraft(activeBoard?.title ?? '')
  }, [activeBoard?.id, activeBoard?.title])

  async function getAuthenticatedUser() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  }

  async function loadBoards() {
    setLoading(true)
    setDbError(null)

    const supabase = createClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      setDbError('Usuario nao autenticado.')
      setLoading(false)
      return
    }

    setUserId(user.id)

    const boardsRes = await supabase
      .from('edital_boards')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (boardsRes.error) {
      setDbError(boardsRes.error.message)
      setLoading(false)
      return
    }

    let nextBoards = (boardsRes.data ?? []) as EditalBoard[]

    if (!nextBoards.length) {
      const created = await createBoard(user.id, createDefaultBoardTitle(0), false, true)
      nextBoards = created ? [created] : []
    }

    const nextTopics: Record<string, EditalTopic[]> = {}

    if (nextBoards.length) {
      const topicsRes = await supabase
        .from('edital_topics')
        .select('*')
        .eq('user_id', user.id)
        .in('board_id', nextBoards.map(board => board.id))
        .order('disciplina', { ascending: true })
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true })

      if (topicsRes.error) {
        setDbError(topicsRes.error.message)
        setLoading(false)
        return
      }

      for (const topic of (topicsRes.data ?? []) as EditalTopic[]) {
        nextTopics[topic.board_id] = [...(nextTopics[topic.board_id] ?? []), topic]
      }
    }

    setBoards(nextBoards)
    setTopicsByBoard(nextTopics)
    setActiveBoardId(prev => (prev && nextBoards.some(board => board.id === prev) ? prev : nextBoards[0]?.id ?? null))
    setLoading(false)
  }

  async function createBoard(nextUserId?: string, customTitle?: string, switchTab = true, silent = false) {
    const supabase = createClient()
    const resolvedUserId = nextUserId ?? userId

    if (!resolvedUserId) {
      setDbError('Usuario nao autenticado.')
      return null
    }

    setSavingBoard(true)

    const { data, error } = await supabase
      .from('edital_boards')
      .insert({
        user_id: resolvedUserId,
        title: customTitle ?? createDefaultBoardTitle(boards.length),
      })
      .select('*')
      .single()

    setSavingBoard(false)

    if (error) {
      setDbError(error.message)
      return null
    }

    const board = data as EditalBoard
    setBoards(prev => [board, ...prev])
    setTopicsByBoard(prev => ({ ...prev, [board.id]: [] }))
    if (switchTab) setActiveBoardId(board.id)
    if (!silent) setNotice('Nova guia criada para outro edital.')
    return board
  }

  async function saveBoardTitle() {
    if (!activeBoard || !titleDraft.trim() || titleDraft.trim() === activeBoard.title) return

    const supabase = createClient()
    setSavingBoard(true)

    const { data, error } = await supabase
      .from('edital_boards')
      .update({ title: titleDraft.trim() })
      .eq('id', activeBoard.id)
      .select('*')
      .single()

    setSavingBoard(false)

    if (error) {
      setDbError(error.message)
      return
    }

    const saved = data as EditalBoard
    setBoards(prev => prev.map(board => (board.id === saved.id ? saved : board)))
    setNotice('Nome do edital atualizado.')
  }

  async function deleteCurrentBoard() {
    if (!activeBoard) return

    const confirmed = window.confirm(`Deseja excluir a guia "${activeBoard.title}"?`)
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase.from('edital_boards').delete().eq('id', activeBoard.id)

    if (error) {
      setDbError(error.message)
      return
    }

    const remainingBoards = boards.filter(board => board.id !== activeBoard.id)
    const nextTopics = { ...topicsByBoard }
    delete nextTopics[activeBoard.id]

    setBoards(remainingBoards)
    setTopicsByBoard(nextTopics)

    if (remainingBoards.length) {
      setActiveBoardId(remainingBoards[0].id)
      setNotice('Guia excluida.')
      return
    }

    const created = await createBoard(userId ?? undefined, createDefaultBoardTitle(0), true)
    if (created) setNotice('Guia excluida. Uma nova guia vazia foi criada.')
  }

  async function clearCurrentBoard() {
    if (!activeBoard) return
    if (!activeTopics.length) {
      setNotice('Nao ha itens para excluir nesta guia.')
      return
    }

    const confirmed = window.confirm(`Excluir todos os itens do edital "${activeBoard.title}"?`)
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase.from('edital_topics').delete().eq('board_id', activeBoard.id)

    if (error) {
      setDbError(error.message)
      return
    }

    const boardRes = await supabase
      .from('edital_boards')
      .update({
        source_file_name: null,
        source_file_type: null,
        source_excerpt: null,
        ai_provider: null,
        ai_model: null,
        last_processed_at: null,
      })
      .eq('id', activeBoard.id)
      .select('*')
      .single()

    if (boardRes.error) {
      setDbError(boardRes.error.message)
      return
    }

    setTopicsByBoard(prev => ({ ...prev, [activeBoard.id]: [] }))
    setBoards(prev => prev.map(board => (board.id === activeBoard.id ? (boardRes.data as EditalBoard) : board)))
    setNotice('Todos os itens do edital atual foram excluidos.')
  }

  async function deleteTopic(topicId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('edital_topics').delete().eq('id', topicId)

    if (error) {
      setDbError(error.message)
      return
    }

    if (!activeBoard) return

    setTopicsByBoard(prev => ({
      ...prev,
      [activeBoard.id]: (prev[activeBoard.id] ?? []).filter(topic => topic.id !== topicId),
    }))
  }

  async function toggleTopic(topic: EditalTopic, field: 'estudo' | 'resumo' | 'revisao' | 'concluido') {
    const supabase = createClient()
    const nextValue = !topic[field]

    setTopicsByBoard(prev => ({
      ...prev,
      [topic.board_id]: (prev[topic.board_id] ?? []).map(item =>
        item.id === topic.id ? { ...item, [field]: nextValue } : item
      ),
    }))

    const { data, error } = await supabase
      .from('edital_topics')
      .update({ [field]: nextValue })
      .eq('id', topic.id)
      .select('*')
      .single()

    if (error) {
      setDbError(error.message)
      await loadBoards()
      return
    }

    const saved = data as EditalTopic
    setTopicsByBoard(prev => ({
      ...prev,
      [saved.board_id]: (prev[saved.board_id] ?? []).map(item => (item.id === saved.id ? saved : item)),
    }))
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activeBoard || !userId) return
    if (!manualForm.disciplina.trim() || !manualForm.tema.trim() || !manualForm.subtema.trim()) {
      setNotice('Preencha disciplina, tema e subtema para adicionar manualmente.')
      return
    }

    setSavingManual(true)
    const supabase = createClient()
    const nextOrder = activeTopics.length

    const { data, error } = await supabase
      .from('edital_topics')
      .insert({
        board_id: activeBoard.id,
        user_id: userId,
        disciplina: manualForm.disciplina.trim(),
        tema: manualForm.tema.trim(),
        subtema: manualForm.subtema.trim(),
        order_index: nextOrder,
      })
      .select('*')
      .single()

    setSavingManual(false)

    if (error) {
      setDbError(error.message)
      return
    }

    const saved = data as EditalTopic
    setTopicsByBoard(prev => ({
      ...prev,
      [activeBoard.id]: [...(prev[activeBoard.id] ?? []), saved],
    }))
    setExpandedDisciplines(prev => ({ ...prev, [saved.disciplina]: true }))
    setManualForm(emptyForm)
    setManualOpen(false)
    setNotice('Item adicionado manualmente.')
  }

  async function handleUploadChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return
    if (!userId) {
      setDbError('Usuario nao autenticado.')
      return
    }

    let board = activeBoard
    if (!board) {
      board = await createBoard(userId ?? undefined, createDefaultBoardTitle(boards.length), true)
      if (!board) return
    }

    if ((topicsByBoard[board.id] ?? []).length) {
      const confirmed = window.confirm('Este edital ja possui itens. Deseja substituir tudo pelo novo arquivo?')
      if (!confirmed) return
    }

    setUploading(true)
    setDbError(null)
    setNotice('Lendo o edital e extraindo disciplina, tema e subtema...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/edital-verticalizado/parse', {
        method: 'POST',
        body: formData,
      })

      const data = (await res.json()) as ParsedResponse & { error?: string }
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Erro ao processar o edital.')
      }

      const supabase = createClient()
      const clearRes = await supabase.from('edital_topics').delete().eq('board_id', board.id)
      if (clearRes.error) {
        throw new Error(clearRes.error.message)
      }

      const insertPayload = data.items.map((item, index) => ({
        board_id: board!.id,
        user_id: userId,
        disciplina: item.disciplina,
        tema: item.tema,
        subtema: item.subtema,
        order_index: index,
      }))

      const insertRes = await supabase
        .from('edital_topics')
        .insert(insertPayload)
        .select('*')

      if (insertRes.error) {
        throw new Error(insertRes.error.message)
      }

      const boardUpdateRes = await supabase
        .from('edital_boards')
        .update({
          title: data.suggestedTitle || board.title,
          source_file_name: data.fileName,
          source_file_type: file.type || null,
          source_excerpt: data.sourceExcerpt,
          ai_provider: data.provider,
          ai_model: data.model,
          last_processed_at: new Date().toISOString(),
        })
        .eq('id', board.id)
        .select('*')
        .single()

      if (boardUpdateRes.error) {
        throw new Error(boardUpdateRes.error.message)
      }

      const savedBoard = boardUpdateRes.data as EditalBoard
      const savedTopics = (insertRes.data ?? []) as EditalTopic[]
      const nextExpanded: Record<string, boolean> = {}

      for (const topic of savedTopics) {
        nextExpanded[topic.disciplina] = true
      }

      setBoards(prev => prev.map(item => (item.id === savedBoard.id ? savedBoard : item)))
      setTopicsByBoard(prev => ({ ...prev, [savedBoard.id]: savedTopics }))
      setActiveBoardId(savedBoard.id)
      setExpandedDisciplines(nextExpanded)
      setTitleDraft(savedBoard.title)
      setNotice(
        `Edital processado com ${savedTopics.length} item(ns). Fonte: ${data.provider} / ${data.model}.`
      )
    } catch (error) {
      setDbError((error as Error).message)
      setNotice(null)
    } finally {
      setUploading(false)
    }
  }

  const filteredTopics = activeTopics.filter(topic => {
    const matchesSearch =
      !search.trim() ||
      `${topic.disciplina} ${topic.tema} ${topic.subtema}`.toLowerCase().includes(search.toLowerCase())

    const isInProgress = topic.estudo || topic.resumo || topic.revisao
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !isInProgress && !topic.concluido) ||
      (statusFilter === 'in-progress' && isInProgress && !topic.concluido) ||
      (statusFilter === 'done' && topic.concluido)

    return matchesSearch && matchesStatus
  })

  const groupedTopics = filteredTopics.reduce<Record<string, EditalTopic[]>>((acc, topic) => {
    acc[topic.disciplina] = [...(acc[topic.disciplina] ?? []), topic]
    return acc
  }, {})

  const disciplinas = Array.from(new Set(activeTopics.map(topic => topic.disciplina)))
  const totalTemas = activeTopics.length
  const totalConcluidos = activeTopics.filter(topic => topic.concluido).length
  const progresso = totalTemas ? Math.round((totalConcluidos / totalTemas) * 100) : 0

  function expandAll() {
    const nextState: Record<string, boolean> = {}
    for (const disciplina of Object.keys(groupedTopics)) {
      nextState[disciplina] = true
    }
    setExpandedDisciplines(nextState)
  }

  function collapseAll() {
    const nextState: Record<string, boolean> = {}
    for (const disciplina of Object.keys(groupedTopics)) {
      nextState[disciplina] = false
    }
    setExpandedDisciplines(nextState)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', background: 'var(--bg,#0a0c12)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--muted,#6b7194)' }}>
          <Loader2 size={18} className="spin" />
          Carregando edital verticalizado...
        </div>
        <style>{`.spin{animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .ev-btn:hover { transform: translateY(-1px); }
        .ev-input:focus, .ev-select:focus, .ev-textarea:focus {
          outline: none;
          border-color: rgba(108,99,255,.7);
          box-shadow: 0 0 0 3px rgba(108,99,255,.12);
        }
        .ev-tab::-webkit-scrollbar { display: none; }
        .spin{animation:spin .9s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ev-top-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(360px,.95fr);gap:16px;align-items:stretch}
        .ev-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .ev-toolbar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}
        .ev-toolbar-left{display:flex;align-items:center;gap:10px;flex:1 1 320px}
        .ev-toolbar-right{display:flex;gap:8px;flex-wrap:wrap}
        .ev-board-head{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap}
        .ev-board-title-wrap{display:flex;align-items:center;gap:10px;min-width:300px}
        .ev-board-title-row{display:flex;gap:8px}
        .ev-head-actions,.ev-upload-actions,.ev-meta-row{display:flex;gap:10px;flex-wrap:wrap}
        .ev-title{margin:0;font-size:32px;font-weight:800;letter-spacing:-.04em}
        .ev-subtitle{margin:8px 0 0;color:var(--muted,#6b7194);font-size:14px}
        .ev-table-wrap{border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:auto}
        .ev-mobile-cards{display:none}
        @media (max-width: 1180px){
          .ev-top-grid{grid-template-columns:1fr}
        }
        @media (max-width: 840px){
          .ev-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
          .ev-toolbar,.ev-board-head{align-items:stretch}
          .ev-board-title-wrap{min-width:0;width:100%}
          .ev-meta-row{width:100%}
        }
        @media (max-width: 760px){
          .ev-toolbar-left{width:100%;flex-direction:column;align-items:stretch}
          .ev-toolbar-left .ev-select{width:100% !important}
          .ev-toolbar-right{width:100%}
          .ev-toolbar-right .ev-btn{flex:1}
          .ev-board-title-row{flex-direction:column}
          .ev-board-title-row .ev-btn{width:100%;height:44px}
          .ev-desktop-table{display:none}
          .ev-mobile-cards{display:grid;gap:12px}
        }
        @media (max-width: 640px){
          .ev-page{padding:16px 12px 24px !important;gap:14px !important}
          .ev-stats-grid{grid-template-columns:1fr}
          .ev-title{font-size:24px}
          .ev-subtitle{font-size:13px}
          .ev-head-actions,.ev-upload-actions{width:100%}
          .ev-head-actions .ev-btn,.ev-upload-actions .ev-btn{flex:1 1 100%}
          .ev-meta-row > *{max-width:none !important;width:100%}
        }
        @media (max-width: 420px){
          .ev-mobile-status-grid{grid-template-columns:1fr !important}
        }
      `}</style>

      <div className="ev-page" style={{ padding: '28px 32px 34px', background: 'var(--bg,#0a0c12)', minHeight: '100%', display: 'grid', gap: 18 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1 className="ev-title">Edital Verticalizado</h1>
            <p className="ev-subtitle">
              Organize o conteudo programatico em disciplina, tema e subtema com apoio de IA.
            </p>
          </div>

          <div className="ev-head-actions">
            <button
              className="ev-btn"
              type="button"
              onClick={() => setManualOpen(true)}
              disabled={missingTables}
              style={{
                ...buttonBase,
                padding: '11px 16px',
                background: 'transparent',
                color: 'var(--text,#e8eaf6)',
                opacity: missingTables ? 0.5 : 1,
              }}
            >
              <Plus size={16} />
              Adicionar Manual
            </button>
            <button
              className="ev-btn"
              type="button"
              onClick={() => void createBoard(undefined, createDefaultBoardTitle(boards.length), true)}
              disabled={missingTables || savingBoard}
              style={{
                ...buttonBase,
                padding: '11px 16px',
                background: 'rgba(108,99,255,.12)',
                color: '#cfcafc',
                borderColor: 'rgba(108,99,255,.22)',
                opacity: missingTables ? 0.5 : 1,
              }}
            >
              <Plus size={16} />
              Novo Edital
            </button>
          </div>
        </header>

        <section className="ev-top-grid">
          <div className="ev-stats-grid" style={{ ...box, padding: 18 }}>
            <StatCard label="Disciplinas" value={String(disciplinas.length)} color="#7c6cff" />
            <StatCard label="Total de temas" value={String(totalTemas)} color="#4f8cff" />
            <StatCard label="Concluidos" value={String(totalConcluidos)} color="#1fc16b" />
            <StatCard label="Progresso" value={`${progresso}%`} color="#ffb224" />
          </div>

          <div style={{ ...box, padding: 18, display: 'grid', gap: 14, borderColor: 'rgba(108,99,255,.24)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: '#a6aee3' }}>
                  Envie o edital do concurso
                </div>
                <div style={{ marginTop: 7, fontSize: 14, color: 'var(--text,#e8eaf6)', fontWeight: 700 }}>
                  A IA vai ler o conteudo programatico e preencher disciplina, tema e subtema.
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(108,99,255,.14)', color: '#cfcafc', flexShrink: 0 }}>
                <Sparkles size={18} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge color="#4f8cff" label="PDF" />
              <Badge color="#7c6cff" label="TXT" />
              <Badge color="#1fc16b" label="MD" />
            </div>

            <div className="ev-upload-actions">
              <button
                className="ev-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={missingTables || uploading}
                style={{
                  ...buttonBase,
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, rgba(108,99,255,.96), rgba(137,113,255,.96))',
                  color: '#fff',
                  borderColor: 'transparent',
                  minWidth: 180,
                  opacity: missingTables ? 0.5 : 1,
                }}
              >
                {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                {uploading ? 'Lendo edital...' : 'Enviar Edital (IA)'}
              </button>

              <button
                className="ev-btn"
                type="button"
                onClick={clearCurrentBoard}
                disabled={missingTables || uploading}
                style={{
                  ...buttonBase,
                  padding: '12px 16px',
                  background: 'transparent',
                  color: 'var(--text,#e8eaf6)',
                  opacity: missingTables ? 0.5 : 1,
                }}
              >
                <Trash2 size={16} />
                Excluir Tudo
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted,#6b7194)', lineHeight: 1.5 }}>
              Guia ativa: <strong style={{ color: 'var(--text,#e8eaf6)' }}>{activeBoard?.title ?? 'Sem guia'}</strong>
              {' '}| Ultimo processamento: {formatDateTime(activeBoard?.last_processed_at ?? null)}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              onChange={handleUploadChange}
              style={{ display: 'none' }}
            />
          </div>
        </section>

        <section style={{ ...box, padding: '12px 14px', overflow: 'hidden' }}>
          <div className="ev-tab" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {boards.map(board => {
              const count = topicsByBoard[board.id]?.length ?? 0
              const active = board.id === activeBoardId

              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => setActiveBoardId(board.id)}
                  style={{
                    ...buttonBase,
                    padding: '10px 14px',
                    background: active ? 'rgba(108,99,255,.18)' : 'rgba(255,255,255,.03)',
                    borderColor: active ? 'rgba(108,99,255,.32)' : 'rgba(255,255,255,.06)',
                    color: active ? '#e9e7ff' : 'var(--muted,#6b7194)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <FileText size={14} />
                  {board.title}
                  <span style={{ padding: '2px 7px', borderRadius: 999, background: active ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.05)', fontSize: 11 }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {dbError && (
          <div style={{ ...box, padding: '14px 16px', borderColor: 'rgba(239,68,68,.28)', color: '#ff8f8f', fontSize: 13 }}>
            {dbError}
            {missingTables ? (
              <span style={{ display: 'block', marginTop: 8, color: 'var(--muted,#6b7194)' }}>
                Rode o script <code>lib/supabase/edital_verticalizado.sql</code> no Supabase e recarregue a pagina.
              </span>
            ) : null}
          </div>
        )}

        {notice && !dbError && (
          <div style={{ ...box, padding: '14px 16px', borderColor: 'rgba(16,185,129,.28)', color: '#7ce3b2', fontSize: 13 }}>
            {notice}
          </div>
        )}

        <section style={{ ...box, padding: 20, display: 'grid', gap: 16 }}>
          <div className="ev-toolbar">
            <div className="ev-toolbar-left">
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted,#6b7194)' }} />
                <input
                  className="ev-input"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar disciplina, tema ou subtema..."
                  style={{ ...inputBase, paddingLeft: 36 }}
                />
              </div>

              <select
                className="ev-select"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as StatusFilter)}
                style={{ ...inputBase, width: 190, paddingRight: 30 }}
              >
                <option value="all">Todos os status</option>
                <option value="pending">Pendentes</option>
                <option value="in-progress">Em andamento</option>
                <option value="done">Concluidos</option>
              </select>
            </div>

            <div className="ev-toolbar-right">
              <button
                className="ev-btn"
                type="button"
                onClick={expandAll}
                style={{ ...buttonBase, padding: '10px 13px', background: 'rgba(255,255,255,.03)', color: 'var(--text,#e8eaf6)' }}
              >
                Expandir Tudo
              </button>
              <button
                className="ev-btn"
                type="button"
                onClick={collapseAll}
                style={{ ...buttonBase, padding: '10px 13px', background: 'rgba(255,255,255,.03)', color: 'var(--text,#e8eaf6)' }}
              >
                Recolher
              </button>
            </div>
          </div>

          <div className="ev-board-head">
            <div className="ev-board-title-wrap">
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Titulo da guia</label>
                <div className="ev-board-title-row">
                  <input
                    className="ev-input"
                    value={titleDraft}
                    onChange={event => setTitleDraft(event.target.value)}
                    onBlur={() => void saveBoardTitle()}
                    style={inputBase}
                    placeholder="Nome do edital"
                    disabled={!activeBoard || missingTables}
                  />
                  <button
                    className="ev-btn"
                    type="button"
                    onClick={() => void saveBoardTitle()}
                    disabled={!activeBoard || savingBoard || missingTables}
                    style={{
                      ...buttonBase,
                      width: 46,
                      background: 'rgba(108,99,255,.14)',
                      color: '#d6d2ff',
                      borderColor: 'rgba(108,99,255,.22)',
                    }}
                  >
                    {savingBoard ? <Loader2 size={16} className="spin" /> : <PencilLine size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="ev-meta-row">
              <MetaPill label="Arquivo" value={activeBoard?.source_file_name ?? 'Nao enviado'} />
              <MetaPill label="IA" value={activeBoard?.ai_provider ? `${activeBoard.ai_provider} / ${activeBoard.ai_model}` : 'Aguardando arquivo'} />
              <button
                className="ev-btn"
                type="button"
                onClick={deleteCurrentBoard}
                disabled={missingTables}
                style={{ ...buttonBase, padding: '10px 13px', background: 'rgba(239,68,68,.12)', borderColor: 'rgba(239,68,68,.24)', color: '#ffb2b2' }}
              >
                <Trash2 size={15} />
                Excluir Guia
              </button>
            </div>
          </div>

          <div className="ev-table-wrap">
            <div className="ev-desktop-table">
              <div style={{ display: 'grid', gridTemplateColumns: '52px minmax(0,1.3fr) minmax(0,1.3fr) repeat(4,94px) 58px', gap: 0, padding: '0 14px', background: 'rgba(255,255,255,.03)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {['#', 'Tema', 'Subtema', 'Estudo', 'Resumo', 'Revisao', 'Concluido', 'Acoes'].map((label, index) => (
                  <div
                    key={label}
                    style={{
                      padding: '12px 8px',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: 1.4,
                      color: 'var(--muted,#6b7194)',
                      textAlign: index >= 3 ? 'center' : 'left',
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {!Object.keys(groupedTopics).length ? (
                <div style={{ padding: '56px 18px', textAlign: 'center', display: 'grid', gap: 10, placeItems: 'center' }}>
                  <div style={{ width: 66, height: 66, borderRadius: 20, background: 'rgba(108,99,255,.12)', display: 'grid', placeItems: 'center', color: '#d8d4ff' }}>
                    <FileText size={28} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>Nenhum edital carregado</div>
                  <div style={{ maxWidth: 520, fontSize: 14, color: 'var(--muted,#6b7194)', lineHeight: 1.6 }}>
                    Envie um arquivo para a IA organizar o conteudo programatico automaticamente ou adicione itens manualmente.
                  </div>
                </div>
              ) : (
                Object.entries(groupedTopics).map(([disciplina, items]) => {
                  const isOpen = expandedDisciplines[disciplina] ?? true
                  const doneCount = items.filter(item => item.concluido).length

                  return (
                    <div key={disciplina} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedDisciplines(prev => ({ ...prev, [disciplina]: !isOpen }))}
                        style={{
                          width: '100%',
                          border: 'none',
                          background: 'rgba(255,255,255,.02)',
                          color: 'var(--text,#e8eaf6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '13px 16px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>{disciplina}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted,#6b7194)' }}>{items.length} item(ns) nesta disciplina</div>
                          </div>
                        </div>
                        <div style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(108,99,255,.12)', color: '#d9d5ff', fontSize: 12 }}>
                          {doneCount}/{items.length} concluidos
                        </div>
                      </button>

                      {isOpen
                        ? items.map((topic, index) => (
                            <div key={topic.id} style={{ display: 'grid', gridTemplateColumns: '52px minmax(0,1.3fr) minmax(0,1.3fr) repeat(4,94px) 58px', gap: 0, padding: '0 14px', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                              <Cell align="center">{String(index + 1).padStart(2, '0')}</Cell>
                              <Cell>
                                <div style={{ fontWeight: 700 }}>{topic.tema}</div>
                              </Cell>
                              <Cell muted>{topic.subtema}</Cell>
                              <Cell align="center">
                                <StatusToggle active={topic.estudo} label={toggleLabel(topic.estudo, 'Sim', 'Nao')} onClick={() => void toggleTopic(topic, 'estudo')} />
                              </Cell>
                              <Cell align="center">
                                <StatusToggle active={topic.resumo} label={toggleLabel(topic.resumo, 'Sim', 'Nao')} onClick={() => void toggleTopic(topic, 'resumo')} />
                              </Cell>
                              <Cell align="center">
                                <StatusToggle active={topic.revisao} label={toggleLabel(topic.revisao, 'Sim', 'Nao')} onClick={() => void toggleTopic(topic, 'revisao')} />
                              </Cell>
                              <Cell align="center">
                                <StatusToggle active={topic.concluido} label={toggleLabel(topic.concluido, 'Ok', 'Pendente')} onClick={() => void toggleTopic(topic, 'concluido')} tone={topic.concluido ? '#1fc16b' : '#ffb224'} />
                              </Cell>
                              <Cell align="center">
                                <button
                                  className="ev-btn"
                                  type="button"
                                  onClick={() => void deleteTopic(topic.id)}
                                  style={{
                                    ...buttonBase,
                                    width: 34,
                                    height: 34,
                                    padding: 0,
                                    background: 'rgba(239,68,68,.1)',
                                    color: '#ff9a9a',
                                    borderColor: 'rgba(239,68,68,.2)',
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </Cell>
                            </div>
                          ))
                        : null}
                    </div>
                  )
                })
              )}
            </div>

            <div className="ev-mobile-cards" style={{ padding: '14px' }}>
              {!Object.keys(groupedTopics).length ? (
                <div style={{ padding: '26px 8px', textAlign: 'center', display: 'grid', gap: 10, placeItems: 'center' }}>
                  <div style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(108,99,255,.12)', display: 'grid', placeItems: 'center', color: '#d8d4ff' }}>
                    <FileText size={24} />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Nenhum edital carregado</div>
                  <div style={{ fontSize: 13, color: 'var(--muted,#6b7194)', lineHeight: 1.6 }}>
                    Envie um arquivo para a IA organizar o conteudo programatico automaticamente ou adicione itens manualmente.
                  </div>
                </div>
              ) : (
                Object.entries(groupedTopics).map(([disciplina, items]) => {
                  const isOpen = expandedDisciplines[disciplina] ?? true
                  const doneCount = items.filter(item => item.concluido).length

                  return (
                    <div key={`mobile-${disciplina}`} style={{ display: 'grid', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setExpandedDisciplines(prev => ({ ...prev, [disciplina]: !isOpen }))}
                        style={{
                          width: '100%',
                          border: '1px solid rgba(255,255,255,.06)',
                          borderRadius: 16,
                          background: 'rgba(255,255,255,.02)',
                          color: 'var(--text,#e8eaf6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '13px 14px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>{disciplina}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted,#6b7194)' }}>{items.length} item(ns)</div>
                          </div>
                        </div>
                        <div style={{ padding: '4px 9px', borderRadius: 999, background: 'rgba(108,99,255,.12)', color: '#d9d5ff', fontSize: 12 }}>
                          {doneCount}/{items.length}
                        </div>
                      </button>

                      {isOpen
                        ? items.map((topic, index) => (
                            <TopicMobileCard
                              key={`mobile-topic-${topic.id}`}
                              index={index}
                              topic={topic}
                              onDelete={() => void deleteTopic(topic.id)}
                              onToggle={field => void toggleTopic(topic, field)}
                            />
                          ))
                        : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>
      </div>

      {manualOpen ? (
        <div
          onClick={() => setManualOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6,8,12,.72)',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            zIndex: 80,
          }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{
              ...box,
              width: 'min(560px, 100%)',
              padding: 22,
              borderColor: 'rgba(108,99,255,.2)',
              boxShadow: '0 24px 80px rgba(0,0,0,.45)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>Adicionar item manual</div>
                <div style={{ marginTop: 6, color: 'var(--muted,#6b7194)', fontSize: 14 }}>
                  Use esta opcao para complementar o edital com itens que a IA nao capturou.
                </div>
              </div>

              <button
                className="ev-btn"
                type="button"
                onClick={() => setManualOpen(false)}
                style={{ ...buttonBase, width: 36, height: 36, background: 'rgba(255,255,255,.04)', color: 'var(--text,#e8eaf6)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={labelStyle}>Disciplina</label>
                <input
                  className="ev-input"
                  value={manualForm.disciplina}
                  onChange={event => setManualForm(prev => ({ ...prev, disciplina: event.target.value }))}
                  style={inputBase}
                  placeholder="Ex.: Direito Constitucional"
                />
              </div>

              <div>
                <label style={labelStyle}>Tema</label>
                <input
                  className="ev-input"
                  value={manualForm.tema}
                  onChange={event => setManualForm(prev => ({ ...prev, tema: event.target.value }))}
                  style={inputBase}
                  placeholder="Ex.: Controle de constitucionalidade"
                />
              </div>

              <div>
                <label style={labelStyle}>Subtema</label>
                <textarea
                  className="ev-textarea"
                  value={manualForm.subtema}
                  onChange={event => setManualForm(prev => ({ ...prev, subtema: event.target.value }))}
                  style={{ ...inputBase, minHeight: 110, resize: 'vertical' }}
                  placeholder="Ex.: ADI, ADC, ADO e ADPF"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  className="ev-btn"
                  type="button"
                  onClick={() => setManualOpen(false)}
                  style={{ ...buttonBase, padding: '11px 16px', background: 'transparent', color: 'var(--text,#e8eaf6)' }}
                >
                  Cancelar
                </button>
                <button
                  className="ev-btn"
                  type="submit"
                  disabled={savingManual}
                  style={{
                    ...buttonBase,
                    padding: '11px 16px',
                    background: 'linear-gradient(135deg, rgba(108,99,255,.96), rgba(137,113,255,.96))',
                    borderColor: 'transparent',
                    color: '#fff',
                  }}
                >
                  {savingManual ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                  Salvar item
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--muted,#6b7194)', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        background: `${color}1A`,
        border: `1px solid ${color}33`,
        color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.6,
      }}
    >
      {label}
    </span>
  )
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '9px 12px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', maxWidth: 280 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--muted,#6b7194)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text,#e8eaf6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )
}

function Cell({
  children,
  align = 'left',
  muted = false,
}: {
  children: React.ReactNode
  align?: 'left' | 'center'
  muted?: boolean
}) {
  return (
    <div
      style={{
        padding: '12px 8px',
        fontSize: 13,
        color: muted ? 'var(--muted,#6b7194)' : 'var(--text,#e8eaf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        minHeight: 54,
      }}
    >
      {children}
    </div>
  )
}

function StatusToggle({
  active,
  label,
  onClick,
  tone,
}: {
  active: boolean
  label: string
  onClick: () => void
  tone?: string
}) {
  const color = tone ?? (active ? '#7c6cff' : '#6b7194')

  return (
    <button
      className="ev-btn"
      type="button"
      onClick={onClick}
      style={{
        ...buttonBase,
        minWidth: 72,
        padding: '8px 10px',
        borderRadius: 999,
        background: active ? `${color}22` : 'rgba(255,255,255,.04)',
        borderColor: active ? `${color}44` : 'rgba(255,255,255,.07)',
        color,
        fontSize: 12,
      }}
    >
      {label}
    </button>
  )
}

function TopicMobileCard({
  index,
  topic,
  onDelete,
  onToggle,
}: {
  index: number
  topic: EditalTopic
  onDelete: () => void
  onToggle: (field: 'estudo' | 'resumo' | 'revisao' | 'concluido') => void
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 16,
        padding: 14,
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
            Item {String(index + 1).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text,#e8eaf6)' }}>{topic.tema}</div>
          <div style={{ fontSize: 13, color: 'var(--muted,#6b7194)', lineHeight: 1.5 }}>{topic.subtema}</div>
        </div>

        <button
          className="ev-btn"
          type="button"
          onClick={onDelete}
          style={{
            ...buttonBase,
            width: 36,
            height: 36,
            padding: 0,
            background: 'rgba(239,68,68,.1)',
            color: '#ff9a9a',
            borderColor: 'rgba(239,68,68,.2)',
            flexShrink: 0,
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="ev-mobile-status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <StatusToggle active={topic.estudo} label={toggleLabel(topic.estudo, 'Estudo', 'Estudo')} onClick={() => onToggle('estudo')} />
        <StatusToggle active={topic.resumo} label={toggleLabel(topic.resumo, 'Resumo', 'Resumo')} onClick={() => onToggle('resumo')} />
        <StatusToggle active={topic.revisao} label={toggleLabel(topic.revisao, 'Revisao', 'Revisao')} onClick={() => onToggle('revisao')} />
        <StatusToggle active={topic.concluido} label={toggleLabel(topic.concluido, 'Concluido', 'Pendente')} onClick={() => onToggle('concluido')} tone={topic.concluido ? '#1fc16b' : '#ffb224'} />
      </div>
    </div>
  )
}
