'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, Pencil, Save, Target, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DailyStudyLog, PlannerSubject } from '@/types/database'

type FormState = {
  study_date: string
  subject: string
  target_status: 'nao_concluido' | 'parcial' | 'concluido'
  planned_unit: 'min' | 'h'
  effective_unit: 'min' | 'h'
  planned_minutes: string
  effective_minutes: string
  description: string
  material: string
  start_page: string
  end_page: string
  questions_resolved: string
  correct_answers: string
}

const emptyForm: FormState = {
  study_date: new Date().toISOString().slice(0, 10),
  subject: '',
  target_status: 'parcial',
  planned_unit: 'min',
  effective_unit: 'min',
  planned_minutes: '90',
  effective_minutes: '60',
  description: '',
  material: 'PDF',
  start_page: '',
  end_page: '',
  questions_resolved: '0',
  correct_answers: '0',
}

const MATERIAL_OPTIONS = ['PDF', 'Video aula', 'Outros'] as const

const box: React.CSSProperties = { background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: 16, padding: 18 }
const input: React.CSSProperties = { width: '100%', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border,#1f2640)', color: 'var(--text,#e8eaf6)', borderRadius: 12, padding: '11px 12px', fontSize: 14 }
const labelStyle: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted,#6b7194)', marginBottom: 6, display: 'block' }
const td: React.CSSProperties = { padding: '14px 0', borderTop: '1px solid rgba(255,255,255,.06)', verticalAlign: 'top', fontSize: 13 }
const iconButton: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: 'var(--text,#e8eaf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

const fmtMin = (n: number) => (n < 60 ? `${n}min` : `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}min` : ''}`)
const parseDurationToMinutes = (value: string, unit: 'min' | 'h') => {
  const parsed = Number(value || 0)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return unit === 'h' ? Math.round(parsed * 60) : Math.round(parsed)
}
const weekStart = (date: string) => { const d = new Date(`${date}T00:00:00`); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return d.toISOString().slice(0, 10) }
const fmtDate = (date: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T00:00:00`))
const pagesRead = (log: Pick<DailyStudyLog, 'start_page' | 'end_page'>) => log.start_page === null || log.end_page === null ? 0 : Math.max(0, log.end_page - log.start_page)
const accuracy = (log: Pick<DailyStudyLog, 'questions_resolved' | 'correct_answers'>) => log.questions_resolved ? Math.round((log.correct_answers / log.questions_resolved) * 100) : null
const pendingTags = (description: string | null) => {
  const text = (description ?? '').toLowerCase()
  return [text.includes('falta fazer questoes') ? 'Questoes pendentes' : null, text.includes('falta fazer o resumo') ? 'Resumo pendente' : null, text.includes('conclui') ? 'Bloco concluido' : null].filter(Boolean) as string[]
}

export default function ControleDiarioPage() {
  const [logs, setLogs] = useState<DailyStudyLog[]>([])
  const [plannerSubjects, setPlannerSubjects] = useState<PlannerSubject[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [userId, setUserId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedWeek, setSelectedWeek] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => { void loadLogs() }, [])

  async function loadLogs() {
    setLoading(true); setDbError(null)
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setDbError('Usuario nao autenticado.'); setLoading(false); return }
    setUserId(auth.user.id)
    const [logsRes, subjectsRes] = await Promise.all([
      supabase.from('daily_study_logs').select('*').eq('user_id', auth.user.id).order('study_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('planner_subjects').select('*').eq('user_id', auth.user.id).order('created_at', { ascending: true }),
    ])
    if (logsRes.error) { setDbError(logsRes.error.message); setLoading(false); return }
    if (!subjectsRes.error) setPlannerSubjects((subjectsRes.data ?? []) as PlannerSubject[])
    setLogs((logsRes.data ?? []) as DailyStudyLog[])
    setLoading(false)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setMessage(null); setDbError(null)
    if (!userId) return
    const q = Number(form.questions_resolved || 0)
    const c = Number(form.correct_answers || 0)
    const plannedMinutes = parseDurationToMinutes(form.planned_minutes, form.planned_unit)
    const effectiveMinutes = parseDurationToMinutes(form.effective_minutes, form.effective_unit)
    if (!form.subject.trim()) { setMessage('Informe a disciplina.'); return }
    if (c > q) { setMessage('Acertos nao podem ser maiores que questoes.'); return }
    setSaving(true)
    const payload = {
      user_id: userId,
      study_date: form.study_date,
      subject: form.subject.trim(),
      target_status: form.target_status,
      planned_minutes: plannedMinutes,
      effective_minutes: effectiveMinutes,
      description: form.description.trim() || null,
      material: form.material.trim() || null,
      start_page: form.start_page ? Number(form.start_page) : null,
      end_page: form.end_page ? Number(form.end_page) : null,
      questions_resolved: q,
      correct_answers: c,
    }
    const supabase = createClient()
    const query = editingId ? supabase.from('daily_study_logs').update(payload).eq('id', editingId).select().single() : supabase.from('daily_study_logs').insert(payload).select().single()
    const { data, error } = await query
    if (error) { setDbError(error.message); setSaving(false); return }
    const saved = data as DailyStudyLog
    setLogs(prev => editingId ? prev.map(log => log.id === editingId ? saved : log) : [saved, ...prev])
    setForm({ ...emptyForm, study_date: form.study_date }); setEditingId(null); setSaving(false); setMessage(editingId ? 'Lancamento atualizado.' : 'Lancamento salvo.')
  }

  function editLog(log: DailyStudyLog) {
    setEditingId(log.id)
    setForm({
      study_date: log.study_date, subject: log.subject, target_status: log.target_status as FormState['target_status'], planned_unit: 'min', effective_unit: 'min',
      planned_minutes: String(log.planned_minutes ?? 0), effective_minutes: String(log.effective_minutes ?? 0),
      description: log.description ?? '', material: log.material ?? '',
      start_page: log.start_page === null ? '' : String(log.start_page), end_page: log.end_page === null ? '' : String(log.end_page),
      questions_resolved: String(log.questions_resolved ?? 0), correct_answers: String(log.correct_answers ?? 0),
    })
  }

  async function deleteLog(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('daily_study_logs').delete().eq('id', id)
    if (error) { setDbError(error.message); return }
    setLogs(prev => prev.filter(log => log.id !== id))
    if (editingId === id) { setEditingId(null); setForm(emptyForm) }
  }

  const weeks = Array.from(new Set(logs.map(log => weekStart(log.study_date)))).sort((a, b) => b.localeCompare(a))
  const subjects = Array.from(new Set(logs.map(log => log.subject))).sort((a, b) => a.localeCompare(b))
  const disciplineOptions = Array.from(new Set(plannerSubjects.map(subject => subject.name).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  const materialOptions = MATERIAL_OPTIONS.includes(form.material as typeof MATERIAL_OPTIONS[number])
    ? [...MATERIAL_OPTIONS]
    : [...MATERIAL_OPTIONS, form.material || 'Outros']
  const filtered = logs.filter(log => (selectedWeek === 'all' || weekStart(log.study_date) === selectedWeek) && (selectedSubject === 'all' || log.subject === selectedSubject) && (selectedStatus === 'all' || log.target_status === selectedStatus))
  const planned = filtered.reduce((sum, log) => sum + (log.planned_minutes ?? 0), 0)
  const effective = filtered.reduce((sum, log) => sum + (log.effective_minutes ?? 0), 0)
  const completed = filtered.filter(log => log.target_status === 'concluido').length
  const pendings = filtered.flatMap(log => pendingTags(log.description)).filter(tag => tag !== 'Bloco concluido').length
  const totalQuestions = filtered.reduce((sum, log) => sum + (log.questions_resolved ?? 0), 0)
  const totalCorrect = filtered.reduce((sum, log) => sum + (log.correct_answers ?? 0), 0)
  const score = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : null
  const missingTable = !!dbError && dbError.includes('daily_study_logs')

  return (
    <div style={{ padding: '28px 32px', display: 'grid', gap: 18, background: 'var(--bg,#0a0c12)', minHeight: '100%' }}>
      <section style={{ ...box, display: 'grid', gridTemplateColumns: '1.3fr .7fr', gap: 18 }}>
        <div>
          <div style={{ ...labelStyle, color: 'var(--accent,#6c63ff)' }}>Controle diario funcional</div>
          <h1 style={{ margin: 0, fontSize: 32, color: 'var(--text,#e8eaf6)' }}>Painel de Controle Diario de Estudos</h1>
          <p style={{ color: 'var(--muted,#6b7194)', fontSize: 14, lineHeight: 1.6 }}>Registre o estudo do dia, acompanhe horas, desempenho e pendencias e mantenha as condicionais importantes da planilha dentro do site.</p>
        </div>
        <div style={{ ...box, background: 'rgba(255,255,255,.03)' }}>
          <div style={labelStyle}>Condicionais preservadas</div>
          <div style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.15 }}>Status visual, faixas de desempenho e leitura automatica de pendencias.</div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        <Stat icon={<Clock3 size={18} />} text="Horas planejadas" value={fmtMin(planned)} tone="#6c63ff" />
        <Stat icon={<Target size={18} />} text="Horas efetivas" value={fmtMin(effective)} tone="#10b981" />
        <Stat icon={<CheckCircle2 size={18} />} text="Metas concluidas" value={`${completed}/${filtered.length || 0}`} tone="#f59e0b" />
        <Stat icon={<AlertTriangle size={18} />} text="Pendencias" value={String(pendings)} tone="#ef4444" />
      </section>

      {message && <div style={{ ...box, fontSize: 13 }}>{message}</div>}
      {dbError && <div style={{ ...box, fontSize: 13, borderColor: 'rgba(239,68,68,.3)' }}>{dbError}</div>}
      {missingTable && <div style={{ ...box, fontSize: 13, lineHeight: 1.6 }}>A tabela do modulo ainda nao foi criada no Supabase. Rode o script de setup `daily_study_logs.sql` e recarregue esta pagina.</div>}

      <section style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 18 }}>
        <form onSubmit={handleSubmit} style={{ ...box, display: 'grid', gap: 14 }}>
          <div><div style={{ ...labelStyle, color: 'var(--accent,#6c63ff)' }}>{editingId ? 'Editar lancamento' : 'Novo lancamento'}</div><h2 style={{ margin: 0, fontSize: 20 }}>Formulario do estudo diario</h2></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
            <Field text="Data"><input style={input} type="date" value={form.study_date} onChange={e => setForm(prev => ({ ...prev, study_date: e.target.value }))} /></Field>
            <Field text="Disciplina">
              <>
                <input style={input} list="planner-subject-options" value={form.subject} onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))} placeholder={disciplineOptions.length ? 'Escolha ou digite uma disciplina' : 'Cadastre disciplinas no Cronograma'} />
                <datalist id="planner-subject-options">
                  {disciplineOptions.map(subject => <option key={subject} value={subject} />)}
                </datalist>
              </>
            </Field>
            <Field text="Meta cumprida"><select style={input} value={form.target_status} onChange={e => setForm(prev => ({ ...prev, target_status: e.target.value as FormState['target_status'] }))}><option value="nao_concluido">Nao concluido</option><option value="parcial">Parcial</option><option value="concluido">Concluido</option></select></Field>
            <Field text="Material"><select style={input} value={form.material} onChange={e => setForm(prev => ({ ...prev, material: e.target.value }))}>{materialOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field text="CH planejada">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
                <input style={input} type="number" step={form.planned_unit === 'h' ? '0.25' : '1'} min="0" value={form.planned_minutes} onChange={e => setForm(prev => ({ ...prev, planned_minutes: e.target.value }))} />
                <select style={input} value={form.planned_unit} onChange={e => setForm(prev => ({ ...prev, planned_unit: e.target.value as FormState['planned_unit'] }))}><option value="min">min</option><option value="h">hr</option></select>
              </div>
            </Field>
            <Field text="CH efetiva">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
                <input style={input} type="number" step={form.effective_unit === 'h' ? '0.25' : '1'} min="0" value={form.effective_minutes} onChange={e => setForm(prev => ({ ...prev, effective_minutes: e.target.value }))} />
                <select style={input} value={form.effective_unit} onChange={e => setForm(prev => ({ ...prev, effective_unit: e.target.value as FormState['effective_unit'] }))}><option value="min">min</option><option value="h">hr</option></select>
              </div>
            </Field>
            <Field text="Onde comecei"><input style={input} type="number" min="0" value={form.start_page} onChange={e => setForm(prev => ({ ...prev, start_page: e.target.value }))} /></Field>
            <Field text="Terminei"><input style={input} type="number" min="0" value={form.end_page} onChange={e => setForm(prev => ({ ...prev, end_page: e.target.value }))} /></Field>
            <Field text="Questoes resolvidas"><input style={input} type="number" min="0" value={form.questions_resolved} onChange={e => setForm(prev => ({ ...prev, questions_resolved: e.target.value }))} /></Field>
            <Field text="Acertei"><input style={input} type="number" min="0" value={form.correct_answers} onChange={e => setForm(prev => ({ ...prev, correct_answers: e.target.value }))} /></Field>
          </div>
          <Field text="Descricao da meta"><textarea style={{ ...input, minHeight: 120, resize: 'vertical' }} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Ex: Falta fazer o resumo. Falta fazer questoes. Conclui o bloco." /></Field>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" disabled={saving || missingTable} style={{ background: 'var(--accent,#6c63ff)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 14px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: saving || missingTable ? .6 : 1 }}><Save size={16} />{saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }} style={{ background: 'transparent', color: 'var(--text,#e8eaf6)', border: '1px solid var(--border,#1f2640)', borderRadius: 12, padding: '11px 14px', fontWeight: 700 }}>Cancelar</button>}
          </div>
        </form>

        <div style={{ ...box, display: 'grid', gap: 12 }}>
          <div><div style={{ ...labelStyle, color: 'var(--accent,#6c63ff)' }}>Filtros</div><h2 style={{ margin: 0, fontSize: 20 }}>Leitura da semana</h2></div>
          <Field text="Semana"><select style={input} value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}><option value="all">Todas</option>{weeks.map(week => <option key={week} value={week}>Semana de {fmtDate(week)}</option>)}</select></Field>
          <Field text="Disciplina"><select style={input} value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}><option value="all">Todas</option>{subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}</select></Field>
          <Field text="Status"><select style={input} value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}><option value="all">Todos</option><option value="nao_concluido">Nao concluido</option><option value="parcial">Parcial</option><option value="concluido">Concluido</option></select></Field>
          <div style={{ ...box, background: 'rgba(255,255,255,.03)', display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted,#6b7194)' }}>Taxa de acerto</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: score === null ? '#6b7194' : score < 70 ? '#ef4444' : score <= 80 ? '#f59e0b' : '#10b981' }}>{score === null ? 'Sem questoes' : `${score}%`}</div>
            <div style={{ fontSize: 12, color: 'var(--muted,#6b7194)' }}>Pendencias detectadas: {pendings}</div>
          </div>
        </div>
      </section>

      <section style={box}>
        <div style={{ ...labelStyle, color: 'var(--accent,#6c63ff)' }}>Tabela diaria</div>
        <h2 style={{ margin: 0, fontSize: 20 }}>Lancamentos salvos</h2>
        {loading ? <div style={{ paddingTop: 16, color: 'var(--muted,#6b7194)' }}>Carregando...</div> : filtered.length === 0 ? <div style={{ paddingTop: 16, color: 'var(--muted,#6b7194)' }}>Nenhum lancamento encontrado.</div> : (
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
              <thead><tr>{['Data','Disciplina','Status','Horas','Paginas','Questoes','Desempenho','Pendencias','Acoes'].map(head => <th key={head} style={{ textAlign: 'left', paddingBottom: 12, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted,#6b7194)' }}>{head}</th>)}</tr></thead>
              <tbody>
                {filtered.map(log => {
                  const scoreValue = accuracy(log)
                  const scoreColor = scoreValue === null ? '#6b7194' : scoreValue < 70 ? '#ef4444' : scoreValue <= 80 ? '#f59e0b' : '#10b981'
                  const status = log.target_status === 'concluido' ? 'Concluido' : log.target_status === 'nao_concluido' ? 'Nao concluido' : 'Parcial'
                  return (
                    <tr key={log.id}>
                      <td style={td}>{fmtDate(log.study_date)}</td>
                      <td style={td}><div style={{ display: 'grid' }}><strong>{log.subject}</strong><span style={{ fontSize: 11, color: 'var(--muted,#6b7194)' }}>{log.material ?? 'Material nao informado'}</span></div></td>
                      <td style={td}><Pill text={status} color={status === 'Concluido' ? '#10b981' : status === 'Parcial' ? '#f59e0b' : '#ef4444'} /></td>
                      <td style={td}>{fmtMin(log.effective_minutes)} de {fmtMin(log.planned_minutes)}</td>
                      <td style={td}>{pagesRead(log)} pag.</td>
                      <td style={td}>{log.questions_resolved ? `${log.correct_answers}/${log.questions_resolved}` : 'Sem pratica'}</td>
                      <td style={td}><Pill text={scoreValue === null ? 'Sem questoes' : `${scoreValue}%`} color={scoreColor} /></td>
                      <td style={td}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{pendingTags(log.description).length ? pendingTags(log.description).map(tag => <Pill key={tag} text={tag} color={tag === 'Bloco concluido' ? '#10b981' : '#f59e0b'} />) : <Pill text="Sem sinais" color="#6b7194" />}</div></td>
                      <td style={td}><div style={{ display: 'flex', gap: 6 }}><button type="button" onClick={() => editLog(log)} style={iconButton}><Pencil size={15} /></button><button type="button" onClick={() => void deleteLog(log.id)} style={{ ...iconButton, color: '#ef4444' }}><Trash2 size={15} /></button></div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ text, children }: { text: string; children: React.ReactNode }) {
  return <div><label style={labelStyle}>{text}</label>{children}</div>
}

function Stat({ icon, text, value, tone }: { icon: React.ReactNode; text: string; value: string; tone: string }) {
  return <div style={{ ...box, padding: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, color: tone }}><span style={labelStyle}>{text}</span>{icon}</div><div style={{ fontSize: 26, fontWeight: 700, color: tone }}>{value}</div></div>
}

function Pill({ text, color }: { text: string; color: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 999, background: `${color}20`, color, fontSize: 11, fontWeight: 700 }}>{text}</span>
}
