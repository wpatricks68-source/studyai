'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  PencilLine,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { normalizePlanTier, type PlanTier } from '@/lib/search-plans'
import type { EditalBoard, EditalTopic } from '@/types/database'

type StatusFilter = 'all' | 'pending' | 'in-progress' | 'done'

type ManualForm = {
  disciplina: string
  tema: string
  subtemas: string
}

type ThemeGroup = {
  key: string
  disciplina: string
  tema: string
  topics: EditalTopic[]
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
  subtemas: '',
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

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}

function parseSubtemaLines(value: string) {
  return value
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function buildThemeGroups(topics: EditalTopic[]) {
  const groups = new Map<string, ThemeGroup>()

  for (const topic of topics) {
    const key = `${normalizeKey(topic.disciplina)}|||${normalizeKey(topic.tema)}`
    const existing = groups.get(key)

    if (existing) {
      existing.topics.push(topic)
      continue
    }

    groups.set(key, {
      key,
      disciplina: topic.disciplina,
      tema: topic.tema,
      topics: [topic],
    })
  }

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      topics: [...group.topics].sort((a, b) => {
        const orderDiff = (a.order_index ?? 0) - (b.order_index ?? 0)
        if (orderDiff !== 0) return orderDiff
        return a.created_at.localeCompare(b.created_at)
      }),
    }))
    .sort((a, b) => {
      const disciplinaDiff = a.disciplina.localeCompare(b.disciplina)
      if (disciplinaDiff !== 0) return disciplinaDiff

      const orderA = Math.min(...a.topics.map(topic => topic.order_index ?? 0))
      const orderB = Math.min(...b.topics.map(topic => topic.order_index ?? 0))
      if (orderA !== orderB) return orderA - orderB

      return a.tema.localeCompare(b.tema)
    })
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
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null)
  const [manualForm, setManualForm] = useState<ManualForm>(emptyForm)
  const [addNewTema, setAddNewTema] = useState(false)
  const [savingManual, setSavingManual] = useState(false)
  const [expandedDisciplines, setExpandedDisciplines] = useState<Record<string, boolean>>({})
  const [titleDraft, setTitleDraft] = useState('')
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [planTier, setPlanTier] = useState<PlanTier>('gratuito')

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

    // Carregar plano do usuario
    const profileRes = await supabase.from('profiles').select('plan_tier').eq('id', user.id).maybeSingle()
    setPlanTier(normalizePlanTier(profileRes.data?.plan_tier))

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

  async function toggleTopic(topic: EditalTopic, field: 'estudo' | 'resumo' | 'revisao_1' | 'revisao_2' | 'revisao_3' | 'concluido') {
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

  async function cycleStatus(topic: EditalTopic) {
    const supabase = createClient()
    const statuses: EditalTopic['status'][] = ['pending', 'in-progress', 'done']
    const currentIndex = statuses.indexOf(topic.status || 'pending')
    const nextStatus = statuses[(currentIndex + 1) % statuses.length]

    let updatePayload: Partial<EditalTopic> = { status: nextStatus }

    // Lógica pedida: Concluído marca tudo como feito (sim do usuário)
    if (nextStatus === 'in-progress') {
      updatePayload = { ...updatePayload, estudo: true, concluido: false }
    } else if (nextStatus === 'done') {
      updatePayload = { 
        ...updatePayload, 
        estudo: true, 
        resumo: true, 
        revisao_1: true, 
        revisao_2: true, 
        revisao_3: true,
        concluido: true 
      }
    } else if (nextStatus === 'pending') {
      updatePayload = { 
        ...updatePayload, 
        estudo: false, 
        resumo: false, 
        revisao_1: false, 
        revisao_2: false, 
        revisao_3: false,
        concluido: false 
      }
    }

    setTopicsByBoard(prev => ({
      ...prev,
      [topic.board_id]: (prev[topic.board_id] ?? []).map(item =>
        item.id === topic.id ? { ...item, ...updatePayload } : item
      ),
    }))

    const { data, error } = await supabase
      .from('edital_topics')
      .update(updatePayload)
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

  function openCreateEditor(prefill?: Partial<ManualForm>) {
    setEditorMode('create')
    setEditingGroupKey(null)
    setManualForm({
      disciplina: prefill?.disciplina ?? '',
      tema: prefill?.tema ?? '',
      subtemas: prefill?.subtemas ?? '',
    })
    setEditorOpen(true)
  }

  function openEditGroup(group: ThemeGroup) {
    setEditorMode('edit')
    setEditingGroupKey(group.key)
    setManualForm({
      disciplina: group.disciplina,
      tema: group.tema,
      subtemas: group.topics.map(topic => topic.subtema).join('\n'),
    })
    setAddNewTema(false)
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditorMode('create')
    setEditingGroupKey(null)
    setManualForm(emptyForm)
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activeBoard || !userId) return
    const disciplina = manualForm.disciplina.trim()
    const tema = manualForm.tema.trim()
    const subtemas = parseSubtemaLines(manualForm.subtemas)

    if (!disciplina || !tema || !subtemas.length) {
      setNotice('Preencha disciplina, tema e pelo menos um subtema.')
      return
    }

    setSavingManual(true)
    const supabase = createClient()
    const boardTopics = topicsByBoard[activeBoard.id] ?? []

    // If editing but user chose to add a new tema within the same disciplina,
    // treat this as a create action that appends new topics for that disciplina/tema.
    if (editorMode === 'edit' && addNewTema) {
      const baseOrder = boardTopics.length
      const payload = subtemas.map((subtema, index) => ({
        board_id: activeBoard.id,
        user_id: userId,
        disciplina,
        tema,
        subtema,
        order_index: baseOrder + index,
      }))

      const { data, error } = await supabase
        .from('edital_topics')
        .insert(payload)
        .select('*')

      setSavingManual(false)

      if (error) {
        setDbError(error.message)
        return
      }

      const savedTopics = (data ?? []) as EditalTopic[]
      setTopicsByBoard(prev => ({
        ...prev,
        [activeBoard.id]: [...(prev[activeBoard.id] ?? []), ...savedTopics],
      }))
      setExpandedDisciplines(prev => ({ ...prev, [disciplina]: true }))
      closeEditor()
      setNotice(
        savedTopics.length > 1
          ? `${savedTopics.length} subtemas adicionados ao novo tema "${tema}".`
          : 'Novo tema adicionado na disciplina.'
      )
      return
    }

    if (editorMode === 'create') {
      const baseOrder = boardTopics.length
      const payload = subtemas.map((subtema, index) => ({
        board_id: activeBoard.id,
        user_id: userId,
        disciplina,
        tema,
        subtema,
        order_index: baseOrder + index,
      }))

      const { data, error } = await supabase
        .from('edital_topics')
        .insert(payload)
        .select('*')

      setSavingManual(false)

      if (error) {
        setDbError(error.message)
        return
      }

      const savedTopics = (data ?? []) as EditalTopic[]
      setTopicsByBoard(prev => ({
        ...prev,
        [activeBoard.id]: [...(prev[activeBoard.id] ?? []), ...savedTopics],
      }))
      setExpandedDisciplines(prev => ({ ...prev, [disciplina]: true }))
      closeEditor()
      setNotice(
        savedTopics.length > 1
          ? `${savedTopics.length} subtemas adicionados ao tema "${tema}".`
          : 'Item adicionado manualmente.'
      )
      return
    }

    const groupToEdit = buildThemeGroups(boardTopics).find(group => group.key === editingGroupKey)

    if (!groupToEdit) {
      setSavingManual(false)
      setDbError('Nao foi possivel localizar o tema para edicao.')
      return
    }

    const existingTopics = [...groupToEdit.topics]
    const minOrder = Math.min(...existingTopics.map(topic => topic.order_index ?? 0))
    const statusBySubtema = new Map(
      existingTopics.map(topic => [
        normalizeKey(topic.subtema),
        {
          estudo: topic.estudo,
          resumo: topic.resumo,
          revisao_1: topic.revisao_1,
          revisao_2: topic.revisao_2,
          revisao_3: topic.revisao_3,
          concluido: topic.concluido,
        },
      ])
    )

    const topicsToUpdate = existingTopics.slice(0, subtemas.length)
    const topicsToDelete = existingTopics.slice(subtemas.length)
    const extraSubtemas = subtemas.slice(existingTopics.length)

    for (let index = 0; index < topicsToUpdate.length; index += 1) {
      const current = topicsToUpdate[index]
      const nextSubtema = subtemas[index]
      const preserved = statusBySubtema.get(normalizeKey(nextSubtema))

      const { error } = await supabase
        .from('edital_topics')
        .update({
          disciplina,
          tema,
          subtema: nextSubtema,
          order_index: minOrder + index,
          ...(preserved ?? {}),
        })
        .eq('id', current.id)

      if (error) {
        setSavingManual(false)
        setDbError(error.message)
        return
      }
    }

    if (topicsToDelete.length) {
      const { error } = await supabase
        .from('edital_topics')
        .delete()
        .in('id', topicsToDelete.map(topic => topic.id))

      if (error) {
        setSavingManual(false)
        setDbError(error.message)
        return
      }
    }

    if (extraSubtemas.length) {
      const payload = extraSubtemas.map((subtema, index) => {
        const preserved = statusBySubtema.get(normalizeKey(subtema))

        return {
          board_id: activeBoard.id,
          user_id: userId,
          disciplina,
          tema,
          subtema,
          order_index: minOrder + topicsToUpdate.length + index,
          estudo: preserved?.estudo ?? false,
          resumo: preserved?.resumo ?? false,
          revisao_1: preserved?.revisao_1 ?? false,
          revisao_2: preserved?.revisao_2 ?? false,
          revisao_3: preserved?.revisao_3 ?? false,
          concluido: preserved?.concluido ?? false,
        }
      })

      const { error } = await supabase
        .from('edital_topics')
        .insert(payload)

      if (error) {
        setSavingManual(false)
        setDbError(error.message)
        return
      }
    }

    setSavingManual(false)
    closeEditor()
    setNotice(`Tema "${tema}" atualizado.`)
    await loadBoards()
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

    const isInProgress = topic.estudo || topic.resumo || topic.revisao_1 || topic.revisao_2 || topic.revisao_3
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !isInProgress && !topic.concluido) ||
      (statusFilter === 'in-progress' && isInProgress && !topic.concluido) ||
      (statusFilter === 'done' && topic.concluido)

    return matchesSearch && matchesStatus
  })

  const filteredThemeGroups = buildThemeGroups(filteredTopics)
  const groupedTopics = filteredThemeGroups.reduce<Record<string, ThemeGroup[]>>((acc, group) => {
    acc[group.disciplina] = [...(acc[group.disciplina] ?? []), group]
    return acc
  }, {})

  const summaryGroups = buildThemeGroups(activeTopics)
  const disciplinas = Array.from(new Set(summaryGroups.map(group => group.disciplina)))
  const totalTemas = summaryGroups.length
  const totalConcluidos = summaryGroups.filter(group => group.topics.every(topic => topic.concluido)).length
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
        .ev-panel-header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;border-bottom:1px solid var(--border,#1f2640);padding-bottom:10px}
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
        
        /* New Table Styles */
        .ev-table-container { min-width: 900px; display: grid; gap: 4px; }
        .ev-table-header {
          display: grid;
          grid-template-columns: 50px 1fr 100px 100px 160px 120px 110px;
          padding: 16px 20px;
          background: rgba(255,255,255,0.02);
          border-radius: 12px 12px 0 0;
          font-size: 11px;
          font-weight: 700;
          color: #6b7194;
          text-transform: uppercase;
          letter-spacing: 1px;
          align-items: center;
        }
        .ev-discipline-row {
          display: flex;
          align-items: center;
          background: rgba(108,99,255,0.05);
          padding: 12px 20px;
          cursor: pointer;
          border-left: 3px solid var(--accent);
          transition: background 0.2s;
          color: var(--text);
        }
        .ev-discipline-row:hover { background: rgba(108,99,255,0.08); }
        .ev-topic-row {
          display: grid;
          grid-template-columns: 50px 1fr 100px 100px 160px 120px 110px;
          padding: 12px 20px;
          align-items: center;
          border-bottom: 1px solid var(--border);
          transition: background 0.2s;
          color: var(--text);
        }
        .ev-topic-row:hover { background: rgba(255,255,255,0.015); }
        .light .ev-topic-row:hover { background: rgba(0,0,0,0.015); }
        
        .ev-theme-row {
          display: grid;
          grid-template-columns: 50px 1fr 100px 100px 160px 120px 110px;
          padding: 12px 20px;
          align-items: center;
          border-bottom: 1px solid var(--border);
          background: var(--surface2);
          font-weight: 700;
          color: var(--text);
        }

        .ev-status-check {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .ev-rev-group { display: flex; gap: 6px; }
        .ev-rev-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: #6b7194;
        }
        
        .ev-action-btns { display: flex; gap: 8px; }
        .ev-icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ev-icon-btn:hover { transform: translateY(-1px); }

        .ev-desktop-table { display: block; }
        .ev-mobile-cards { display: none; }

        @media (max-width: 1180px){
          .ev-top-grid{grid-template-columns:1fr}
        }
        @media (max-width: 1000px){
          .ev-desktop-table { display: none; }
          .ev-mobile-cards { display: grid; gap: 12px; }
        }
        @media (max-width: 840px){
          .ev-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
          .ev-toolbar,.ev-board-head{align-items:stretch}
          .ev-board-title-wrap{min-width:0;width:100%}
          .ev-meta-row{width:100%}
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
      `}</style>

      <div className="ev-page" style={{ padding: '28px 32px 34px', background: 'var(--bg,#0a0c12)', minHeight: '100%', display: 'grid', gap: 18 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1 className="ev-title">Edital Verticalizado</h1>
            <p className="ev-subtitle">
              Organize o conteudo programatico em disciplina, tema e subtema com apoio de IA.
            </p>
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

            <div style={{ fontSize: 13, color: 'var(--muted,#6b7194)', lineHeight: 1.5, marginTop: 4 }}>
              Ultimo processamento: {formatDateTime(activeBoard?.last_processed_at ?? null)}
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

        <section style={{ ...box, padding: '20px', display: 'grid', gap: 20 }}>
          <div className="ev-panel-header">
            <div className="ev-tab" style={{ display: 'flex', gap: 10, overflowX: 'auto', minWidth: 'max-content', paddingBottom: 4 }}>
              {boards.map((board, bIdx) => {
                const count = topicsByBoard[board.id]?.length ?? 0
                const active = board.id === activeBoardId
                const isEditing = editingBoardId === board.id
                
                // Varied colors based on index
                const colors = ['#7c6cff', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6']
                const tabColor = colors[bIdx % colors.length]

                return (
                  <div key={board.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setActiveBoardId(board.id)}
                      className="group"
                      style={{
                        ...buttonBase,
                        position: 'relative',
                        padding: '10px 16px',
                        background: active ? `${tabColor}15` : 'transparent',
                        borderColor: 'transparent',
                        color: active ? tabColor : 'var(--muted,#6b7194)',
                        whiteSpace: 'nowrap',
                        flex: '0 0 auto',
                        borderRadius: '10px 10px 0 0',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <FileText size={14} />
                      
                      {isEditing ? (
                        <input
                          autoFocus
                          value={titleDraft}
                          onChange={e => setTitleDraft(e.target.value)}
                          onBlur={() => {
                            void saveBoardTitle()
                            setEditingBoardId(null)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              void saveBoardTitle()
                              setEditingBoardId(null)
                            }
                          }}
                          style={{
                            background: 'rgba(0,0,0,0.1)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            padding: '2px 6px',
                            color: 'inherit',
                            fontSize: 'inherit',
                            fontWeight: 'inherit',
                            width: 120,
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span>{board.title}</span>
                      )}

                      <span style={{ padding: '2px 7px', borderRadius: 9, background: active ? `${tabColor}33` : 'rgba(255,255,255,.05)', fontSize: 10, fontWeight: 800 }}>
                        {count}
                      </span>

                      {active && (
                        <div style={{ position: 'absolute', bottom: -11, left: 0, right: 0, height: 2, background: tabColor, borderRadius: '2px 2px 0 0' }} />
                      )}

                      {active && !isEditing && (
                        <PencilLine 
                          size={12} 
                          className="opacity-0 group-hover:opacity-100 transition-opacity" 
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingBoardId(board.id)
                          }}
                        />
                      )}
                    </button>
                    {!active && (
                      <div style={{ width: 1, height: 20, background: 'var(--border)', opacity: 0.3, margin: '0 4px' }} />
                    )}
                  </div>
                )
              })}
              <button
                onClick={() => void createBoard(undefined, createDefaultBoardTitle(boards.length), true)}
                className="hover:scale-110 transition-transform"
                style={{ ...buttonBase, padding: '10px', background: 'transparent', color: 'var(--muted,#6b7194)', borderColor: 'transparent' }}
              >
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="ev-btn"
                type="button"
                onClick={() => openCreateEditor()}
                disabled={missingTables}
                style={{
                  ...buttonBase,
                  padding: '9px 14px',
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  fontSize: 12,
                  opacity: missingTables ? 0.5 : 1,
                }}
              >
                <Plus size={14} />
                Adicionar Manual
              </button>
              <button
                className="ev-btn"
                type="button"
                onClick={() => void createBoard(undefined, createDefaultBoardTitle(boards.length), true)}
                disabled={missingTables || savingBoard}
                style={{
                  ...buttonBase,
                  padding: '9px 14px',
                  background: 'rgba(108,99,255,0.1)',
                  color: 'var(--accent)',
                  borderColor: 'rgba(108,99,255,0.2)',
                  fontSize: 12,
                  opacity: missingTables ? 0.5 : 1,
                }}
              >
                <Sparkles size={14} />
                Novo Edital
              </button>
            </div>
          </div>

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
              <button
                className="ev-btn"
                type="button"
                onClick={deleteCurrentBoard}
                disabled={missingTables}
                style={{ ...buttonBase, padding: '10px 13px', background: 'rgba(239,68,68,.1)', borderColor: 'rgba(239,68,68,.18)', color: '#ffb2b2' }}
              >
                <Trash2 size={15} />
                Excluir Guia
              </button>
            </div>
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
            <div className="ev-table-wrap">
              <div className="ev-desktop-table">
                <div className="ev-table-container">
                  <div className="ev-table-header">
                    <div>#</div>
                    <div>Disciplina / Tema</div>
                    <div style={{ textAlign: 'center' }}>Estudo</div>
                    <div style={{ textAlign: 'center' }}>Resumo</div>
                    <div style={{ textAlign: 'center' }}>Revisão</div>
                    <div style={{ textAlign: 'center' }}>STATUS</div>
                    <div style={{ textAlign: 'center' }}>Ações</div>
                  </div>

                  {Object.entries(groupedTopics).map(([disciplina, groups]) => {
                    const isOpen = expandedDisciplines[disciplina] ?? true
                    const doneCount = groups.filter(group => group.topics.every(topic => topic.concluido)).length

                    return (
                      <div key={disciplina} style={{ display: 'grid' }}>
                        <div
                          className="ev-discipline-row"
                          onClick={() => setExpandedDisciplines(prev => ({ ...prev, [disciplina]: !isOpen }))}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{disciplina}</div>
                          </div>
                          <div style={{ fontSize: 11, color: '#8af0b3', background: 'rgba(34,197,94,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                            {doneCount}/{groups.length} CONCLUÍDOS
                          </div>
                        </div>

                        {isOpen && (
                          <div style={{ display: 'grid' }}>
                            {groups.map((group, groupIndex) => (
                              <div key={group.key} style={{ display: 'grid' }}>
                                {/* Theme row - now formatted like subthemes */}
                                <div className="ev-theme-row">
                                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                                    {groupIndex + 1}
                                  </div>
                                  <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    {group.tema}
                                  </div>
                                  <div style={{ display: 'grid', placeItems: 'center', gridColumn: 'span 4' }}>
                                    <div style={{ width: '100%', height: 1, background: 'var(--border)', opacity: 0.5 }} />
                                  </div>
                                  <div className="ev-action-btns">
                                    <button
                                      className="ev-icon-btn"
                                      onClick={() => openEditGroup(group)}
                                      style={{ color: 'var(--amber)', background: 'var(--surface2)', width: 28, height: 28 }}
                                    >
                                      <PencilLine size={13} />
                                    </button>
                                  </div>
                                </div>

                                {/* Subthemes rows */}
                                {group.topics.map((topic, topicIndex) => (
                                  <div key={topic.id} className="ev-topic-row">
                                    <div style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.7 }}>
                                      {groupIndex + 1}.{topicIndex + 1}
                                    </div>
                                    <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text)' }}>
                                      {topic.subtema}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                      <button
                                        className="ev-status-check"
                                        onClick={() => toggleTopic(topic, 'estudo')}
                                        style={{ background: topic.estudo ? 'var(--accent)' : undefined, borderColor: topic.estudo ? 'var(--accent)' : undefined }}
                                      >
                                        {topic.estudo && <Check size={14} color="#fff" />}
                                      </button>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                      <button
                                        className="ev-status-check"
                                        onClick={() => toggleTopic(topic, 'resumo')}
                                        style={{ background: topic.resumo ? 'var(--accent2)' : undefined, borderColor: topic.resumo ? 'var(--accent2)' : undefined }}
                                      >
                                        {topic.resumo && <Check size={14} color="#fff" />}
                                      </button>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                      <div className="ev-rev-group">
                                        <button
                                          className="ev-rev-btn"
                                          onClick={() => toggleTopic(topic, 'revisao_1')}
                                          style={{ background: topic.revisao_1 ? 'var(--amber)' : undefined, color: topic.revisao_1 ? '#fff' : undefined }}
                                        >1º</button>
                                        <button
                                          className="ev-rev-btn"
                                          onClick={() => toggleTopic(topic, 'revisao_2')}
                                          style={{ background: topic.revisao_2 ? '#3b82f6' : undefined, color: topic.revisao_2 ? '#fff' : undefined }}
                                        >2º</button>
                                        <button
                                          className="ev-rev-btn"
                                          onClick={() => toggleTopic(topic, 'revisao_3')}
                                          style={{ background: topic.revisao_3 ? 'var(--green)' : undefined, color: topic.revisao_3 ? '#fff' : undefined }}
                                        >3º</button>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                      <button
                                        className="ev-status-check"
                                        onClick={() => cycleStatus(topic)}
                                        style={{ 
                                          width: '100px',
                                          height: '32px',
                                          borderRadius: '8px',
                                          fontSize: '11px',
                                          fontWeight: 800,
                                          textTransform: 'uppercase',
                                          background: topic.status === 'done' ? 'var(--green)' : topic.status === 'in-progress' ? 'var(--amber)' : 'rgba(255,255,255,0.05)',
                                          borderColor: 'transparent',
                                          color: topic.status === 'pending' || !topic.status ? 'var(--muted)' : '#fff',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {topic.status === 'done' ? 'Concluído' : topic.status === 'in-progress' ? 'Em Andamento' : 'Pendente'}
                                      </button>
                                    </div>
                                    <div className="ev-action-btns" style={{ justifyContent: 'center' }}>
                                      <button
                                        className="ev-icon-btn"
                                        onClick={() => deleteTopic(topic.id)}
                                        style={{ color: 'var(--muted)', background: 'var(--surface2)', opacity: 0.5 }}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="ev-mobile-cards">
                {Object.entries(groupedTopics).map(([disciplina, groups]) => {
                  const isOpen = expandedDisciplines[disciplina] ?? true
                  return (
                    <div key={disciplina} style={{ border: '1px solid rgba(255,255,255,.06)', borderRadius: 18, overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedDisciplines(prev => ({ ...prev, [disciplina]: !isOpen }))}
                        style={{ width: '100%', border: 'none', background: 'rgba(255,255,255,.02)', color: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <span style={{ fontSize: 14, fontWeight: 800 }}>{disciplina}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div style={{ padding: 12, display: 'grid', gap: 12 }}>
                          {groups.map(group => (
                            <ThemeGroupPanel
                              key={group.key}
                              disciplina={disciplina}
                              group={group}
                              onEdit={() => openEditGroup(group)}
                              onDeleteTopic={topicId => void deleteTopic(topicId)}
                              onToggle={(topic, field) => void toggleTopic(topic, field)}
                              onCycleStatus={topic => void cycleStatus(topic)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {editorOpen ? (
        <div
          onClick={closeEditor}
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
              maxHeight: 'min(88vh, 760px)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  {editorMode === 'edit' ? 'Editar tema' : 'Adicionar itens manualmente'}
                </div>
                <div style={{ marginTop: 6, color: 'var(--muted,#6b7194)', fontSize: 14 }}>
                  Defina a disciplina, o tema e liste um subtema por linha para manter o conteudo verticalizado.
                </div>
              </div>

              <button
                className="ev-btn"
                type="button"
                onClick={closeEditor}
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

              {editorMode === 'edit' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAddNewTema(prev => {
                        const next = !prev
                        if (next) setManualForm(m => ({ ...m, tema: '' }))
                        return next
                      })
                    }}
                    aria-pressed={addNewTema}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: addNewTema ? '1px solid rgba(124,108,255,0.9)' : '1px solid rgba(255,255,255,0.06)',
                      background: addNewTema ? 'linear-gradient(135deg, rgba(124,108,255,0.12), rgba(124,108,255,0.06))' : 'rgba(255,255,255,0.02)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      boxShadow: addNewTema ? '0 6px 18px rgba(124,108,255,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      color: 'var(--text)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{addNewTema ? 'Novo tema: ativado' : 'Adicionar novo tema'}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted,#6b7194)' }}>{addNewTema ? 'O envio criará um novo tema nesta disciplina.' : 'Criar novo tema em vez de editar o atual'}</span>
                    </div>
                  </button>
                </div>
              )}

              <div>
                <label style={labelStyle}>Subtemas</label>
                <textarea
                  className="ev-textarea"
                  value={manualForm.subtemas}
                  onChange={event => setManualForm(prev => ({ ...prev, subtemas: event.target.value }))}
                  style={{ ...inputBase, minHeight: 150, resize: 'vertical' }}
                  placeholder={`Ex.: ADI\nADC\nADO\nADPF`}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted,#6b7194)', lineHeight: 1.5 }}>
                  Cada linha vira um subtema separado dentro do mesmo tema.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  className="ev-btn"
                  type="button"
                  onClick={closeEditor}
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
                  {editorMode === 'edit' ? 'Salvar alteracoes' : 'Salvar itens'}
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
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--muted,#6b7194)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 800, color, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 30 }}>{value}</div>
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
    <div style={{ padding: '9px 12px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', maxWidth: 280 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--muted,#6b7194)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text,#e8eaf6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
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

function ThemeGroupPanel({
  disciplina,
  group,
  onEdit,
  onDeleteTopic,
  onToggle,
  onCycleStatus,
}: {
  disciplina: string
  group: ThemeGroup
  onEdit: () => void
  onDeleteTopic: (topicId: string) => void
  onToggle: (
    topic: EditalTopic,
    field: 'estudo' | 'resumo' | 'revisao_1' | 'revisao_2' | 'revisao_3' | 'concluido'
  ) => void
  onCycleStatus: (topic: EditalTopic) => void
}) {
  const doneCount = group.topics.filter(topic => topic.concluido).length

  return (
    <div
      style={{
        background: 'rgba(255,255,255,.015)',
        border: '1px solid rgba(255,255,255,.05)',
        borderRadius: 16,
        padding: 14,
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: '#6b7194', textTransform: 'uppercase', letterSpacing: 1 }}>
            TEMA
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#e8eaf6' }}>{group.tema}</div>
          <div style={{ fontSize: 11, color: '#6b7194' }}>
            {group.topics.length} subtema(s) | {doneCount}/{group.topics.length} concluídos
          </div>
        </div>

        <button
          className="ev-icon-btn"
          onClick={onEdit}
          style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', flexShrink: 0 }}
        >
          <PencilLine size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {group.topics.map((topic, index) => (
          <SubtopicLine
            key={topic.id}
            index={index}
            topic={topic}
            onDelete={() => onDeleteTopic(topic.id)}
            onToggle={field => onToggle(topic, field)}
            onCycleStatus={() => onCycleStatus(topic)}
          />
        ))}
      </div>
    </div>
  )
}

function SubtopicLine({
  index,
  topic,
  onDelete,
  onToggle,
  onCycleStatus,
}: {
  index: number
  topic: EditalTopic
  onDelete: () => void
  onToggle: (
    field: 'estudo' | 'resumo' | 'revisao_1' | 'revisao_2' | 'revisao_3' | 'concluido'
  ) => void
  onCycleStatus: () => void
}) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,.04)', borderRadius: 12, padding: 10, display: 'grid', gap: 10, background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'rgba(232,234,246,0.8)', lineHeight: 1.4 }}>
            {topic.subtema}
          </div>
        </div>

        <button
          className="ev-icon-btn"
          onClick={onDelete}
          style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <button
          className="ev-btn"
          onClick={() => onToggle('estudo')}
          style={{
            ...buttonBase,
            fontSize: 10,
            padding: '6px',
            background: topic.estudo ? '#7c6cff' : 'rgba(255,255,255,0.03)',
            color: topic.estudo ? '#fff' : '#6b7194',
            borderColor: 'transparent'
          }}
        >Estudo</button>
        <button
          className="ev-btn"
          onClick={() => onToggle('resumo')}
          style={{
            ...buttonBase,
            fontSize: 10,
            padding: '6px',
            background: topic.resumo ? '#3b82f6' : 'rgba(255,255,255,0.03)',
            color: topic.resumo ? '#fff' : '#6b7194',
            borderColor: 'transparent'
          }}
        >Resumo</button>
        <button
          className="ev-btn"
          onClick={onCycleStatus}
          style={{
            ...buttonBase,
            gridColumn: 'span 3',
            fontSize: 10,
            padding: '8px',
            background: topic.status === 'done' ? 'var(--green)' : topic.status === 'in-progress' ? 'var(--amber)' : 'rgba(255,255,255,0.03)',
            color: topic.status === 'pending' || !topic.status ? 'var(--muted)' : '#fff',
            borderColor: 'transparent',
            fontWeight: 800
          }}
        >STATUS: {topic.status === 'done' ? 'CONCLUÍDO' : topic.status === 'in-progress' ? 'EM ANDAMENTO' : 'PENDENTE'}</button>
      </div>
      
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <button
          className="ev-rev-btn"
          onClick={() => onToggle('revisao_1')}
          style={{ width: 28, height: 28, background: topic.revisao_1 ? '#f59e0b' : undefined, color: topic.revisao_1 ? '#fff' : undefined }}
        >1º</button>
        <button
          className="ev-rev-btn"
          onClick={() => onToggle('revisao_2')}
          style={{ width: 28, height: 28, background: topic.revisao_2 ? '#3b82f6' : undefined, color: topic.revisao_2 ? '#fff' : undefined }}
        >2º</button>
        <button
          className="ev-rev-btn"
          onClick={() => onToggle('revisao_3')}
          style={{ width: 28, height: 28, background: topic.revisao_3 ? '#22c55e' : undefined, color: topic.revisao_3 ? '#fff' : undefined }}
        >3º</button>
      </div>
    </div>
  )
}
