'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StudySession } from '@/types/database'
import { formatDate } from '@/lib/utils'

export default function ResumoLibrary({ sessions }: { sessions: StudySession[] }) {
  const [list, setList]             = useState(sessions)
  const [query, setQuery]           = useState('')
  const [filterMat, setFilterMat]   = useState('all')
  const [selected, setSelected]     = useState<StudySession | null>(null)
  const [activeTab, setActiveTab]   = useState<'resumo' | 'notas' | 'progresso'>('resumo')
  const [notas, setNotas]           = useState('')
  const [savingNota, setSavingNota] = useState(false)

  const materias = Array.from(new Set(sessions.map(s => s.materia).filter(Boolean))) as string[]

  const filtered = list.filter(s => {
    const matchQ   = !query || s.title.toLowerCase().includes(query.toLowerCase()) ||
                     (s.tags ?? []).some(t => t.toLowerCase().includes(query.toLowerCase()))
    const matchMat = filterMat === 'all' || s.materia === filterMat
    return matchQ && matchMat
  })

  function openSession(s: StudySession) {
    setSelected(s)
    setNotas(s.notas ?? '')
    setActiveTab('resumo')
  }

  async function saveNotas() {
    if (!selected) return
    setSavingNota(true)
    const supabase = createClient()
    await supabase.from('study_sessions').update({ notas }).eq('id', selected.id)
    setList(prev => prev.map(s => s.id === selected.id ? { ...s, notas } : s))
    setSavingNota(false)
  }

  async function registerRevisao() {
    if (!selected) return
    const supabase = createClient()
    const newCount = (selected.revisoes ?? 0) + 1
    await supabase.from('study_sessions').update({ revisoes: newCount }).eq('id', selected.id)
    const updated = { ...selected, revisoes: newCount }
    setSelected(updated)
    setList(prev => prev.map(s => s.id === selected.id ? updated : s))
  }

  async function deleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Tem certeza que deseja excluir esta sessão?')) return
    const supabase = createClient()
    await supabase.from('study_sessions').delete().eq('id', id)
    setList(prev => prev.filter(s => s.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const acertoCor = (v: number) => v >= 80 ? '#10b981' : v >= 65 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Library sidebar */}
      <div style={{ width: '300px', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)', marginBottom: '10px' }}>
            Minhas sessões
          </div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar resumo..."
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '7px 11px', color: 'var(--text)',
              fontSize: '13px', outline: 'none', marginBottom: '10px',
            }}
          />
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {['all', ...materias].map(m => (
              <button
                key={m}
                onClick={() => setFilterMat(m)}
                style={{
                  padding: '3px 9px', borderRadius: '20px', fontSize: '11px',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  background: filterMat === m ? 'rgba(108,99,255,.15)' : 'transparent',
                  borderColor: filterMat === m ? 'var(--accent)' : 'var(--border)',
                  color: filterMat === m ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {m === 'all' ? 'Todas' : m.replace('Direito ', 'Dir. ')}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--muted)', padding: '7px 14px', borderBottom: '1px solid var(--border)' }}>
          {filtered.length} sessão(ões)
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
              Nenhuma sessão encontrada
            </div>
          ) : filtered.map(s => (
            <div
              key={s.id}
              onClick={() => openSession(s)}
              style={{
                position: 'relative',
                borderRadius: '10px', border: `1px solid ${selected?.id === s.id ? 'var(--accent)' : 'var(--border)'}`,
                padding: '12px 13px', marginBottom: '7px', cursor: 'pointer',
                background: selected?.id === s.id ? 'rgba(108,99,255,.1)' : 'var(--surface2)',
                transition: 'all .12s',
              }}
            >
              <button
                onClick={(e) => deleteSession(e, s.id)}
                style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: 'transparent', border: 'none', color: 'var(--muted)',
                  cursor: 'pointer', padding: '4px', fontSize: '14px', lineHeight: 1
                }}
                title="Excluir sessão"
              >
                ✕
              </button>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '5px', lineHeight: 1.4, paddingRight: '16px' }}>
                {s.title}
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                <span>{s.materia?.replace('Direito ', 'Dir. ')}</span>
                <span>•</span>
                <span>{formatDate(s.created_at)}</span>
                <span>•</span>
                <span>{s.revisoes} rev.</span>
              </div>
              {(s.tags ?? []).length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {(s.tags ?? []).slice(0, 3).map(t => (
                    <span key={t} style={{
                      padding: '1px 7px', borderRadius: '10px', fontSize: '10px',
                      background: 'rgba(108,99,255,.1)', color: '#a09cf7',
                      border: '1px solid rgba(108,99,255,.2)',
                    }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Viewer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '36px', opacity: .3 }}>📖</div>
            <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 500 }}>Selecione uma sessão</div>
            <div style={{ fontSize: '13px' }}>Escolha um resumo na lista ao lado para revisar</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)', flex: 1, margin: 0 }}>
                  {selected.title}
                </h2>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={registerRevisao}
                    style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}
                  >
                    + Revisão
                  </button>
                  <a
                    href={`/dashboard/busca?id=${selected.id}`}
                    style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '12px', textDecoration: 'none' }}
                  >
                    Abrir editor
                  </a>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(108,99,255,.1)', color: '#a09cf7', border: '1px solid rgba(108,99,255,.2)' }}>
                  {selected.materia}
                </span>
                <span>{formatDate(selected.created_at)}</span>
                <span>{selected.revisoes} revisão(ões)</span>
                <span style={{ padding: '2px 8px', borderRadius: '10px', background: selected.revisoes < 2 ? 'rgba(245,158,11,.1)' : 'rgba(16,185,129,.08)', color: selected.revisoes < 2 ? '#fbbf24' : '#34d399', border: `1px solid ${selected.revisoes < 2 ? 'rgba(245,158,11,.2)' : 'rgba(16,185,129,.2)'}` }}>
                  {selected.revisoes < 2 ? 'Precisa revisar' : 'Em dia'}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {(['resumo', 'notas', 'progresso'] as const).map(t => (
                <div
                  key={t}
                  onClick={() => setActiveTab(t)}
                  style={{
                    padding: '9px 16px', fontSize: '13px', cursor: 'pointer',
                    color: activeTab === t ? 'var(--accent)' : 'var(--muted)',
                    borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                    textTransform: 'capitalize',
                  }}
                >
                  {t}
                </div>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
              {activeTab === 'resumo' && (
                <div style={{ fontSize: '14px', lineHeight: 1.9, color: '#c8cae6', whiteSpace: 'pre-wrap' }}>
                  {selected.content || 'Conteúdo não disponível.'}
                </div>
              )}

              {activeTab === 'notas' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Minhas anotações</span>
                    <button
                      onClick={saveNotas}
                      disabled={savingNota}
                      style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                    >
                      {savingNota ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Escreva suas anotações, dúvidas ou pontos importantes..."
                    style={{
                      width: '100%', minHeight: '200px', background: 'var(--surface2)',
                      border: '1px solid var(--border)', borderRadius: '10px',
                      padding: '12px 14px', color: 'var(--text)', fontSize: '13px',
                      lineHeight: 1.8, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  {(selected.tags ?? []).length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>Tags</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(selected.tags ?? []).map(t => (
                          <span key={t} style={{ padding: '3px 9px', borderRadius: '10px', fontSize: '11px', background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'progresso' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { val: `${selected.revisoes}`, lbl: 'Revisões feitas', color: 'var(--accent)' },
                      { val: `${selected.duration_min}min`, lbl: 'Tempo de estudo', color: 'var(--accent2)' },
                      { val: formatDate(selected.created_at), lbl: 'Data da sessão', color: 'var(--muted)' },
                    ].map(c => (
                      <div key={c.lbl} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: c.color, marginBottom: '4px' }}>{c.val}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{c.lbl}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                      <span>Frequência de revisão</span>
                      <span style={{ color: 'var(--text)' }}>{Math.min(100, (selected.revisoes ?? 0) * 20)}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (selected.revisoes ?? 0) * 20)}%`, background: 'var(--accent)', borderRadius: '3px', transition: 'width .6s' }} />
                    </div>
                  </div>
                  <button
                    onClick={registerRevisao}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Registrar nova revisão
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
