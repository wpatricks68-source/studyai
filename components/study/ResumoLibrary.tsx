'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StudySession, Flashcard, Question } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { CreditCard, HelpCircle, PencilLine, Maximize2 } from 'lucide-react'
import ResumoPrintWindow from '@/components/study/ResumoPrintWindow'
import InteractiveQuestionsPanel from '@/components/study/InteractiveQuestionsPanel'

export default function ResumoLibrary({ sessions }: { sessions: StudySession[] }) {
  const [list, setList]             = useState(sessions)
  const [query, setQuery]           = useState('')
  const [filterMat, setFilterMat]   = useState('all')
  const [selected, setSelected]     = useState<StudySession | null>(null)
  const [activeTab, setActiveTab]   = useState<'resumo' | 'notas' | 'progresso'>('resumo')
  const [notas, setNotas]           = useState('')
  const [savingNota, setSavingNota] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [showResumoWindow, setShowResumoWindow] = useState(false)
  const [sessionFlashcards, setSessionFlashcards] = useState<Flashcard[]>([])
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([])

  // Auto-hide on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) setIsSidebarOpen(false)
  }, [])

  const materias = Array.from(new Set(sessions.map(s => s.materia).filter(Boolean))) as string[]

  const filtered = list.filter(s => {
    const q = query.toLowerCase()
    const matchQ   = !query || 
                     s.title.toLowerCase().includes(q) ||
                     (s.materia?.toLowerCase() ?? '').includes(q) ||
                     (s.tags ?? []).some(t => t.toLowerCase().includes(q))
    const matchMat = filterMat === 'all' || s.materia === filterMat
    return matchQ && matchMat
  })

  async function openSession(s: StudySession) {
    setSelected(s)
    setNotas(s.notas ?? '')
    setActiveTab('resumo')
    
    // Fetch flashcards and questions associated with this session
    const supabase = createClient()
    const { data: fcs } = await supabase.from('flashcards').select('*').eq('session_id', s.id)
    const { data: qs } = await supabase.from('questions').select('*').eq('session_id', s.id)
    setSessionFlashcards(fcs || [])
    setSessionQuestions(qs || [])
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
    const newDates = [...(selected.revisao_dates ?? []), new Date().toISOString()]
    await supabase
      .from('study_sessions')
      .update({ revisoes: newCount, revisao_dates: newDates })
      .eq('id', selected.id)
    const updated = { ...selected, revisoes: newCount, revisao_dates: newDates }
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

  function scrollToSection(id: string) {
    setActiveTab('resumo')
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Library sidebar */}
      <div style={{ 
        width: isSidebarOpen ? '300px' : '0px', 
        opacity: isSidebarOpen ? 1 : 0,
        background: 'var(--surface)', 
        borderRight: isSidebarOpen ? '1px solid var(--border)' : 'none', 
        display: 'flex', 
        flexDirection: 'column', 
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.25s ease, opacity 0.2s ease',
        position: 'relative'
      }}>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        
        {/* Toggle Button (when sidebar is closed) */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            style={{
              position: 'absolute', top: '15px', left: '15px', zIndex: 10,
              width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--accent)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            title="Abrir Biblioteca"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}

        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--muted)', padding: '20px' }}>
            <div style={{ fontSize: '36px', opacity: .3 }}>📖</div>
            <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 500 }}>Selecione uma sessão</div>
            <div style={{ fontSize: '13px' }}>Escolha um resumo na lista ao lado para revisar</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isSidebarOpen && (
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      title="Recolher Biblioteca"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                  )}
                  <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)', flex: 1, margin: 0, paddingLeft: !isSidebarOpen ? '32px' : '0' }}>
                    {selected.title}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {sessionFlashcards.length > 0 && (
                    <button
                      onClick={() => scrollToSection('sec-flashcards')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(108,99,255,0.2)', background: 'rgba(108,99,255,0.05)', color: 'var(--accent)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <CreditCard size={14} /> FLASHCARDS
                    </button>
                  )}
                  {sessionQuestions.length > 0 && (
                    <button
                      onClick={() => scrollToSection('sec-questoes')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(0,212,170,0.2)', background: 'rgba(0,212,170,0.05)', color: '#00d4aa', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <HelpCircle size={14} /> QUESTÕES
                    </button>
                  )}
                  <button
                    onClick={() => setShowResumoWindow(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Maximize2 size={14} /> ABRIR JANELA
                  </button>
                  <a
                    href={`/dashboard/busca?id=${selected.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}
                  >
                    <PencilLine size={14} /> EDITAR
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {activeTab === 'resumo' && (
                <div className="ed-library-content" style={{ fontSize: '14px', lineHeight: 1.9, color: 'var(--text)', maxWidth: '820px', width: '100%' }}>
                  <div style={{ marginBottom: '40px' }}>
                    {(() => {
                      if (!selected.content) return 'Conteúdo não disponível.'
                      try {
                        const data = JSON.parse(selected.content)
                        if (data.type === 'rich') {
                          return (
                            <div style={{ position: 'relative' }}>
                              <div dangerouslySetInnerHTML={{ __html: data.html }} />
                              {data.canvas && (
                                <img src={data.canvas} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', pointerEvents: 'none' }} alt="Anotações" />
                              )}
                            </div>
                          )
                        }
                      } catch {}
                      
                      return <div style={{ whiteSpace: 'pre-wrap' }}>{selected.content}</div>
                    })()}
                  </div>

                  {sessionFlashcards.length > 0 && (
                    <div id="sec-flashcards" style={{ marginTop: '60px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <CreditCard size={20} color="var(--accent)" />
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Flashcards do Tema</h3>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {sessionFlashcards.map((fc, i) => (
                          <div key={fc.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Card {i + 1}</div>
                            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{fc.front}</div>
                            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', color: 'rgba(232,234,246,0.8)', fontSize: '13px', borderLeft: '3px solid var(--accent)' }}>
                              {fc.back}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sessionQuestions.length > 0 && (
                    <div id="sec-questoes" style={{ marginTop: '60px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                      <InteractiveQuestionsPanel
                        questions={sessionQuestions}
                        title="Questões do Tema"
                        maxWidth="100%"
                        showEmptyState={false}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notas' && (
                <div style={{ maxWidth: '820px', width: '100%' }}>
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
                <div style={{ maxWidth: '820px', width: '100%' }}>
                  {/* Stats cards */}
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

                  {/* Progress bar */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                      <span>Frequência de revisão</span>
                      <span style={{ color: 'var(--text)' }}>{Math.min(100, (selected.revisoes ?? 0) * 20)}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (selected.revisoes ?? 0) * 20)}%`, background: 'var(--accent)', borderRadius: '3px', transition: 'width .6s' }} />
                    </div>
                  </div>

                  {/* Revision history timeline */}
                  {(selected.revisao_dates ?? []).length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', marginBottom: '10px' }}>Histórico de revisões</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {[...(selected.revisao_dates ?? [])].reverse().map((dateStr, i, arr) => {
                          const d = new Date(dateStr)
                          const isLast = i === arr.length - 1
                          return (
                            <div key={dateStr + i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                              {/* Timeline spine */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                <div style={{
                                  width: '10px', height: '10px', borderRadius: '50%', marginTop: '3px',
                                  background: i === 0 ? 'var(--accent)' : 'var(--border)',
                                  border: i === 0 ? '2px solid var(--accent)' : '2px solid var(--muted)',
                                  flexShrink: 0,
                                }} />
                                {!isLast && <div style={{ width: '2px', flex: 1, minHeight: '18px', background: 'var(--border)', margin: '2px 0' }} />}
                              </div>
                              {/* Date info */}
                              <div style={{ paddingBottom: isLast ? 0 : '10px' }}>
                                <div style={{ fontSize: '12px', color: i === 0 ? 'var(--text)' : 'var(--muted)', fontWeight: i === 0 ? 500 : 400 }}>
                                  {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                  {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  {i === 0 && <span style={{ marginLeft: '6px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(108,99,255,.15)', color: 'var(--accent)', fontSize: '10px' }}>mais recente</span>}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Register button removed as per user request */}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showResumoWindow && selected && (
        <ResumoPrintWindow
          title={selected.title}
          subtitle={[selected.materia, formatDate(selected.created_at), `${selected.revisoes} revisoes`].filter(Boolean).join(' - ')}
          resumo={selected.content}
          flashcards={sessionFlashcards}
          questions={sessionQuestions}
          onClose={() => setShowResumoWindow(false)}
        />
      )}
    </div>
  )
}
