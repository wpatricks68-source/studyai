'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'low' | 'medium' | 'high' | 'urgent'
type Category = 'geral' | 'estudo' | 'tarefa' | 'ideia' | 'revisao'

interface Note {
  id: string
  title: string
  content: string
  priority: Priority
  category: Category
  pinned: boolean
  done: boolean
  color: string
  createdAt: string
  updatedAt: string
  dueDate?: string
  tags: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  low:    { label: 'Baixa',   color: '#10b981', bg: 'rgba(16,185,129,0.12)',  dot: '#10b981' },
  medium: { label: 'Média',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b' },
  high:   { label: 'Alta',    color: '#f97316', bg: 'rgba(249,115,22,0.12)', dot: '#f97316' },
  urgent: { label: 'Urgente', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  dot: '#ef4444' },
}

const CATEGORY_CONFIG: Record<Category, { label: string; icon: string }> = {
  geral:   { label: 'Geral',    icon: '📌' },
  estudo:  { label: 'Estudo',   icon: '📚' },
  tarefa:  { label: 'Tarefa',   icon: '✅' },
  ideia:   { label: 'Ideia',    icon: '💡' },
  revisao: { label: 'Revisão',  icon: '🔁' },
}

const NOTE_COLORS = [
  'transparent',
  'rgba(116,97,255,0.08)',
  'rgba(0,229,176,0.08)',
  'rgba(245,158,11,0.08)',
  'rgba(239,68,68,0.08)',
  'rgba(99,179,237,0.08)',
  'rgba(236,72,153,0.08)',
]

const COLOR_LABELS = ['Padrão', 'Roxo', 'Verde', 'Âmbar', 'Vermelho', 'Azul', 'Rosa']

const COLOR_DOTS = [
  'var(--border)',
  '#7461ff',
  '#00e5b0',
  '#f59e0b',
  '#ef4444',
  '#63b3ed',
  '#ec4899',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'studyai_lembretes_v1'

function loadNotes(): Note[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  } catch { /* ignore */ }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 11,
      fontWeight: 600,
      color: cfg.color,
      background: cfg.bg,
      borderRadius: 20,
      padding: '2px 8px',
      letterSpacing: '0.3px',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {cfg.label}
    </span>
  )
}

function CategoryBadge({ category }: { category: Category }) {
  const cfg = CATEGORY_CONFIG[category]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      fontWeight: 500,
      color: 'var(--muted)',
      background: 'var(--surface2)',
      borderRadius: 20,
      padding: '2px 8px',
    }}>
      <span style={{ fontSize: 10 }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

function TagChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 10,
      fontWeight: 500,
      color: 'var(--accent)',
      background: 'rgba(116,97,255,0.1)',
      border: '1px solid rgba(116,97,255,0.2)',
      borderRadius: 20,
      padding: '1px 7px',
    }}>
      #{label}
      {onRemove && (
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', lineHeight: 1, padding: 0, marginLeft: 1, fontSize: 12 }}>×</button>
      )}
    </span>
  )
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  onEdit,
  onDelete,
  onToggleDone,
  onTogglePin,
}: {
  note: Note
  onEdit: (n: Note) => void
  onDelete: (id: string) => void
  onToggleDone: (id: string) => void
  onTogglePin: (id: string) => void
}) {
  const [hovering, setHovering] = useState(false)
  const overdue = isOverdue(note.dueDate) && !note.done
  const pCfg = PRIORITY_CONFIG[note.priority]

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        position: 'relative',
        background: note.color === 'transparent' ? 'var(--surface)' : note.color,
        border: `1px solid ${note.done ? 'var(--border)' : hovering ? 'rgba(116,97,255,0.35)' : 'var(--card-border)'}`,
        borderLeft: `3px solid ${pCfg.dot}`,
        borderRadius: 14,
        padding: '14px 16px',
        transition: 'all .2s cubic-bezier(.4,0,.2,1)',
        transform: hovering ? 'translateY(-2px)' : 'none',
        boxShadow: hovering ? '0 8px 32px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.1)',
        opacity: note.done ? 0.65 : 1,
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 120,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {/* Checkbox */}
          <button
            onClick={() => onToggleDone(note.id)}
            title={note.done ? 'Marcar como pendente' : 'Marcar como concluído'}
            style={{
              flexShrink: 0,
              width: 18,
              height: 18,
              borderRadius: 5,
              border: `2px solid ${note.done ? pCfg.dot : 'var(--border)'}`,
              background: note.done ? pCfg.dot : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all .15s ease',
              padding: 0,
            }}
          >
            {note.done && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* Title */}
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text)',
            textDecoration: note.done ? 'line-through' : 'none',
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}>
            {note.pinned && <span title="Fixado" style={{ marginRight: 5, fontSize: 12 }}>📌</span>}
            {note.title || <em style={{ color: 'var(--muted)', fontWeight: 400 }}>Sem título</em>}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, opacity: hovering ? 1 : 0, transition: 'opacity .15s ease' }}>
          <ActionBtn title={note.pinned ? 'Desafixar' : 'Fixar'} onClick={() => onTogglePin(note.id)}>
            {note.pinned
              ? <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L9.5 6.5H15L10.5 10L12 15.5L8 12L4 15.5L5.5 10L1 6.5H6.5L8 1Z"/></svg>
              : <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1L9.5 6.5H15L10.5 10L12 15.5L8 12L4 15.5L5.5 10L1 6.5H6.5L8 1Z"/></svg>
            }
          </ActionBtn>
          <ActionBtn title="Editar" onClick={() => onEdit(note)}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11.5 2.5l2 2L6 12H4v-2l7.5-7.5z" />
            </svg>
          </ActionBtn>
          <ActionBtn title="Excluir" onClick={() => onDelete(note.id)} danger>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 8.5h5L11 4" />
            </svg>
          </ActionBtn>
        </div>
      </div>

      {/* Content */}
      {note.content && (
        <p style={{
          fontSize: 13,
          color: 'var(--muted)',
          lineHeight: 1.55,
          margin: 0,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textDecoration: note.done ? 'line-through' : 'none',
        }}>
          {note.content}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {note.tags.map(tag => <TagChip key={tag} label={tag} />)}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <PriorityBadge priority={note.priority} />
          <CategoryBadge category={note.category} />
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {note.dueDate && (
            <div style={{ fontSize: 10, color: overdue ? '#ef4444' : 'var(--muted)', fontWeight: 500, marginBottom: 1 }}>
              {overdue ? '⚠ ' : ''}Vence: {formatDate(note.dueDate)}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            {formatDate(note.updatedAt)} · {formatTime(note.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean }) {
  const [h, setH] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: 26,
        height: 26,
        borderRadius: 7,
        border: 'none',
        background: h ? (danger ? 'rgba(239,68,68,0.15)' : 'var(--surface2)') : 'transparent',
        color: h ? (danger ? '#ef4444' : 'var(--text)') : 'var(--muted)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all .12s ease',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}

// ─── Modal / Form ─────────────────────────────────────────────────────────────

function NoteModal({
  note,
  onSave,
  onClose,
}: {
  note: Partial<Note> | null
  onSave: (n: Partial<Note>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [priority, setPriority] = useState<Priority>(note?.priority ?? 'medium')
  const [category, setCategory] = useState<Category>(note?.category ?? 'geral')
  const [color, setColor] = useState(note?.color ?? 'transparent')
  const [dueDate, setDueDate] = useState(note?.dueDate ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(note?.tags ?? [])
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [])

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  function handleSave() {
    onSave({ title, content, priority, category, color, dueDate: dueDate || undefined, tags })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,5,10,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn .15s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .note-modal-form input, .note-modal-form textarea, .note-modal-form select {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          font-family: inherit;
          font-size: 13px;
          padding: 9px 12px;
          outline: none;
          transition: border-color .15s ease;
          resize: vertical;
        }
        .note-modal-form input:focus, .note-modal-form textarea:focus, .note-modal-form select:focus {
          border-color: var(--accent);
        }
        .note-modal-form select option { background: var(--surface); color: var(--text); }
        .note-modal-form label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }
      `}</style>

      <div
        className="note-modal-form"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--card-border)',
          borderRadius: 18,
          padding: '24px',
          width: '100%',
          maxWidth: 540,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {note?.id ? '✏️ Editar Lembrete' : '✨ Novo Lembrete'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, lineHeight: 1, padding: 4, borderRadius: 6 }}
          >×</button>
        </div>

        {/* Title */}
        <div>
          <label>Título</label>
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="O que você precisa lembrar?"
            maxLength={120}
          />
        </div>

        {/* Content */}
        <div>
          <label>Descrição</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Adicione mais detalhes..."
            rows={4}
            style={{ minHeight: 90 }}
          />
        </div>

        {/* Priority + Category */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>Prioridade</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Categoria</label>
            <select value={category} onChange={e => setCategory(e.target.value as Category)}>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label>Data de vencimento (opcional)</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>

        {/* Color */}
        <div>
          <label>Cor do cartão</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {NOTE_COLORS.map((c, i) => (
              <button
                key={i}
                title={COLOR_LABELS[i]}
                onClick={() => setColor(c)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  border: color === c ? '2px solid var(--accent)' : '2px solid var(--border)',
                  background: i === 0 ? 'var(--surface2)' : c,
                  cursor: 'pointer',
                  transition: 'all .12s ease',
                  boxShadow: color === c ? '0 0 0 2px rgba(116,97,255,0.3)' : 'none',
                  position: 'relative',
                }}
              >
                {i === 0 && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--muted)' }}>–</span>}
                {color === c && i !== 0 && (
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2L8 3" stroke={COLOR_DOTS[i]} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label>Tags</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {tags.map(t => <TagChip key={t} label={t} onRemove={() => removeTag(t)} />)}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="Adicionar tag e pressionar Enter..."
              style={{ flex: 1 }}
            />
            <button
              onClick={addTag}
              style={{
                padding: '9px 14px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >+ Tag</button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >Cancelar</button>
          <button
            onClick={handleSave}
            style={{
              padding: '9px 22px',
              background: 'linear-gradient(135deg, var(--accent) 0%, rgba(91,200,255,0.9) 100%)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(116,97,255,0.35)',
            }}
          >
            {note?.id ? 'Salvar alterações' : 'Criar lembrete'}
          </button>
        </div>

        <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>
          Ctrl+Enter para salvar · Esc para fechar
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '60px 24px', textAlign: 'center' }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 22,
        background: 'rgba(116,97,255,0.1)',
        border: '1px solid rgba(116,97,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 36,
      }}>📝</div>
      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Nenhum lembrete ainda</h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', maxWidth: 280 }}>
          Crie seu primeiro lembrete para organizar suas tarefas, ideias e revisões!
        </p>
      </div>
      <button
        onClick={onNew}
        style={{
          padding: '10px 22px',
          background: 'linear-gradient(135deg, var(--accent) 0%, rgba(91,200,255,0.9) 100%)',
          border: 'none',
          borderRadius: 12,
          color: '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 4px 20px rgba(116,97,255,0.35)',
        }}
      >
        + Criar primeiro lembrete
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotesBoard() {
  const [notes, setNotes] = useState<Note[]>([])
  const [modalNote, setModalNote] = useState<Partial<Note> | null>(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'done'>('all')
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'priority' | 'due'>('updated')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    setNotes(loadNotes())
  }, [])

  // Persist on change
  useEffect(() => {
    if (notes.length > 0 || localStorage.getItem(STORAGE_KEY)) {
      saveNotes(notes)
    }
  }, [notes])

  // Derived stats
  const total = notes.length
  const done = notes.filter(n => n.done).length
  const pinned = notes.filter(n => n.pinned).length
  const urgent = notes.filter(n => n.priority === 'urgent' && !n.done).length
  const overdue = notes.filter(n => isOverdue(n.dueDate) && !n.done).length

  // Filtered & sorted
  const filtered = notes
    .filter(n => {
      if (filterPriority !== 'all' && n.priority !== filterPriority) return false
      if (filterCategory !== 'all' && n.category !== filterCategory) return false
      if (filterStatus === 'active' && n.done) return false
      if (filterStatus === 'done' && !n.done) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some(t => t.includes(q))
        )
      }
      return true
    })
    .sort((a, b) => {
      // Pinned first
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      // Then done at bottom
      if (a.done && !b.done) return 1
      if (!a.done && b.done) return -1
      if (sortBy === 'priority') {
        const order: Priority[] = ['urgent', 'high', 'medium', 'low']
        return order.indexOf(a.priority) - order.indexOf(b.priority)
      }
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'due') {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  function openNew() {
    setModalNote({})
  }

  function openEdit(note: Note) {
    setModalNote(note)
  }

  function handleSave(partial: Partial<Note>) {
    const now = new Date().toISOString()
    if (modalNote?.id) {
      setNotes(prev => prev.map(n =>
        n.id === modalNote.id
          ? { ...n, ...partial, updatedAt: now }
          : n
      ))
    } else {
      const newNote: Note = {
        id: uid(),
        title: partial.title ?? '',
        content: partial.content ?? '',
        priority: partial.priority ?? 'medium',
        category: partial.category ?? 'geral',
        pinned: false,
        done: false,
        color: partial.color ?? 'transparent',
        createdAt: now,
        updatedAt: now,
        dueDate: partial.dueDate,
        tags: partial.tags ?? [],
      }
      setNotes(prev => [newNote, ...prev])
    }
    setModalNote(null)
  }

  function handleDelete(id: string) {
    if (deleteConfirm === id) {
      setNotes(prev => prev.filter(n => n.id !== id))
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  function toggleDone(id: string) {
    const now = new Date().toISOString()
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, done: !n.done, updatedAt: now } : n
    ))
  }

  function togglePin(id: string) {
    const now = new Date().toISOString()
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, pinned: !n.pinned, updatedAt: now } : n
    ))
  }

  function clearDone() {
    setNotes(prev => prev.filter(n => !n.done))
  }

  const hasFilters = filterPriority !== 'all' || filterCategory !== 'all' || filterStatus !== 'all' || search !== ''

  return (
    <>
      <style>{`
        .nb-btn-filter {
          padding: 6px 13px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all .15s ease;
          font-family: inherit;
        }
        .nb-btn-filter:hover, .nb-btn-filter.active {
          background: rgba(116,97,255,0.12);
          border-color: rgba(116,97,255,0.35);
          color: var(--accent);
        }
        .nb-btn-filter.active {
          font-weight: 600;
        }
        .nb-select {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          font-size: 12px;
          padding: 6px 10px;
          cursor: pointer;
          outline: none;
          font-family: inherit;
        }
        .nb-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        @media (max-width: 600px) {
          .nb-grid { grid-template-columns: 1fr; }
        }
        .nb-stat-card {
          background: var(--surface);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
      `}</style>

      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
              📝 Lembretes
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              {total === 0 ? 'Nenhum lembrete' : `${total} lembrete${total !== 1 ? 's' : ''} · ${done} concluído${done !== 1 ? 's' : ''}`}
              {pinned > 0 && ` · ${pinned} fixado${pinned !== 1 ? 's' : ''}`}
              {overdue > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}> · {overdue} vencido{overdue !== 1 ? 's' : ''}</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {done > 0 && (
              <button
                onClick={clearDone}
                style={{
                  padding: '9px 14px',
                  background: 'transparent',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 11,
                  color: 'rgba(239,68,68,0.8)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              >
                🗑 Limpar concluídos
              </button>
            )}
            <button
              onClick={openNew}
              style={{
                padding: '9px 18px',
                background: 'linear-gradient(135deg, var(--accent) 0%, rgba(91,200,255,0.85) 100%)',
                border: 'none',
                borderRadius: 11,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                boxShadow: '0 4px 18px rgba(116,97,255,0.35)',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M8 2v12M2 8h12" strokeLinecap="round" />
              </svg>
              Novo lembrete
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        {total > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {[
              { icon: '📋', label: 'Total', value: total, color: 'var(--accent)' },
              { icon: '✅', label: 'Concluídos', value: done, color: '#10d494' },
              { icon: '⏳', label: 'Pendentes', value: total - done, color: '#f59e0b' },
              { icon: '🚨', label: 'Urgentes', value: urgent, color: '#ef4444' },
              { icon: '⚠️', label: 'Vencidos', value: overdue, color: '#ef4444' },
            ].map(stat => (
              <div key={stat.label} className="nb-stat-card">
                <span style={{ fontSize: 20 }}>{stat.icon}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: stat.value > 0 && stat.label !== 'Total' && stat.label !== 'Concluídos' ? stat.color : 'var(--text)' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Search + Filters ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <svg
              width="14" height="14"
              viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}
            >
              <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, conteúdo ou tag..."
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '10px 12px 10px 34px',
                color: 'var(--text)',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color .15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: 2 }}
              >×</button>
            )}
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status:</span>
            {(['all', 'active', 'done'] as const).map(s => (
              <button key={s} className={`nb-btn-filter${filterStatus === s ? ' active' : ''}`} onClick={() => setFilterStatus(s)}>
                {s === 'all' ? 'Todos' : s === 'active' ? 'Pendentes' : 'Concluídos'}
              </button>
            ))}
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginLeft: 6 }}>Prioridade:</span>
            <select className="nb-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | 'all')}>
              <option value="all">Todas</option>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoria:</span>
            <select className="nb-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value as Category | 'all')}>
              <option value="all">Todas</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginLeft: 6 }}>Ordenar:</span>
            <select className="nb-select" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
              <option value="updated">Última edição</option>
              <option value="created">Data de criação</option>
              <option value="priority">Prioridade</option>
              <option value="due">Vencimento</option>
            </select>
            {hasFilters && (
              <button
                className="nb-btn-filter"
                onClick={() => { setSearch(''); setFilterPriority('all'); setFilterCategory('all'); setFilterStatus('all') }}
                style={{ marginLeft: 4, color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)' }}
              >
                ✕ Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── Notes Grid ── */}
        {filtered.length === 0 && total === 0 ? (
          <EmptyState onNew={openNew} />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <p style={{ margin: 0 }}>Nenhum lembrete encontrado para os filtros aplicados.</p>
          </div>
        ) : (
          <div className="nb-grid">
            {filtered.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggleDone={toggleDone}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        )}

        {/* Delete confirm hint */}
        {deleteConfirm && (
          <div style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12,
            padding: '10px 18px',
            color: '#ef4444',
            fontSize: 13,
            fontWeight: 500,
            backdropFilter: 'blur(8px)',
            zIndex: 9998,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            Clique em excluir novamente para confirmar
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalNote !== null && (
        <NoteModal
          note={modalNote}
          onSave={handleSave}
          onClose={() => setModalNote(null)}
        />
      )}
    </>
  )
}
