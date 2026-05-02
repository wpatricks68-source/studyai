'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { Plus, Disc, Calendar, RotateCw, X, CircleDashed, Edit3, Trash2 } from 'lucide-react'
import type { PlannerSubject, Schedule, StudyCycle } from '@/types/database'

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const DAY_DB_VALUES = [1, 2, 3, 4, 5, 6, 0]
const FIRST_CALENDAR_HOUR = 6
const LAST_CALENDAR_HOUR = 23
const HOURS = Array.from({ length: LAST_CALENDAR_HOUR - FIRST_CALENDAR_HOUR + 1 }, (_, i) => i + FIRST_CALENDAR_HOUR)
const SCHEDULE_SLOTS = HOURS.map(hour => ({
  start: hour * 60,
  end: (hour + 1) * 60,
  label: `${formatFixedHour(hour)}-${formatFixedHour(hour + 1)}`
}))

function formatFixedHour(hour: number) {
  return `${String(hour % 24).padStart(2, '0')}:00`
}

function timeToMinutes(time: string) {
  const [hour = '0', minute = '0'] = time.split(':')
  return Number(hour) * 60 + Number(minute)
}

// Modals Overlay Component
const Modal = ({ show, onClose, title, children }: { show: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: 'var(--surface,#111420)', padding: '28px', borderRadius: '24px', border: '1px solid var(--border,#1f2640)', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text,#fff)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'var(--surface2,#181d2e)', border: 'none', color: 'var(--muted)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const INITIAL_SUBJECT_FORM = { name: '', code: '', description: '', target_sessions: 20, color: '#6c63ff' }

type RevisionRow = {
  id: string
  selected: boolean
  revisionType: '' | 'partial' | 'general'
  subjectIds: string[]
  date: string
}

const createRevisionRow = (): RevisionRow => ({
  id: `revision-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  selected: false,
  revisionType: '',
  subjectIds: [],
  date: ''
})

export default function CronogramaPage() {
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<PlannerSubject[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [cycles, setCycles] = useState<StudyCycle[]>([])

  const [viewMode, setViewMode] = useState<'calendar' | 'cycle'>('calendar')
  const [revisionRows, setRevisionRows] = useState<RevisionRow[]>([
    createRevisionRow()
  ])

  // Modals state
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showCycleModal, setShowCycleModal] = useState(false)
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  const [openRevisionDropdown, setOpenRevisionDropdown] = useState<string | null>(null)
  
  // Forms
  const [subForm, setSubForm] = useState(INITIAL_SUBJECT_FORM)
  const [schedForm, setSchedForm] = useState({ subject_id: '', day_of_week: 1, start_time: '08:00', end_time: '10:00' })
  const [cycleForm, setCycleForm] = useState({ subject_id: '', duration_minutes: 60 })

  const colors = ['#6c63ff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#06b6d4']

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [subjRes, schedRes, cycRes] = await Promise.all([
      supabase.from('planner_subjects').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('schedules').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('study_cycles').select('*').eq('user_id', user.id).order('order_index', { ascending: true })
    ])

    setSubjects(subjRes.data ?? [])
    setSchedules(schedRes.data ?? [])
    setCycles(cycRes.data ?? [])
    setLoading(false)
  }

  // ==== ACTIONS ====
  async function handleAddSubject() {
    if (!subForm.name) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.from('planner_subjects').insert({
      user_id: user.id,
      name: subForm.name,
      code: subForm.code,
      description: subForm.description,
      target_sessions: subForm.target_sessions,
      color: subForm.color
    }).select().single()

    if (error) {
      console.error(error)
      alert("Erro ao salvar disciplina. Verifique se as tabelas foram criadas no banco.")
      return
    }

    if (data) setSubjects(prev => [...prev, data])
    closeSubjectModal()
  }

  function openCreateSubjectModal() {
    setEditingSubjectId(null)
    setSubForm(INITIAL_SUBJECT_FORM)
    setShowSubjectModal(true)
  }

  function openEditSubjectModal(subject: PlannerSubject) {
    setEditingSubjectId(subject.id)
    setSubForm({
      name: subject.name,
      code: subject.code ?? '',
      description: subject.description ?? '',
      target_sessions: subject.target_sessions ?? 20,
      color: subject.color
    })
    setShowSubjectModal(true)
  }

  function closeSubjectModal() {
    setShowSubjectModal(false)
    setEditingSubjectId(null)
    setSubForm(INITIAL_SUBJECT_FORM)
  }

  async function handleSaveSubject() {
    if (editingSubjectId) {
      await handleUpdateSubject()
      return
    }

    await handleAddSubject()
  }

  async function handleUpdateSubject() {
    if (!editingSubjectId || !subForm.name) return

    const originalSubject = subjects.find(subject => subject.id === editingSubjectId)
    if (!originalSubject) return

    const supabase = createClient()
    const payload = {
      name: subForm.name,
      code: subForm.code,
      description: subForm.description,
      target_sessions: subForm.target_sessions,
      color: subForm.color
    }

    const { data, error } = await supabase
      .from('planner_subjects')
      .update(payload)
      .eq('id', editingSubjectId)
      .select()
      .single()

    if (error) {
      console.error(error)
      alert("Erro ao atualizar disciplina.")
      return
    }

    setSubjects(prev => prev.map(subject => (
      subject.id === editingSubjectId ? data : subject
    )))

    const { error: scheduleError } = await supabase
      .from('schedules')
      .update({
        subject: payload.name,
        materia: payload.code,
        color: payload.color
      })
      .eq('user_id', originalSubject.user_id)
      .eq('subject', originalSubject.name)

    if (scheduleError) {
      console.error(scheduleError)
      alert("A disciplina foi atualizada, mas houve erro ao sincronizar os blocos do cronograma.")
      return
    }

    setSchedules(prev => prev.map(schedule => (
      schedule.subject === originalSubject.name
        ? { ...schedule, subject: data.name, materia: data.code, color: data.color }
        : schedule
    )))

    closeSubjectModal()
  }

  async function handleAddSchedule() {
    if (!schedForm.subject_id) return
    const subj = subjects.find(s => s.id === schedForm.subject_id)
    if (!subj) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('schedules').insert({
      user_id: user.id,
      subject: subj.name,
      materia: subj.code,
      day_of_week: schedForm.day_of_week,
      start_time: schedForm.start_time,
      end_time: schedForm.end_time,
      color: subj.color,
      is_active: true
    }).select().single()

    if (data) setSchedules(prev => [...prev, data])
    setShowScheduleModal(false)
  }

  async function handleAddCycle() {
    if (!cycleForm.subject_id) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const nextOrder = cycles.length > 0 ? Math.max(...cycles.map(c => c.order_index)) + 1 : 0

    const { data, error } = await supabase.from('study_cycles').insert({
      user_id: user.id,
      subject_id: cycleForm.subject_id,
      duration_minutes: cycleForm.duration_minutes,
      order_index: nextOrder
    }).select().single()

    if (error) {
      console.error(error)
      alert("Erro ao salvar ciclo. Verifique se as tabelas foram criadas no banco.")
      return
    }

    if (data) setCycles(prev => [...prev, data])
    setShowCycleModal(false)
  }

  async function removeSchedule(id: string) {
    if(!confirm("Remover bloco?")) return
    const supabase = createClient()
    await supabase.from('schedules').update({ is_active: false }).eq('id', id)
    setSchedules(s => s.filter(sc => sc.id !== id))
  }

  async function removeCycle(id: string) {
    if(!confirm("Remover deste ciclo?")) return
    const supabase = createClient()
    await supabase.from('study_cycles').delete().eq('id', id)
    setCycles(s => s.filter(sc => sc.id !== id))
  }

  async function removeSubject(id: string) {
    if(!confirm("Tem certeza? Esta ação removerá a disciplina e seus vínculos no ciclo.")) return;
    const supabase = createClient()
    await supabase.from('planner_subjects').delete().eq('id', id)
    setSubjects(s => s.filter(su => su.id !== id))
    setCycles(s => s.filter(sc => sc.subject_id !== id))
    setRevisionRows(rows => rows.map(row => (
      row.subjectIds.includes(id)
        ? { ...row, subjectIds: row.subjectIds.filter(subjectId => subjectId !== id) }
        : row
    )))
  }

  function addRevisionRow() {
    setRevisionRows(rows => [...rows, createRevisionRow()])
  }

  function updateRevisionRow<K extends keyof Omit<RevisionRow, 'id'>>(id: string, field: K, value: RevisionRow[K]) {
    setRevisionRows(rows => rows.map(row => (
      row.id === id ? { ...row, [field]: value } : row
    )))
  }

  function toggleAllRevisionRows(checked: boolean) {
    setRevisionRows(rows => rows.map(row => ({ ...row, selected: checked })))
  }

  function removeSelectedRevisionRows() {
    setRevisionRows(rows => {
      const remainingRows = rows.filter(row => !row.selected)
      return remainingRows.length > 0 ? remainingRows : [createRevisionRow()]
    })
  }

  // ==== HELPERS ====
  function getBlocksForSlot(dayIndex: number, hourStr: string) {
    const slotStart = timeToMinutes(hourStr)
    const slotEnd = slotStart + 60
    return getBlocksForTimeSlot(dayIndex, slotStart, slotEnd)
  }

  function getBlocksForTimeSlot(dayIndex: number, slotStart: number, slotEnd: number) {
    return schedules.filter(s => {
      // Assuming DB day_of_week: 0=Dom, 1=Seg...
      // Our DAYS array starts with Seg, so we match carefully.
      // If dayIndex is 0 (Seg), s.day_of_week should be 1.
      const dbDay = DAY_DB_VALUES[dayIndex] ?? dayIndex

      if (s.day_of_week !== dbDay) return false
      const start = timeToMinutes(s.start_time)
      const end = timeToMinutes(s.end_time)
      const normalizedEnd = end <= start ? end + 24 * 60 : end
      return Math.max(start, slotStart) < Math.min(normalizedEnd, slotEnd)
    })
  }

  function toggleRevisionSubject(id: string, subjectId: string, checked: boolean) {
    setRevisionRows(rows => rows.map(row => {
      if (row.id !== id) return row
      return {
        ...row,
        subjectIds: checked
          ? Array.from(new Set([...row.subjectIds, subjectId]))
          : row.subjectIds.filter(currentId => currentId !== subjectId)
      }
    }))
  }

  function selectAllSubjectsInRevision(id: string, select: boolean) {
    setRevisionRows(rows => rows.map(row => {
      if (row.id !== id) return row
      return {
        ...row,
        subjectIds: select ? subjects.map(s => s.id) : []
      }
    }))
  }

  function getDayIndexFromDb(dayOfWeek: number) {
    return dayOfWeek === 0 ? 6 : Math.max(0, dayOfWeek - 1)
  }

  function formatScheduleTime(time: string) {
    return time?.slice(0, 5) ?? '--:--'
  }

  const chartData = subjects.map(s => ({
    name: s.name,
    value: s.target_sessions || 1,
    color: s.color,
    sessions: s.target_sessions || 0
  }))

  const cycleChartData = cycles.map(cyc => {
    const subj = subjects.find(s => s.id === cyc.subject_id)
    if (!subj) return null
    return {
      name: subj.code ? `${subj.code}` : subj.name.substring(0, 4).toUpperCase(),
      fullName: subj.name,
      value: cyc.duration_minutes,
      color: subj.color,
      duration: cyc.duration_minutes
    }
  }).filter(Boolean) as { name: string; fullName: string; value: number; color: string; duration: number }[]

  const totalSessions = chartData.reduce((acc, curr) => acc + curr.sessions, 0)
  const hasSelectedRevisionRows = revisionRows.some(row => row.selected)
  const allRevisionRowsSelected = revisionRows.length > 0 && revisionRows.every(row => row.selected)

  // Painel de Cronograma: apenas slots com pelo menos um bloco preenchido
  const filledSlots = SCHEDULE_SLOTS.filter(slot =>
    DAYS.some((_, dayIndex) => getBlocksForTimeSlot(dayIndex, slot.start, slot.end).length > 0)
  )
  const sortedSchedules = [...schedules].sort((a, b) => (
    getDayIndexFromDb(a.day_of_week) - getDayIndexFromDb(b.day_of_week)
    || a.start_time.localeCompare(b.start_time)
    || a.end_time.localeCompare(b.end_time)
    || a.subject.localeCompare(b.subject)
  ))

  if (loading) {
     return (
       <div style={{ display: 'flex', flex: 1, height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg,#0a0c12)', color: 'var(--accent,#6c63ff)' }}>
         <CircleDashed size={40} className="animate-spin" />
       </div>
     )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100vh', padding: '24px', background: 'var(--bg,#0a0c12)', overflowY: 'auto', overflowX: 'hidden', color: 'var(--text,#e8eaf6)' }} onClick={() => setOpenRevisionDropdown(null)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '100%', minHeight: '360px', display: 'flex', flexDirection: 'column', background: 'var(--surface,#111420)', borderRadius: '20px', border: '1px solid var(--border,#1f2640)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid var(--border,#1f2640)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#fff)', letterSpacing: '0.5px' }}>PAINEL DE CRONOGRAMA</h2>
            <button onClick={() => setShowScheduleModal(true)} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' }}>+ Alocar Horário</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px' }}>
            {sortedSchedules.length === 0 ? (
              <div style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--muted,#6b7194)', textAlign: 'center', border: '1px dashed var(--border,#1f2640)', borderRadius: '14px', background: 'rgba(255,255,255,0.015)', padding: '24px' }}>
                <Calendar size={30} />
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text,#e8eaf6)' }}>Nenhum horário alocado</div>
                <div style={{ fontSize: '12px', lineHeight: 1.6, maxWidth: '320px' }}>Clique em + Alocar Horário para adicionar a primeira célula do cronograma.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '86px repeat(7, minmax(82px, 1fr))', minWidth: '720px', border: '1px solid var(--border,#1f2640)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 8px', background: 'var(--surface2,#181d2e)', color: 'var(--muted,#6b7194)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.7px', borderBottom: '1px solid var(--border,#1f2640)' }}>Horário</div>
                {DAYS.map(day => (
                  <div key={day} style={{ padding: '10px 8px', background: 'var(--surface2,#181d2e)', color: 'var(--text,#e8eaf6)', fontSize: '10px', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', borderLeft: '1px solid var(--border,#1f2640)', borderBottom: '1px solid var(--border,#1f2640)' }}>{day}</div>
                ))}
                {filledSlots.map(row => (
                  <React.Fragment key={row.label}>
                    <div style={{ padding: '10px 8px', color: 'var(--accent,#6c63ff)', fontSize: '10px', fontWeight: 600, borderBottom: '1px solid var(--border,#1f2640)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                      {row.label}
                    </div>
                    {DAYS.map((_, dayIndex) => {
                      const blocks = getBlocksForTimeSlot(dayIndex, row.start, row.end)
                      return (
                        <div key={`${row.label}-${dayIndex}`} style={{ minHeight: '76px', padding: '6px', borderLeft: '1px solid var(--border,#1f2640)', borderBottom: '1px solid var(--border,#1f2640)', background: blocks.length ? 'linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))' : 'transparent' }}>
                          {blocks.map(schedule => {
                            const subjIndex = cycles.findIndex(c => c.subject_id === subjects.find(s => s.name === schedule.subject)?.id)
                            const num = subjIndex >= 0 ? String(subjIndex + 1).padStart(2, '0') : String(subjects.findIndex(s => s.name === schedule.subject) + 1).padStart(2, '0')
                            return (
                            <button
                              key={schedule.id}
                              onClick={() => removeSchedule(schedule.id)}
                              title="Clique para remover este horário"
                              style={{ width: '100%', minHeight: '58px', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '10px', padding: '8px', background: `linear-gradient(135deg, ${schedule.color}e6, ${schedule.color}aa)`, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', textAlign: 'center', cursor: 'pointer', boxShadow: `0 10px 24px ${schedule.color}30`, backdropFilter: 'blur(12px)' }}
                            >
                              <span style={{ fontSize: '10px', fontWeight: 400, lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{num} - {schedule.subject}</span>
                              <span style={{ fontSize: '9px', fontWeight: 400, opacity: 0.95, lineHeight: 1.2 }}>{formatScheduleTime(schedule.start_time)} - {formatScheduleTime(schedule.end_time)}</span>
                              {schedule.materia && (
                                <span style={{ maxWidth: '100%', fontSize: '9px', fontWeight: 400, opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{schedule.materia}</span>
                              )}
                            </button>
                          )})}
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ width: '100%', minHeight: '260px', display: 'flex', flexDirection: 'column', background: 'var(--surface,#111420)', borderRadius: '20px', border: '1px solid var(--border,#1f2640)', overflow: 'visible', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '20px', borderBottom: '1px solid var(--border,#1f2640)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#fff)', letterSpacing: '0.5px' }}>PAINEL DE REVISAO</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={allRevisionRowsSelected} onChange={e => toggleAllRevisionRows(e.target.checked)} title="Selecionar revisoes" style={{ width: '18px', height: '18px', accentColor: 'var(--accent,#6c63ff)', cursor: 'pointer' }} />
              <button onClick={removeSelectedRevisionRows} disabled={!hasSelectedRevisionRows} title="Excluir revisoes selecionadas" style={{ background: hasSelectedRevisionRows ? '#ef444420' : 'var(--surface2,#181d2e)', color: hasSelectedRevisionRows ? '#ef4444' : 'var(--muted,#6b7194)', border: '1px solid var(--border,#1f2640)', width: '34px', height: '34px', borderRadius: '10px', cursor: hasSelectedRevisionRows ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={16} />
              </button>
              <button onClick={addRevisionRow} title="Adicionar revisao" style={{ background: 'var(--accent,#6c63ff)', color: 'var(--text,#fff)', border: 'none', width: '34px', height: '34px', borderRadius: '10px', fontSize: '18px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(140px, .9fr) minmax(180px, 1.2fr) minmax(140px, .8fr)', gap: '10px', padding: '12px 16px', fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', borderBottom: '1px solid var(--border,#1f2640)' }}>
            <span />
            <span>REVISAO</span>
            <span>DISCIPLINAS</span>
            <span>DATA</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'visible', padding: '14px 16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {revisionRows.map(row => (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '24px minmax(140px, .9fr) minmax(180px, 1.2fr) minmax(140px, .8fr)', gap: '10px', alignItems: 'center', padding: '12px', borderRadius: '14px', border: '1px solid var(--border,#1f2640)', background: 'var(--surface2,#181d2e)' }}>
                <input type="checkbox" checked={row.selected} onChange={e => updateRevisionRow(row.id, 'selected', e.target.checked)} title="Selecionar linha" style={{ width: '18px', height: '18px', accentColor: 'var(--accent,#6c63ff)', cursor: 'pointer' }} />
                <select value={row.revisionType} onChange={e => updateRevisionRow(row.id, 'revisionType', e.target.value as RevisionRow['revisionType'])} style={{ minWidth: 0, width: '100%', background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '10px', padding: '10px 8px', color: row.revisionType ? 'var(--text,#fff)' : 'var(--muted,#6b7194)', outline: 'none', fontSize: '12px' }}>
                  <option value="">Tipo de revisão</option>
                  <option value="partial">Revisao parcial</option>
                  <option value="general">Revisao geral</option>
                </select>
                <div style={{ position: 'relative', minWidth: 0, width: '100%' }} onClick={e => e.stopPropagation()}>
                  {/* Trigger box */}
                  <div
                    onClick={() => setOpenRevisionDropdown(openRevisionDropdown === row.id ? null : row.id)}
                    style={{ minWidth: 0, width: '100%', background: 'var(--surface,#111420)', border: `1px solid ${openRevisionDropdown === row.id ? 'var(--accent,#6c63ff)' : 'var(--border,#1f2640)'}`, borderRadius: '10px', padding: '7px 10px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '38px', alignItems: 'center', boxSizing: 'border-box', transition: 'border-color .2s' }}
                  >
                    {row.subjectIds.length === 0 ? (
                      <span style={{ color: 'var(--muted,#6b7194)', fontSize: '12px', pointerEvents: 'none' }}>Disciplinas...</span>
                    ) : row.subjectIds.map(subjectId => {
                      const subject = subjects.find(s => s.id === subjectId)
                      if (!subject) return null
                      return (
                        <span key={subjectId} style={{ background: `${subject.color}22`, border: `1px solid ${subject.color}55`, color: subject.color, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                          {subject.name}
                        </span>
                      )
                    })}
                  </div>
                  {/* Dropdown list */}
                  {openRevisionDropdown === row.id && (
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999, background: 'var(--surface,#111420)', border: '1px solid var(--accent,#6c63ff)', borderRadius: '10px', padding: '6px', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}
                    >
                      <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {subjects.length > 0 && (
                          <div style={{ padding: '4px 8px', marginBottom: '4px', borderBottom: '1px solid var(--border,#1f2640)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent,#6c63ff)', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px', background: row.subjectIds.length === subjects.length ? 'var(--accent)15' : 'transparent', transition: 'background .15s' }}>
                              <input 
                                type="checkbox" 
                                checked={row.subjectIds.length === subjects.length && subjects.length > 0} 
                                onChange={e => selectAllSubjectsInRevision(row.id, e.target.checked)} 
                                style={{ width: '14px', height: '14px', accentColor: 'var(--accent,#6c63ff)', cursor: 'pointer', flex: '0 0 auto' }} 
                              />
                              <span style={{ fontSize: '12px', fontWeight: 700 }}>Todas</span>
                            </label>
                          </div>
                        )}
                        {subjects.length === 0 ? (
                          <span style={{ color: 'var(--muted,#6b7194)', fontSize: '12px', padding: '4px 8px', display: 'block' }}>Nenhuma disciplina cadastrada</span>
                        ) : subjects.map(subject => (
                          <label key={subject.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text,#fff)', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px', background: row.subjectIds.includes(subject.id) ? `${subject.color}18` : 'transparent', transition: 'background .15s' }}>
                            <input type="checkbox" checked={row.subjectIds.includes(subject.id)} onChange={e => toggleRevisionSubject(row.id, subject.id, e.target.checked)} style={{ width: '14px', height: '14px', accentColor: 'var(--accent,#6c63ff)', cursor: 'pointer', flex: '0 0 auto' }} />
                            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>{subject.name}</span>
                          </label>
                        ))}
                      </div>
                      {/* Confirm button to close dropdown */}
                      <div style={{ borderTop: '1px solid var(--border,#1f2640)', marginTop: '4px', paddingTop: '6px' }}>
                        <button
                          onClick={() => setOpenRevisionDropdown(null)}
                          style={{ width: '100%', background: 'var(--accent,#6c63ff)', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Confirmar{row.subjectIds.length > 0 ? ` (${row.subjectIds.length})` : ''}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <input type="date" value={row.date} onChange={e => updateRevisionRow(row.id, 'date', e.target.value)} style={{ minWidth: 0, width: '100%', background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '10px', padding: '9px 8px', color: row.date ? 'var(--text,#fff)' : 'var(--muted,#6b7194)', outline: 'none', fontSize: '12px' }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid var(--border,#1f2640)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#fff)', letterSpacing: '0.5px' }}>CICLO DE ESTUDO</h2>
            <button onClick={() => setShowCycleModal(true)} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Adicionar</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', background: 'radial-gradient(circle at center, rgba(108,99,255,0.05) 0%, transparent 70%)' }}>
            {cycles.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                 <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.1 }}>âš™ï¸</div>
                 <div style={{ fontSize: '14px' }}>O ciclo estÃ¡ vazio. Comece a girar!</div>
              </div>
            ) : (
              <div style={{ position: 'relative', width: '360px', height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                 <div style={{ position: 'absolute', width: '250px', height: '250px', borderRadius: '50%', border: '20px solid var(--surface2,#181d2e)', opacity: 0.5 }} />
                 <div style={{ textAlign: 'center', zIndex: 10, background: 'var(--surface,#0a0c12)', padding: '24px', borderRadius: '50%', border: '2px dashed var(--border)', boxShadow: '0 0 40px rgba(0,0,0,0.3)' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text,#fff)' }}>CICLO DE</div>
                    <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, letterSpacing: '2px' }}>ESTUDO</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '8px', fontWeight: 600 }}>{cycles.length} BLOCOS</div>
                 </div>
                 {cycles.map((cyc, i) => {
                    const subj = subjects.find(s => s.id === cyc.subject_id)
                    if (!subj) return null
                    const R = 138
                    const angle = (i / cycles.length) * 2 * Math.PI - Math.PI / 2
                    const x = R * Math.cos(angle)
                    const y = R * Math.sin(angle)
                    return (
                      <div key={cyc.id} onClick={() => removeCycle(cyc.id)} style={{ position: 'absolute', left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: 'translate(-50%, -50%)', background: subj.color, color: 'var(--text,#fff)', padding: '10px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 700, boxShadow: `0 10px 30px ${subj.color}40`, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', zIndex: 11, transition: 'all .3s', border: '2px solid rgba(255,255,255,0.2)', maxWidth: '150px' }}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subj.name}</span>
                        <span style={{ padding: '3px 8px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', fontSize: '10px', flex: '0 0 auto' }}>{cyc.duration_minutes >= 60 ? `${Math.floor(cyc.duration_minutes/60)}h${cyc.duration_minutes%60>0?cyc.duration_minutes%60:''}` : `${cyc.duration_minutes}m`}</span>
                      </div>
                    )
                 })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: '24px' }}>
      
      {/* ── PAINEL 1: DISCIPLINAS (Esquerda) ── */}
      <div style={{ flex: '2 1 520px', minWidth: 'min(100%, 420px)', minHeight: '360px', display: 'flex', flexDirection: 'column', background: 'var(--surface,#111420)', borderRadius: '20px', border: '1px solid var(--border,#1f2640)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border,#1f2640)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#fff)', letterSpacing: '0.5px' }}>PAINEL DE DISCIPLINAS</h2>
            <div style={{ background: 'var(--surface2,#181d2e)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', color: 'var(--muted)' }}>{subjects.length}</div>
          </div>
        </div>
        
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 50px 80px 64px', gap: '8px', padding: '12px 24px', fontSize: '10px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', borderBottom: '1px solid var(--border,#1f2640)' }}>
          <span>Disciplina</span>
          <span style={{ textAlign: 'center' }}>Núm</span>
          <span style={{ textAlign: 'center' }}>Status</span>
          <span></span>
        </div>

        {/* Table Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {subjects.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.2 }}>📚</div>
              <div style={{ fontSize: '13px' }}>Nenhuma disciplina cadastrada</div>
            </div>
          ) : subjects.map(subj => (
            <div key={subj.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 50px 80px 64px', gap: '8px', padding: '12px 24px', alignItems: 'center', borderBottom: '1px solid rgba(31,38,64,0.5)', fontSize: '13px', transition: 'all .2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div style={{ minWidth: '28px', height: '28px', borderRadius: '8px', background: `${subj.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Disc size={14} color={subj.color} />
                </div>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text,#fff)', fontWeight: 600 }}>{subj.name}</div>
              </div>
              <div style={{ textAlign: 'center', background: 'var(--surface2,#181d2e)', color: 'var(--accent,#6c63ff)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, padding: '4px 0' }}>
                {subj.code || '000'}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: subj.status === 'Ativo' ? '#10b981' : '#f59e0b', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', background: subj.status === 'Ativo' ? '#10b98115' : '#f59e0b15', padding: '2px 0', borderRadius: '4px' }}>
                  {subj.status || 'Ativo'}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '4px' }}>{subj.target_sessions || 0} sessões</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <button onClick={() => openEditSubjectModal(subj)} title={`Editar ${subj.name}`} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={14} />
                </button>
                <button onClick={() => removeSubject(subj.id)} title={`Remover ${subj.name}`} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '24px' }}>
          <button onClick={openCreateSubjectModal} style={{ width: '100%', padding: '14px', background: 'var(--accent,#6c63ff)', color: 'var(--text,#fff)', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 8px 20px rgba(108,99,255,0.3)' }}>
            Nova Disciplina <Plus size={18} />
          </button>
        </div>
      </div>

      {/* ── PAINEL 2: CRONOGRAMA & CICLOS (Centro) ── */}
      <div style={{ flex: '1 1 360px', minWidth: 'min(100%, 320px)', minHeight: '360px', display: 'flex', flexDirection: 'column', background: 'var(--surface,#111420)', borderRadius: '20px', border: '1px solid var(--border,#1f2640)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--border,#1f2640)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#fff)', letterSpacing: '0.5px' }}>CICLO DE ESTUDO</h2>
          <button onClick={() => setShowCycleModal(true)} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Adicionar</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto' }}>
          {cycles.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: '34px', marginBottom: '10px', opacity: 0.15 }}><RotateCw size={34} /></div>
              <div style={{ fontSize: '13px' }}>Ciclo vazio</div>
            </div>
          ) : (
            <>
              <div style={{ height: '160px', width: '100%', position: 'relative', marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cycleChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {cycleChartData.map((entry, index) => (
                        <Cell key={`cycle-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: 'var(--text,#fff)', fontSize: '12px', fontWeight: 600 }}
                      formatter={(value: number) => [`${value} min`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text,#fff)', lineHeight: 1 }}>{cycles.length}</div>
                  <div style={{ fontSize: '8px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Blocos</div>
                </div>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cycleChartData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', padding: '8px 10px', borderRadius: '8px', background: `${d.color}15`, border: `1px solid ${d.color}30`, transition: 'all .2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', background: d.color }} />
                      <span style={{ color: 'var(--text,#fff)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {String(i + 1).padStart(2, '0')} - {d.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--muted)', fontSize: '10px' }}>{d.duration >= 60 ? `${Math.floor(d.duration/60)}h${d.duration%60>0?d.duration%60+'m':''}` : `${d.duration}m`}</span>
                      <button onClick={() => removeCycle(cycles[i]?.id)} title="Remover do ciclo" style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', transition: 'all .2s' }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'none' }}>
        
        {/* Header com Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid var(--border,#1f2640)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#fff)', letterSpacing: '0.5px' }}>PAINEL DE CRONOGRAMA</h2>
          
          <div style={{ display: 'flex', background: 'var(--bg,#0a0c12)', borderRadius: '10px', padding: '5px', gap: '4px' }}>
            <button onClick={() => setViewMode('calendar')} style={{ background: viewMode === 'calendar' ? 'var(--surface2,#181d2e)' : 'transparent', color: viewMode === 'calendar' ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all .2s' }}>
              <Calendar size={16} /> CALENDÁRIO
            </button>
            <button onClick={() => setViewMode('cycle')} style={{ background: viewMode === 'cycle' ? 'var(--surface2,#181d2e)' : 'transparent', color: viewMode === 'cycle' ? 'var(--accent,#6c63ff)' : 'var(--muted,#6b7194)', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all .2s' }}>
              <RotateCw size={16} /> CICLO DE ESTUDO
            </button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          /* VISÃO CALENDÁRIO */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', background: 'rgba(24,29,46,0.5)', borderBottom: '1px solid var(--border,#1f2640)' }}>
               <button onClick={() => setShowScheduleModal(true)} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>+ Alocar Horário</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', minWidth: '800px' }}>
                 {/* Header Dias */}
                 <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2,#181d2e)' }} />
                 {DAYS.map(d => (
                   <div key={d} style={{ padding: '14px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text,#fff)', borderBottom: '1px solid var(--border)', background: 'var(--surface2,#181d2e)', borderLeft: '1px solid var(--border)' }}>
                     {d}
                   </div>
                 ))}

                 {/* Horas */}
                 {HOURS.map(h => (
                   <React.Fragment key={h}>
                     <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       {String(h).padStart(2, '0')}:00
                     </div>
                     {DAYS.map((_, dayIndex) => {
                       const blocks = getBlocksForSlot(dayIndex, String(h).padStart(2, '0') + ':00')
                       return (
                         <div key={`${h}-${dayIndex}`} style={{ borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', minHeight: '80px', padding: '6px', position: 'relative', background: 'rgba(255,255,255,0.01)' }}>
                           {blocks.map(b => (
                             <div key={b.id} onClick={() => removeSchedule(b.id)} style={{ background: b.color, color: 'var(--text,#fff)', padding: '10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', marginBottom: '6px', boxShadow: `0 8px 16px ${b.color}30`, border: '1px solid rgba(255,255,255,0.1)' }}>
                               <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.subject}</div>
                               <div style={{ fontSize: '9px', opacity: 0.9, background: 'rgba(0,0,0,0.1)', padding: '2px 0', borderRadius: '4px', textAlign: 'center' }}>{b.start_time.slice(0,5)} - {b.end_time.slice(0,5)}</div>
                             </div>
                           ))}
                         </div>
                       )
                     })}
                   </React.Fragment>
                 ))}
               </div>
            </div>
          </div>
        ) : (
          /* VISÃO CICLO (Circular) */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
             <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', background: 'rgba(24,29,46,0.5)', borderBottom: '1px solid var(--border,#1f2640)' }}>
               <button onClick={() => setShowCycleModal(true)} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Adicionar à Engrenagem</button>
             </div>
             
             <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, rgba(108,99,255,0.05) 0%, transparent 70%)' }}>
               {cycles.length === 0 ? (
                 <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.1 }}>⚙️</div>
                    <div style={{ fontSize: '14px' }}>O ciclo está vazio. Comece a girar!</div>
                 </div>
               ) : (
                 <div style={{ position: 'relative', width: '460px', height: '460px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Grande Anel Central */}
                    <div style={{ position: 'absolute', width: '320px', height: '320px', borderRadius: '50%', border: '24px solid var(--surface2,#181d2e)', opacity: 0.5 }} />
                    <div style={{ textAlign: 'center', zIndex: 10, background: 'var(--surface,#0a0c12)', padding: '30px', borderRadius: '50%', border: '2px dashed var(--border)', boxShadow: '0 0 40px rgba(0,0,0,0.3)' }}>
                       <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text,#fff)' }}>CICLO DE</div>
                       <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, letterSpacing: '2px' }}>ESTUDO</div>
                       <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '8px', fontWeight: 600 }}>{cycles.length} BLOCOS</div>
                    </div>

                    {/* Nodes do Ciclo */}
                    {cycles.map((cyc, i) => {
                       const subj = subjects.find(s => s.id === cyc.subject_id)
                       if (!subj) return null
                       const R = 175
                       const angle = (i / cycles.length) * 2 * Math.PI - Math.PI / 2
                       const x = R * Math.cos(angle)
                       const y = R * Math.sin(angle)
                       
                       return (
                         <div key={cyc.id} onClick={() => removeCycle(cyc.id)} style={{
                           position: 'absolute',
                           left: `calc(50% + ${x}px)`,
                           top: `calc(50% + ${y}px)`,
                           transform: 'translate(-50%, -50%)',
                           background: subj.color,
                           color: 'var(--text,#fff)',
                           padding: '12px 18px',
                           borderRadius: '16px',
                           fontSize: '13px',
                           fontWeight: 700,
                           boxShadow: `0 10px 30px ${subj.color}40`,
                           display: 'flex', alignItems: 'center', gap: '8px',
                           cursor: 'pointer', zIndex: 11, transition: 'all .3s',
                           border: '2px solid rgba(255,255,255,0.2)'
                         }}>
                           <span>{subj.name}</span>
                           <span style={{ padding: '3px 8px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', fontSize: '10px' }}>{cyc.duration_minutes >= 60 ? `${Math.floor(cyc.duration_minutes/60)}h${cyc.duration_minutes%60>0?cyc.duration_minutes%60:''}` : `${cyc.duration_minutes}m`}</span>
                         </div>
                       )
                    })}
                 </div>
               )}
             </div>
          </div>
        )}
      </div>

      {/* ── PAINEL 3: ESTATÍSTICA (Direita) ── */}
      <div style={{ flex: '1 1 300px', minWidth: 'min(100%, 280px)', minHeight: '360px', display: 'flex', flexDirection: 'column', background: 'var(--surface,#111420)', borderRadius: '20px', border: '1px solid var(--border,#1f2640)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border,#1f2640)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text,#fff)', letterSpacing: '0.5px' }}>VISÃO GERAL</h2>
        </div>
        
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
           <div style={{ height: '200px', width: '100%', position: 'relative', marginBottom: '10px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ background: 'var(--surface,#111420)', border: '1px solid var(--border,#1f2640)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: 'var(--text,#fff)', fontSize: '12px', fontWeight: 600 }}
                  />
               </PieChart>
             </ResponsiveContainer>
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
               <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text,#fff)', lineHeight: 1 }}>{subjects.length}</div>
               <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginTop: '4px' }}>Disciplinas</div>
             </div>
           </div>

           <div style={{ width: '100%', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'baseline' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text,#fff)' }}>Alocação Semanal</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Total: {totalSessions} sessoes</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {chartData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{ minWidth: '10px', height: '10px', borderRadius: '3px', background: d.color }} />
                      <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ color: 'var(--text,#fff)', fontWeight: 700 }}>{totalSessions > 0 ? Math.round((d.sessions / totalSessions) * 100) : 0}%</span>
                       <div style={{ width: '40px', height: '4px', background: 'var(--surface2,#181d2e)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${totalSessions > 0 ? (d.sessions / totalSessions) * 100 : 0}%`, height: '100%', background: d.color }} />
                       </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
      </div>

      {/* MODALS COMPONENTS */}
      <Modal show={showSubjectModal} onClose={closeSubjectModal} title={editingSubjectId ? "Editar Disciplina" : "Nova Disciplina"}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700 }}>NOME DA DISCIPLINA</div>
            <input value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} placeholder="Ex: Direito Administrativo" style={{ width: '100%', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'var(--text,#fff)', outline: 'none', fontSize: '14px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700 }}>SIGLA / NÚM</div>
              <input value={subForm.code} onChange={e => setSubForm({...subForm, code: e.target.value})} placeholder="Ex: DA1" style={{ width: '100%', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'var(--text,#fff)', outline: 'none', fontSize: '14px' }} />
            </div>
            <div>
               <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700 }}>META SESSÕES</div>
               <input type="number" value={subForm.target_sessions} onChange={e => setSubForm({...subForm, target_sessions: Number(e.target.value)})} style={{ width: '100%', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'var(--text,#fff)', outline: 'none', fontSize: '14px' }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px', fontWeight: 700 }}>COR DE IDENTIFICAÇÃO</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {colors.map(c => (
                 <div key={c} onClick={() => setSubForm({...subForm, color: c})} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: subForm.color === c ? '3px solid #fff' : 'none', boxShadow: subForm.color === c ? `0 0 15px ${c}` : 'none', transition: 'all .2s' }} />
              ))}
            </div>
          </div>
          <button onClick={handleSaveSubject} style={{ marginTop: '10px', background: 'var(--accent,#6c63ff)', color: 'var(--text,#fff)', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(108,99,255,0.3)' }}>
            {editingSubjectId ? 'Salvar alteraÃ§Ãµes' : 'Criar Disciplina'}
          </button>
        </div>
      </Modal>

      <Modal show={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Alocar no Calendário">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700 }}>ESCOLHER DISCIPLINA</div>
            <select value={schedForm.subject_id} onChange={e => setSchedForm({...schedForm, subject_id: e.target.value})} style={{ width: '100%', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'var(--text,#fff)', outline: 'none', fontSize: '14px' }}>
              <option value="">-- Selecionar --</option>
              {cycles.length > 0 
                ? [...cycles].sort((a, b) => a.order_index - b.order_index).map((cyc, i) => {
                    const subj = subjects.find(s => s.id === cyc.subject_id)
                    if (!subj) return null
                    const num = String(i + 1).padStart(2, '0')
                    return <option key={subj.id} value={subj.id}>{num} - {subj.name} {subj.code ? `- ${subj.code}` : ''}</option>
                  })
                : subjects.map((s, i) => {
                    const num = String(i + 1).padStart(2, '0')
                    return <option key={s.id} value={s.id}>{num} - {s.name} {s.code ? `- ${s.code}` : ''}</option>
                  })
              }
            </select>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700 }}>DIA DA SEMANA</div>
            <select value={schedForm.day_of_week} onChange={e => setSchedForm({...schedForm, day_of_week: Number(e.target.value)})} style={{ width: '100%', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'var(--text,#fff)', outline: 'none', fontSize: '14px' }}>
               <option value={1}>Segunda-feira</option>
               <option value={2}>Terça-feira</option>
               <option value={3}>Quarta-feira</option>
               <option value={4}>Quinta-feira</option>
               <option value={5}>Sexta-feira</option>
               <option value={6}>Sábado</option>
               <option value={0}>Domingo</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div>
               <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700 }}>INÍCIO</div>
               <input type="time" value={schedForm.start_time} onChange={e => setSchedForm({...schedForm, start_time: e.target.value})} style={{ width: '100%', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'var(--text,#fff)', outline: 'none', fontSize: '14px' }} />
             </div>
             <div>
               <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700 }}>TÉRMINO</div>
               <input type="time" value={schedForm.end_time} onChange={e => setSchedForm({...schedForm, end_time: e.target.value})} style={{ width: '100%', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'var(--text,#fff)', outline: 'none', fontSize: '14px' }} />
             </div>
          </div>
          <button onClick={handleAddSchedule} style={{ marginTop: '10px', background: 'var(--accent,#6c63ff)', color: 'var(--text,#fff)', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Agendar Horário</button>
        </div>
      </Modal>

      <Modal show={showCycleModal} onClose={() => setShowCycleModal(false)} title="Adicionar Bloco ao Ciclo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700 }}>ORDEM NO FLUXO</div>
            <select value={cycleForm.subject_id} onChange={e => setCycleForm({...cycleForm, subject_id: e.target.value})} style={{ width: '100%', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'var(--text,#fff)', outline: 'none', fontSize: '14px' }}>
              <option value="">-- Disciplina --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700 }}>DURAÇÃO ESTIMADA</div>
            <select value={cycleForm.duration_minutes} onChange={e => setCycleForm({...cycleForm, duration_minutes: Number(e.target.value)})} style={{ width: '100%', background: 'var(--surface2,#181d2e)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'var(--text,#fff)', outline: 'none', fontSize: '14px' }}>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={90}>1 hora e 30 minutos</option>
              <option value={120}>2 horas</option>
              <option value={150}>2 horas e 30 minutos</option>
              <option value={180}>3 horas</option>
            </select>
          </div>
          <button onClick={handleAddCycle} style={{ marginTop: '10px', background: 'var(--accent,#6c63ff)', color: 'var(--text,#fff)', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Anexar ao Ciclo</button>
        </div>
      </Modal>

    </div>
  )
}
