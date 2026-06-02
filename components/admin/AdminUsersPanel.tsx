'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Search, Pencil, Trash2, X } from 'lucide-react'

type AdminUserRow = {
  id: string
  name: string | null
  email: string | null
  plan_tier: string | null
  role: string | null
  target_exam: string | null
  created_at: string
  alto_today: number
  advanced_today: number
}

type AdminUsersPanelProps = {
  users: AdminUserRow[]
}

type Notice =
  | { tone: 'success' | 'error' | 'neutral'; text: string }
  | null

type UserDraft = {
  name: string
  email: string
  targetExam: string
  planTier: string
  role: string
}

const PLAN_OPTIONS = [
  { value: 'gratuito', label: 'Gratuito' },
  { value: 'basico',   label: 'Básico'   },
  { value: 'premium',  label: 'Premium'  },
] as const

const ROLE_OPTIONS = [
  { value: 'user',  label: 'User'  },
  { value: 'admin', label: 'Admin' },
] as const

const SEARCH_SCOPE_OPTIONS = [
  { value: 'all', label: 'Buscar em tudo' },
  { value: 'name', label: 'Nome' },
  { value: 'email', label: 'Email' },
  { value: 'id', label: 'ID' },
  { value: 'target_exam', label: 'Concurso' },
  { value: 'created_at', label: 'Data de cadastro' },
  { value: 'role', label: 'Role' },
  { value: 'plan_tier', label: 'Plano' },
] as const

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date)
}

function formatUserId(value: string) {
  if (!value) return 'Sem identificador'
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}

function noticeStyles(tone: 'success' | 'error' | 'neutral') {
  if (tone === 'success') return { border: '1px solid rgba(16,185,129,.25)', background: 'rgba(16,185,129,.1)', color: '#34d399' }
  if (tone === 'error')   return { border: '1px solid rgba(239,68,68,.25)',  background: 'rgba(239,68,68,.1)',  color: '#f87171' }
  return { border: '1px solid rgba(245,158,11,.25)', background: 'rgba(245,158,11,.1)', color: '#fbbf24' }
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function planColor(plan: string | null) {
  if (plan === 'premium') return '#60a5fa'
  if (plan === 'basico')  return '#34d399'
  return '#6b7194'
}

function getDateKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function pdfText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapPdfLine(value: string, maxLength = 104) {
  const words = value.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (!word) continue
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxLength) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word.length > maxLength ? word.slice(0, maxLength) : word
  }

  if (current) lines.push(current)
  return lines
}

function buildUsersPdf(users: AdminUserRow[], filtersDescription: string) {
  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())

  const sourceLines = [
    'StudyAI - Relatorio de usuarios',
    `Gerado em: ${generatedAt}`,
    `Total exportado: ${users.length}`,
    `Filtros: ${filtersDescription || 'Todos os usuarios cadastrados'}`,
    '',
  ]

  users.forEach((user, index) => {
    sourceLines.push(`${index + 1}. ${user.name || 'Sem nome'} | ${user.email || 'Sem email'}`)
    sourceLines.push(`   ID: ${user.id}`)
    sourceLines.push(`   Role: ${user.role === 'admin' ? 'Admin' : 'User'} | Plano: ${user.plan_tier ?? 'gratuito'} | Cadastro: ${formatDate(user.created_at)}`)
    sourceLines.push(`   Concurso: ${user.target_exam || 'Nao informado'} | Alto hoje: ${user.alto_today} | Avancada hoje: ${user.advanced_today}`)
    sourceLines.push('')
  })

  const lines = sourceLines.flatMap(line => wrapPdfLine(line))
  const linesPerPage = 44
  const pages: string[][] = []

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage))
  }

  if (pages.length === 0) pages.push(['Nenhum usuario encontrado.'])

  const objects: string[] = []
  const addObject = (content: string) => {
    objects.push(content)
    return objects.length
  }

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>')
  const pagesId = addObject('')
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const pageIds: number[] = []

  pages.forEach(pageLines => {
    const streamLines = [
      'BT',
      '/F1 10 Tf',
      '40 800 Td',
      '14 TL',
      ...pageLines.map(line => `(${pdfText(line)}) Tj T*`),
      'ET',
    ]
    const stream = streamLines.join('\n')
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    pageIds.push(pageId)
  })

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return pdf
}

export default function AdminUsersPanel({ users }: AdminUsersPanelProps) {
  const router     = useRouter()
  const [isPending, startTransition] = useTransition()

  /* ── search ──────────────────────────────────────────── */
  const [search,          setSearch]          = useState('')
  const [searchFocused,   setSearchFocused]   = useState(false)
  const searchRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)

  /* ── filters ─────────────────────────────────────────── */
  const [roleFilter,   setRoleFilter]   = useState<'all' | 'user' | 'admin'>('all')
  const [planFilter,   setPlanFilter]   = useState<'all' | 'gratuito' | 'basico' | 'premium'>('all')
  const [usageFilter,  setUsageFilter]  = useState<'all' | 'used_today' | 'no_usage_today'>('all')
  const [searchScope,  setSearchScope]  = useState<(typeof SEARCH_SCOPE_OPTIONS)[number]['value']>('all')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')

  /* ── drafts / modal ──────────────────────────────────── */
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>(
    Object.fromEntries(users.map(u => [u.id, {
      name: u.name ?? '',
      email: u.email ?? '',
      targetExam: u.target_exam ?? '',
      planTier: u.plan_tier ?? 'gratuito',
      role:     u.role === 'admin' ? 'admin' : 'user',
    }]))
  )
  const [savingUserId,   setSavingUserId]   = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [notice,         setNotice]         = useState<Notice>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  /* ── computed ─────────────────────────────────────────── */
  const filteredUsers = useMemo(() => {
    const tokens = normalize(search).split(/\s+/).filter(Boolean)
    return users.filter(user => {
      const createdDateKey = getDateKey(user.created_at)
      const searchableFields = {
        all: [
          user.name ?? '', user.email ?? '', user.id,
          user.id.replaceAll('-', ''), formatUserId(user.id),
          user.target_exam ?? '', user.plan_tier ?? '', user.role ?? '',
          formatDate(user.created_at), createdDateKey,
        ].join(' '),
        name: user.name ?? '',
        email: user.email ?? '',
        id: `${user.id} ${user.id.replaceAll('-', '')} ${formatUserId(user.id)}`,
        target_exam: user.target_exam ?? '',
        created_at: `${formatDate(user.created_at)} ${createdDateKey}`,
        role: user.role ?? '',
        plan_tier: user.plan_tier ?? '',
      }
      const haystack = normalize(searchableFields[searchScope])

      if (tokens.length > 0 && !tokens.every(t => haystack.includes(t))) return false
      if (roleFilter  !== 'all' && (user.role === 'admin' ? 'admin' : 'user') !== roleFilter)  return false
      if (planFilter  !== 'all' && (user.plan_tier ?? 'gratuito') !== planFilter)               return false
      if (dateFrom && (!createdDateKey || createdDateKey < dateFrom)) return false
      if (dateTo && (!createdDateKey || createdDateKey > dateTo)) return false

      const hasUsage = user.alto_today > 0 || user.advanced_today > 0
      if (usageFilter === 'used_today'     && !hasUsage) return false
      if (usageFilter === 'no_usage_today' &&  hasUsage) return false
      return true
    })
  }, [users, search, searchScope, roleFilter, planFilter, usageFilter, dateFrom, dateTo])

  /* autocomplete suggestions: first 8 of filtered when searching */
  const suggestions = useMemo(() => {
    if (!search.trim()) return []
    return filteredUsers.slice(0, 8)
  }, [filteredUsers, search])

  const totalWithUsageToday = users.filter(u => u.alto_today > 0 || u.advanced_today > 0).length
  const totalAdmins  = users.filter(u => u.role === 'admin').length
  const totalPremium = users.filter(u => u.plan_tier === 'premium').length

  const selectedUser  = selectedUserId ? users.find(u => u.id === selectedUserId) ?? null : null
  const selectedDraft = selectedUser
    ? drafts[selectedUser.id] ?? {
        name: selectedUser.name ?? '',
        email: selectedUser.email ?? '',
        targetExam: selectedUser.target_exam ?? '',
        planTier: selectedUser.plan_tier ?? 'gratuito',
        role: selectedUser.role === 'admin' ? 'admin' : 'user',
      }
    : null

  const filtersDescription = useMemo(() => {
    const parts: string[] = []
    const scopeLabel = SEARCH_SCOPE_OPTIONS.find(option => option.value === searchScope)?.label ?? 'Busca'

    if (search.trim()) parts.push(`${scopeLabel}: "${search.trim()}"`)
    if (roleFilter !== 'all') parts.push(`Role: ${roleFilter}`)
    if (planFilter !== 'all') parts.push(`Plano: ${planFilter}`)
    if (usageFilter === 'used_today') parts.push('Uso hoje: com uso')
    if (usageFilter === 'no_usage_today') parts.push('Uso hoje: sem uso')
    if (dateFrom) parts.push(`Cadastro de: ${dateFrom}`)
    if (dateTo) parts.push(`Cadastro ate: ${dateTo}`)

    return parts.join(' | ')
  }, [search, searchScope, roleFilter, planFilter, usageFilter, dateFrom, dateTo])

  /* close autocomplete on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  /* ── save ─────────────────────────────────────────────── */
  async function handleSave(userId: string) {
    const draft = drafts[userId]
    if (!draft) return
    setSavingUserId(userId)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          targetExam: draft.targetExam,
          planTier: draft.planTier,
          role: draft.role,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar o usuário.')
      setNotice({ tone: data.auditWarning ? 'neutral' : 'success', text: data.message || 'Alterações salvas com sucesso.' })
      setSelectedUserId(null)
      startTransition(() => router.refresh())
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Falha inesperada ao atualizar o usuário.' })
    } finally {
      setSavingUserId(null)
    }
  }

  async function handleDelete(user: AdminUserRow) {
    const label = user.email || user.name || formatUserId(user.id)
    const confirmed = window.confirm(`Excluir definitivamente ${label}? Esta acao remove o usuario do Auth e do banco de dados.`)

    if (!confirmed) return

    setDeletingUserId(user.id)
    setNotice(null)

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Nao foi possivel excluir o usuario.')

      setNotice({ tone: data.auditWarning ? 'neutral' : 'success', text: data.message || 'Usuario excluido com sucesso.' })
      setSelectedUserId(null)
      startTransition(() => router.refresh())
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Falha inesperada ao excluir o usuario.' })
    } finally {
      setDeletingUserId(null)
    }
  }

  function handleExportPdf() {
    const pdf = buildUsersPdf(filteredUsers, filtersDescription)
    const blob = new Blob([pdf], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateKey = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `usuarios-studyai-${dateKey}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const isSaveDisabled = (user: AdminUserRow) =>
    savingUserId === user.id ||
    deletingUserId === user.id ||
    isPending ||
    (
      selectedDraft?.name.trim() === (user.name ?? '') &&
      selectedDraft?.email.trim().toLowerCase() === (user.email ?? '') &&
      selectedDraft?.targetExam.trim() === (user.target_exam ?? '') &&
      selectedDraft?.planTier === (user.plan_tier ?? 'gratuito') &&
      selectedDraft?.role     === (user.role === 'admin' ? 'admin' : 'user')
    )

  function updateSelectedDraft(userId: string, patch: Partial<UserDraft>) {
    setDrafts(cur => ({
      ...cur,
      [userId]: {
        ...(cur[userId] ?? {
          name: '',
          email: '',
          targetExam: '',
          planTier: 'gratuito',
          role: 'user',
        }),
        ...patch,
      },
    }))
  }

  return (
    <>
      <style>{`
        /* ── Variables ── */
        :root {
          --surf:   #111420;
          --surf2:  #181d2e;
          --border: #1f2640;
          --text:   #e8eaf6;
          --muted:  #6b7194;
          --accent: #6c63ff;
        }

        /* ── Shell ── */
        .aup-shell {
          background: var(--surf);
          border: 1px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
        }

        /* ── Header ── */
        .aup-header {
          padding: 18px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .aup-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(110px, 1fr));
          gap: 10px;
          min-width: 340px;
        }
        .aup-stat {
          background: var(--surf2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 14px;
        }
        .aup-stat-label {
          font-size: 10px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .aup-stat-value {
          font-size: 24px;
          font-weight: 800;
          margin-top: 6px;
        }

        /* ── Filters ── */
        .aup-filters {
          padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          display: grid;
          grid-template-columns: minmax(260px, 2fr) repeat(4, minmax(140px, 1fr)) auto;
          align-items: center;
          gap: 12px;
        }
        .aup-filters > * { min-width: 0; }

        /* ── Search wrapper ── */
        .aup-search-wrap {
          position: relative;
        }
        .aup-search-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          pointer-events: none;
        }
        .aup-search-input {
          width: 100%;
          background: var(--surf2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          padding: 10px 12px 10px 38px;
          font-size: 13px;
          outline: none;
          transition: border-color .15s;
          box-sizing: border-box;
        }
        .aup-search-input:focus {
          border-color: rgba(108,99,255,.5);
        }

        /* ── Autocomplete dropdown ── */
        .aup-autocomplete {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: var(--surf2);
          border: 1px solid rgba(108,99,255,.35);
          border-radius: 12px;
          overflow: hidden;
          z-index: 60;
          box-shadow: 0 16px 48px rgba(0,0,0,.5);
          animation: aup-fade-in .12s ease;
        }
        @keyframes aup-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .aup-autocomplete-header {
          padding: 8px 14px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--muted);
          border-bottom: 1px solid var(--border);
        }
        .aup-suggestion {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          border: none;
          background: transparent;
          color: var(--text);
          cursor: pointer;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,.04);
          transition: background .1s;
        }
        .aup-suggestion:last-child { border-bottom: none; }
        .aup-suggestion:hover, .aup-suggestion:focus-visible {
          background: rgba(108,99,255,.1);
          outline: none;
        }
        .aup-suggestion-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .aup-suggestion-email {
          font-size: 11px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .aup-suggestion-badge {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 999px;
          padding: 3px 8px;
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .aup-autocomplete-empty {
          padding: 14px;
          text-align: center;
          font-size: 12px;
          color: var(--muted);
        }

        /* ── Filter selects ── */
        .aup-select {
          width: 100%;
          background: var(--surf2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          transition: border-color .15s;
        }
        .aup-select:focus { border-color: rgba(108,99,255,.5); }
        .aup-date-input {
          width: 100%;
          background: var(--surf2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }
        .aup-export-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 40px;
          padding: 10px 13px;
          border: 1px solid rgba(96,165,250,.28);
          border-radius: 10px;
          background: rgba(96,165,250,.12);
          color: #93c5fd;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
        .aup-export-btn:disabled {
          opacity: .52;
          cursor: default;
        }
        .aup-filter-caption {
          color: var(--muted);
          font-size: 10px;
          line-height: 1;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: .8px;
          font-weight: 700;
        }

        /* ── Notice ── */
        .aup-notice {
          margin: 14px 20px 0;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 13px;
        }

        /* ── Table section ── */
        .aup-table-meta {
          padding: 10px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: var(--muted);
        }
        .aup-table-wrap {
          overflow-x: auto;
          scrollbar-gutter: stable;
        }
        .aup-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 820px;
        }
        .aup-table thead th {
          padding: 11px 14px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--muted);
          text-align: left;
          white-space: nowrap;
          border-bottom: 1px solid var(--border);
          background: rgba(7,10,18,.3);
          position: sticky;
          top: 0;
        }
        .aup-table tbody tr {
          border-bottom: 1px solid rgba(255,255,255,.04);
          transition: background .12s;
        }
        .aup-table tbody tr:hover {
          background: rgba(108,99,255,.06);
        }
        .aup-table tbody tr:last-child {
          border-bottom: none;
        }
        .aup-table td {
          padding: 12px 14px;
          font-size: 13px;
          color: var(--text);
          vertical-align: middle;
        }
        .aup-cell-user-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
        }
        .aup-cell-user-email {
          font-size: 11px;
          color: var(--muted);
          white-space: nowrap;
          margin-top: 2px;
        }
        .aup-cell-user-id {
          font-size: 10px;
          color: rgba(107,113,148,.6);
          margin-top: 2px;
          font-family: monospace;
        }
        .aup-role-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
        }
        .aup-plan-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid rgba(255,255,255,.08);
        }
        .aup-usage-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .aup-usage-alto {
          font-size: 12px;
          color: #34d399;
          font-weight: 700;
        }
        .aup-usage-adv {
          font-size: 12px;
          color: #60a5fa;
          font-weight: 700;
        }
        .aup-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          background: rgba(108,99,255,.12);
          border: 1px solid rgba(108,99,255,.25);
          border-radius: 8px;
          color: #a5b4fc;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background .14s, border-color .14s;
          white-space: nowrap;
        }
        .aup-edit-btn:hover {
          background: rgba(108,99,255,.22);
          border-color: rgba(108,99,255,.5);
        }
        .aup-empty {
          padding: 44px 20px;
          text-align: center;
          color: var(--muted);
          font-size: 13px;
        }

        /* ── Modal ── */
        .aup-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(3,6,14,.72);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          animation: aup-fade-in .15s ease;
        }
        .aup-dialog {
          width: min(100%, 580px);
          max-height: calc(100vh - 44px);
          overflow-y: auto;
          background: var(--surf);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: 0 32px 100px rgba(0,0,0,.6);
          animation: aup-dialog-in .18s ease;
        }
        @keyframes aup-dialog-in {
          from { opacity: 0; transform: scale(.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)  translateY(0);    }
        }
        .aup-dialog-header {
          padding: 18px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
        }
        .aup-dialog-title {
          color: var(--text);
          font-size: 18px;
          font-weight: 800;
        }
        .aup-dialog-subtitle {
          color: var(--muted);
          font-size: 12px;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .aup-dialog-close {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surf2);
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background .12s;
        }
        .aup-dialog-close:hover { background: rgba(255,255,255,.06); }
        .aup-dialog-body {
          padding: 18px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .aup-dialog-grid2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .aup-info-field {
          background: var(--surf2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
        }
        .aup-info-label {
          display: block;
          color: var(--muted);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 7px;
          font-weight: 700;
        }
        .aup-info-value {
          color: var(--text);
          font-size: 13px;
          word-break: break-word;
        }
        .aup-field-label {
          display: block;
          color: var(--muted);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 7px;
          font-weight: 700;
        }
        .aup-dialog select,
        .aup-dialog input {
          width: 100%;
          background: var(--surf2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          transition: border-color .15s;
        }
        .aup-dialog input { cursor: text; box-sizing: border-box; }
        .aup-dialog select:focus,
        .aup-dialog input:focus { border-color: rgba(108,99,255,.5); }
        .aup-danger-zone {
          margin-top: 4px;
          padding: 12px;
          border: 1px solid rgba(239,68,68,.22);
          border-radius: 12px;
          background: rgba(239,68,68,.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .aup-danger-title {
          color: #fecaca;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 3px;
        }
        .aup-danger-copy {
          color: rgba(254,202,202,.72);
          font-size: 11px;
          line-height: 1.45;
        }
        .aup-dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .aup-btn-cancel {
          padding: 11px 16px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background .12s;
        }
        .aup-btn-cancel:hover { background: rgba(255,255,255,.04); }
        .aup-btn-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid rgba(239,68,68,.34);
          background: rgba(239,68,68,.12);
          color: #fca5a5;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: background .14s, border-color .14s, color .14s;
        }
        .aup-btn-delete:hover:not(:disabled) {
          background: rgba(239,68,68,.2);
          border-color: rgba(239,68,68,.55);
          color: #fecaca;
        }
        .aup-btn-delete:disabled {
          opacity: .55;
          cursor: default;
        }
        .aup-btn-save {
          padding: 11px 18px;
          border-radius: 10px;
          border: none;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: background .14s, color .14s;
        }
        .aup-btn-save:not(:disabled) {
          background: var(--accent);
          color: #fff;
        }
        .aup-btn-save:disabled {
          background: var(--surf2);
          color: var(--muted);
          cursor: default;
        }

        /* ── Responsive ── */
        @media (max-width: 1180px) {
          .aup-stats    { min-width: 100%; }
          .aup-filters  { grid-template-columns: repeat(2, minmax(200px, 1fr)); }
          .aup-export-btn { width: 100%; }
        }
        @media (max-width: 760px) {
          .aup-filters  { grid-template-columns: 1fr; }
          .aup-stats    { grid-template-columns: 1fr; }
          .aup-dialog-grid2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="aup-shell">

        {/* ── Header ────────────────────────────────────── */}
        <div className="aup-header">
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#e8eaf6)' }}>Gestão de usuários</div>
            <div style={{ fontSize: '12px', color: 'var(--muted,#6b7194)', marginTop: '4px', maxWidth: '560px', lineHeight: 1.6 }}>
              Promova ou revogue administradores, ajuste planos e acompanhe o consumo do dia com filtros operacionais.
            </div>
          </div>
          <div className="aup-stats">
            {[
              { label: 'Admins',   value: String(totalAdmins),         color: '#fbbf24' },
              { label: 'Premium',  value: String(totalPremium),         color: '#60a5fa' },
              { label: 'Uso hoje', value: String(totalWithUsageToday),  color: '#34d399' },
            ].map(item => (
              <div key={item.label} className="aup-stat">
                <div className="aup-stat-label">{item.label}</div>
                <div className="aup-stat-value" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────── */}
        <div className="aup-filters">

          {/* Search with autocomplete */}
          <div className="aup-search-wrap" ref={searchRef}>
            <Search aria-hidden="true" size={15} className="aup-search-icon" />
            <input
              ref={inputRef}
              className="aup-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Buscar por nome, email, id, role ou concurso…"
              autoComplete="off"
            />

            {/* Autocomplete dropdown */}
            {searchFocused && search.trim() && (
              <div className="aup-autocomplete" role="listbox" aria-label="Sugestões de usuários">
                <div className="aup-autocomplete-header">
                  {suggestions.length > 0
                    ? `${suggestions.length} sugestão${suggestions.length > 1 ? 'ões' : ''} — clique para editar`
                    : 'Buscando…'}
                </div>

                {suggestions.length === 0 ? (
                  <div className="aup-autocomplete-empty">Nenhum usuário encontrado.</div>
                ) : suggestions.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    role="option"
                    className="aup-suggestion"
                    onMouseDown={e => {
                      e.preventDefault()
                      setSearch('')
                      setSearchFocused(false)
                      setSelectedUserId(user.id)
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="aup-suggestion-name">{user.name || 'Sem nome'}</div>
                      <div className="aup-suggestion-email">{user.email || formatUserId(user.id)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <span className="aup-suggestion-badge" style={{ color: user.role === 'admin' ? '#fbbf24' : 'var(--muted)', borderColor: user.role === 'admin' ? 'rgba(251,191,36,.25)' : 'rgba(255,255,255,.08)' }}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                      <span className="aup-suggestion-badge" style={{ color: planColor(user.plan_tier), borderColor: 'rgba(255,255,255,.08)' }}>
                        {user.plan_tier ?? 'gratuito'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <select className="aup-select" value={searchScope} onChange={e => setSearchScope(e.target.value as typeof searchScope)}>
            {SEARCH_SCOPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select className="aup-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}>
            <option value="all">Todas as roles</option>
            <option value="admin">Apenas admins</option>
            <option value="user">Apenas users</option>
          </select>

          <select className="aup-select" value={planFilter} onChange={e => setPlanFilter(e.target.value as typeof planFilter)}>
            <option value="all">Todos os planos</option>
            <option value="gratuito">Gratuito</option>
            <option value="basico">Básico</option>
            <option value="premium">Premium</option>
          </select>

          <select className="aup-select" value={usageFilter} onChange={e => setUsageFilter(e.target.value as typeof usageFilter)}>
            <option value="all">Todo uso de hoje</option>
            <option value="used_today">Com uso hoje</option>
            <option value="no_usage_today">Sem uso hoje</option>
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
            <div>
              <div className="aup-filter-caption">De</div>
              <input
                className="aup-date-input"
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <div className="aup-filter-caption">Ate</div>
              <input
                className="aup-date-input"
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            className="aup-export-btn"
            onClick={handleExportPdf}
            disabled={filteredUsers.length === 0}
          >
            <Download size={15} />
            Exportar PDF
          </button>
        </div>

        {/* ── Notice ───────────────────────────────────── */}
        {notice && (
          <div className="aup-notice" style={noticeStyles(notice.tone)}>
            {notice.text}
          </div>
        )}

        {/* ── Table meta ───────────────────────────────── */}
        <div className="aup-table-meta">
          <span>{filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}</span>
          <span>Clique em <strong style={{ color: 'var(--text)' }}>Editar</strong> para abrir a caixa de alterações</span>
        </div>

        {/* ── Table ────────────────────────────────────── */}
        <div className="aup-table-wrap">
          {filteredUsers.length === 0 ? (
            <div className="aup-empty">Nenhum usuário encontrado com os filtros atuais.</div>
          ) : (
            <table className="aup-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Role</th>
                  <th>Plano</th>
                  <th>Concurso</th>
                  <th>Uso hoje</th>
                  <th>Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    {/* Usuário */}
                    <td>
                      <div className="aup-cell-user-name">{user.name || 'Sem nome'}</div>
                      <div className="aup-cell-user-email">{user.email || '—'}</div>
                      <div className="aup-cell-user-id">{formatUserId(user.id)}</div>
                    </td>

                    {/* Role */}
                    <td>
                      <span
                        className="aup-role-badge"
                        style={
                          user.role === 'admin'
                            ? { background: 'rgba(251,191,36,.12)', border: '1px solid rgba(251,191,36,.25)', color: '#fbbf24' }
                            : { background: 'rgba(107,113,148,.1)', border: '1px solid rgba(107,113,148,.2)',  color: '#6b7194' }
                        }
                      >
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>

                    {/* Plano */}
                    <td>
                      <span
                        className="aup-plan-badge"
                        style={{ color: planColor(user.plan_tier) }}
                      >
                        {user.plan_tier ?? 'gratuito'}
                      </span>
                    </td>

                    {/* Concurso */}
                    <td style={{ color: 'var(--muted,#6b7194)', fontSize: '12px' }}>
                      {user.target_exam || '—'}
                    </td>

                    {/* Uso hoje */}
                    <td>
                      <div className="aup-usage-cell">
                        <span className="aup-usage-alto">Alto: {user.alto_today}</span>
                        <span className="aup-usage-adv">Avanç.: {user.advanced_today}</span>
                      </div>
                    </td>

                    {/* Cadastro */}
                    <td style={{ color: 'var(--muted,#6b7194)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {formatDate(user.created_at)}
                    </td>

                    {/* Ações */}
                    <td>
                      <button
                        type="button"
                        className="aup-edit-btn"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Edit Modal ───────────────────────────────── */}
        {selectedUser && selectedDraft && (
          <div
            className="aup-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Alterar usuário"
            onClick={e => { if (e.target === e.currentTarget) setSelectedUserId(null) }}
          >
            <div className="aup-dialog">
              <div className="aup-dialog-header">
                <div style={{ minWidth: 0 }}>
                  <div className="aup-dialog-title">{selectedUser.name || 'Sem nome'}</div>
                  <div className="aup-dialog-subtitle">{selectedUser.email || formatUserId(selectedUser.id)}</div>
                </div>
                <button type="button" className="aup-dialog-close" onClick={() => setSelectedUserId(null)} aria-label="Fechar">
                  <X size={16} />
                </button>
              </div>

              <div className="aup-dialog-body">
                {/* Info fields */}
                <div className="aup-dialog-grid2">
                  <div className="aup-info-field">
                    <label className="aup-info-label">ID</label>
                    <div className="aup-info-value" style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                      {selectedUser.id}
                    </div>
                  </div>
                  <div className="aup-info-field">
                    <label className="aup-info-label">Criado em</label>
                    <div className="aup-info-value">{formatDate(selectedUser.created_at)}</div>
                  </div>
                  <div className="aup-info-field">
                    <label className="aup-info-label">Uso hoje</label>
                    <div className="aup-info-value" style={{ display: 'flex', gap: '10px' }}>
                      <span style={{ color: '#34d399' }}>Alto: {selectedUser.alto_today}</span>
                      <span style={{ color: '#60a5fa' }}>Avanç.: {selectedUser.advanced_today}</span>
                    </div>
                  </div>
                  <div className="aup-info-field">
                    <label className="aup-info-label">Status</label>
                    <div className="aup-info-value">
                      {(selectedUser.role === 'admin' ? 'Admin' : 'User')}{' / '}{selectedUser.plan_tier || 'gratuito'}
                    </div>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="aup-dialog-grid2">
                  <div>
                    <label className="aup-field-label">Nome</label>
                    <input
                      value={selectedDraft.name}
                      disabled={savingUserId === selectedUser.id || deletingUserId === selectedUser.id || isPending}
                      onChange={e => updateSelectedDraft(selectedUser.id, { name: e.target.value })}
                      placeholder="Nome do usuario"
                    />
                  </div>
                  <div>
                    <label className="aup-field-label">Email</label>
                    <input
                      type="email"
                      value={selectedDraft.email}
                      disabled={savingUserId === selectedUser.id || deletingUserId === selectedUser.id || isPending}
                      onChange={e => updateSelectedDraft(selectedUser.id, { email: e.target.value })}
                      placeholder="email@dominio.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="aup-field-label">Concurso</label>
                  <input
                    value={selectedDraft.targetExam}
                    disabled={savingUserId === selectedUser.id || deletingUserId === selectedUser.id || isPending}
                    onChange={e => updateSelectedDraft(selectedUser.id, { targetExam: e.target.value })}
                    placeholder="Ex: TRF 1a Regiao, AGU, TCU"
                  />
                </div>

                <div className="aup-dialog-grid2">
                  <div>
                    <label className="aup-field-label">Role</label>
                    <select
                      value={selectedDraft.role}
                      disabled={savingUserId === selectedUser.id || deletingUserId === selectedUser.id || isPending}
                      onChange={e => updateSelectedDraft(selectedUser.id, { role: e.target.value })}
                    >
                      {ROLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="aup-field-label">Plano</label>
                    <select
                      value={selectedDraft.planTier}
                      disabled={savingUserId === selectedUser.id || deletingUserId === selectedUser.id || isPending}
                      onChange={e => updateSelectedDraft(selectedUser.id, { planTier: e.target.value })}
                    >
                      {PLAN_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="aup-danger-zone">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="aup-danger-title">Excluir usuario</div>
                    <div className="aup-danger-copy">
                      Remove o usuario do Supabase Auth. As tabelas vinculadas por cascade tambem sao limpas no banco.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="aup-btn-delete"
                    disabled={savingUserId === selectedUser.id || deletingUserId === selectedUser.id || isPending}
                    onClick={() => handleDelete(selectedUser)}
                  >
                    <Trash2 size={13} />
                    {deletingUserId === selectedUser.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>

                {/* Actions */}
                <div className="aup-dialog-actions">
                  <button
                    type="button"
                    className="aup-btn-cancel"
                    disabled={savingUserId === selectedUser.id || deletingUserId === selectedUser.id || isPending}
                    onClick={() => setSelectedUserId(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="aup-btn-save"
                    disabled={isSaveDisabled(selectedUser)}
                    onClick={() => handleSave(selectedUser.id)}
                  >
                    {savingUserId === selectedUser.id ? 'Salvando...' : 'Salvar alteracoes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
