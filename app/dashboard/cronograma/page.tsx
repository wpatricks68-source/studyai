'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Schedule } from '@/types/database'

const DAYS  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6h–21h

export default function CronogramaPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState({ subject: '', materia: '', day_of_week: 1, start_time: '07:00', end_time: '09:00', color: '#6c63ff' })
  const [adding, setAdding]       = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('schedules').select('*').eq('is_active', true)
    setSchedules(data ?? [])
    setLoading(false)
  }

  async function addSchedule() {
    if (!form.subject) return
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('schedules').insert({ ...form, user_id: user.id }).select().single()
    if (data) setSchedules(s => [...s, data])
    setForm({ subject: '', materia: '', day_of_week: 1, start_time: '07:00', end_time: '09:00', color: '#6c63ff' })
    setAdding(false)
  }

  async function removeSchedule(id: string) {
    const supabase = createClient()
    await supabase.from('schedules').update({ is_active: false }).eq('id', id)
    setSchedules(s => s.filter(sc => sc.id !== id))
  }

  function getBlocksForSlot(day: number, hour: number) {
    return schedules.filter(s => {
      if (s.day_of_week !== day) return false
      const start = parseInt(s.start_time.split(':')[0])
      const end   = parseInt(s.end_time.split(':')[0])
      return hour >= start && hour < end
    })
  }

  const colors = ['#6c63ff', '#00d4aa', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899']

  return (
    <div style={{ padding: '28px 32px', flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>Cronograma semanal</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>{schedules.length} bloco(s) programado(s)</p>
        </div>
      </div>

      {/* Add form */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '12px' }}>Adicionar bloco</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end', flexWrap: 'wrap' }}>
          {[
            { label: 'Assunto', key: 'subject', type: 'text', placeholder: 'Ex: Direito Constitucional' },
            { label: 'Início', key: 'start_time', type: 'time', placeholder: '' },
            { label: 'Fim', key: 'end_time', type: 'time', placeholder: '' },
          ].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{f.label}</div>
              <input
                type={f.type}
                value={(form as Record<string, string | number>)[f.key] as string}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text)', fontSize: '13px', outline: 'none' }}
              />
            </div>
          ))}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Dia</div>
            <select
              value={form.day_of_week}
              onChange={e => setForm(p => ({ ...p, day_of_week: Number(e.target.value) }))}
              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text)', fontSize: '13px', outline: 'none' }}
            >
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Cor</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {colors.map(c => (
                <div
                  key={c}
                  onClick={() => setForm(p => ({ ...p, color: c }))}
                  style={{ width: '20px', height: '20px', borderRadius: '4px', background: c, cursor: 'pointer', border: form.color === c ? '2px solid #fff' : '2px solid transparent' }}
                />
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={addSchedule}
          disabled={adding || !form.subject}
          style={{ marginTop: '12px', padding: '8px 20px', borderRadius: '8px', border: 'none', background: adding || !form.subject ? 'var(--surface2)' : 'var(--accent)', color: adding || !form.subject ? 'var(--muted)' : '#fff', fontSize: '13px', fontWeight: 500, cursor: adding || !form.subject ? 'default' : 'pointer' }}
        >
          {adding ? 'Adicionando...' : '+ Adicionar bloco'}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Carregando...</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', minWidth: '600px' }}>
            {/* Header */}
            <div style={{ background: 'var(--surface2)', padding: '8px 4px', fontSize: '11px', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }} />
            {DAYS.map(d => (
              <div key={d} style={{ background: 'var(--surface2)', padding: '8px 4px', fontSize: '11px', color: 'var(--text)', fontWeight: 500, textAlign: 'center', borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>
                {d}
              </div>
            ))}

            {/* Hours */}
            {HOURS.map(h => (
              <>
                <div key={`h${h}`} style={{ padding: '4px', fontSize: '10px', color: 'var(--muted)', textAlign: 'center', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {h}h
                </div>
                {DAYS.map((_, d) => {
                  const blocks = getBlocksForSlot(d, h)
                  return (
                    <div key={`${h}-${d}`} style={{ borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)', minHeight: '32px', padding: '2px', position: 'relative' }}>
                      {blocks.map(b => (
                        <div
                          key={b.id}
                          style={{ borderRadius: '4px', padding: '2px 5px', fontSize: '10px', fontWeight: 500, background: `${b.color}25`, color: b.color, border: `1px solid ${b.color}40`, cursor: 'pointer', lineHeight: 1.3, wordBreak: 'break-word' }}
                          onClick={() => removeSchedule(b.id)}
                          title="Clique para remover"
                        >
                          {b.subject}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
