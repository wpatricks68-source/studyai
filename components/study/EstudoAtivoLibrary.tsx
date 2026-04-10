'use client'

import { useState } from 'react'

// ─── Types ──────────────────────────────────────────────────

interface Flashcard {
  id: string
  front: string
  back: string
  topic: string | null
  materia: string | null
  session_id: string | null
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

  const discGroup   = groups.find(g => g.disciplina === selectedDisc) ?? null
  const topicGroup  = discGroup?.topics.find(t => t.topic === selectedTopic) ?? null

  // Auto-select first topic when discipline changes
  const handleSelectDisc = (disc: string) => {
    setSelectedDisc(disc)
    const g = groups.find(d => d.disciplina === disc)
    setSelectedTopic(g?.topics[0]?.topic ?? null)
    setActiveTab('flashcards')
  }

  if (groups.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px', color: 'var(--muted)', padding: '40px' }}>
        <div style={{ fontSize: '40px', opacity: .25 }}>🎓</div>
        <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>Nenhum conteúdo salvo ainda</div>
        <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '360px', lineHeight: 1.7 }}>
          Gere flashcards e questões na página <strong>Busca + IA</strong> e eles aparecerão aqui organizados por disciplina e tema.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Painel esquerdo: disciplinas e temas ── */}
      <div style={{
        width: '240px', flexShrink: 0,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--muted)', fontWeight: 600 }}>
            Estudo Ativo
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
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
                  color:      selectedDisc === g.disciplina ? 'var(--accent)' : 'var(--text)',
                  borderLeft: selectedDisc === g.disciplina ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all .12s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, flex: 1, lineHeight: 1.4 }}>
                  {g.disciplina}
                </span>
                <span style={{
                  fontSize: '10px', padding: '1px 6px', borderRadius: '8px', flexShrink: 0,
                  background: selectedDisc === g.disciplina ? 'rgba(108,99,255,.2)' : 'var(--surface2)',
                  color: selectedDisc === g.disciplina ? 'var(--accent)' : 'var(--muted)',
                }}>
                  {g.topics.length}
                </span>
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
                        color:      selectedTopic === t.topic ? 'var(--accent)' : 'var(--muted)',
                        fontSize: '12px', lineHeight: 1.4, transition: 'all .1s',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px',
                      }}
                    >
                      <span style={{ flex: 1 }}>{t.topic}</span>
                      <span style={{ fontSize: '10px', flexShrink: 0, opacity: .7 }}>
                        {t.flashcards.length > 0 && `${t.flashcards.length}fc`}
                        {t.flashcards.length > 0 && t.questions.length > 0 && ' '}
                        {t.questions.length > 0 && `${t.questions.length}q`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Painel direito: conteúdo do tema ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!topicGroup ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '32px', opacity: .25 }}>📚</div>
            <div style={{ fontSize: '14px', color: 'var(--text)' }}>Selecione um tema</div>
          </div>
        ) : (
          <>
            {/* Header do tema */}
            <div style={{ padding: '14px 20px 0', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                {selectedDisc}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
                {topicGroup.topic}
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
                      color:       activeTab === tab ? 'var(--accent)' : 'var(--muted)',
                      borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
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
                <FlashcardsPanel cards={topicGroup.flashcards} />
              ) : (
                <QuestoesPanel questions={topicGroup.questions} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Flashcards Panel ────────────────────────────────────────

function FlashcardsPanel({ cards }: { cards: Flashcard[] }) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({})

  if (cards.length === 0) {
    return (
      <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '20px 0' }}>
        Nenhum flashcard gerado para este tema ainda.
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
        {cards.length} flashcard{cards.length !== 1 ? 's' : ''} — clique para ver a resposta
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
        {cards.map((card) => {
          const isFlipped = !!flipped[card.id]
          return (
            <div
              key={card.id}
              onClick={() => setFlipped(f => ({ ...f, [card.id]: !f[card.id] }))}
              style={{
                background: 'var(--surface)',
                border: `1px solid ${isFlipped ? 'var(--accent2,#00d4aa)' : 'var(--border)'}`,
                borderRadius: '12px', padding: '18px 16px', cursor: 'pointer',
                minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                transition: 'border-color .2s, transform .15s', userSelect: 'none',
                transform: isFlipped ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              {!isFlipped ? (
                <>
                  <div style={{ fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                    Frente
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.65, fontWeight: 500 }}>
                    {card.front}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '12px' }}>
                    Toque para ver a resposta
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '10px', color: 'var(--accent2,#00d4aa)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                    Verso
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.7 }}>
                    {card.back}
                  </div>
                </>
              )}
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
      <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '20px 0' }}>
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
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '14px 18px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: pctColor, minWidth: '56px' }}>{pct}%</div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
              {totalCertas} de {totalResp} corretas
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
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
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '18px', marginBottom: '14px',
          }}>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '10px', padding: '2px 7px', borderRadius: '4px', fontWeight: 600,
                  background: q.tipo === 'cv' ? 'rgba(245,158,11,.12)' : 'rgba(108,99,255,.12)',
                  color: q.tipo === 'cv' ? '#f59e0b' : 'var(--accent)',
                }}>
                  {q.tipo === 'cv' ? 'CERTO / ERRADO' : 'MÚLTIPLA ESCOLHA'}
                </span>
              </div>
              {q.banca && <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{q.banca}</span>}
            </div>

            {/* Enunciado */}
            <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.75, marginBottom: '16px', fontWeight: 500 }}>
              {q.question}
            </div>

            {/* Opções C/E */}
            {q.tipo === 'cv' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['C', 'E'] as const).map(opt => {
                  const selected = answers[q.id] === opt
                  const isRight  = opt === q.gabarito
                  let bg = 'var(--surface2,#181d2e)', brd = 'var(--border)', clr = 'var(--muted)'
                  if (rev) {
                    if (isRight)           { bg = 'rgba(16,185,129,.12)'; brd = '#10b981'; clr = '#34d399' }
                    else if (selected)     { bg = 'rgba(239,68,68,.1)';   brd = '#ef4444'; clr = '#f87171' }
                  } else if (selected) {
                    bg = 'rgba(108,99,255,.12)'; brd = 'var(--accent)'; clr = 'var(--accent)'
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
                  let bg = 'var(--surface2,#181d2e)', brd = 'var(--border)', clr = 'var(--text)'
                  if (rev) {
                    if (isRight)       { bg = 'rgba(16,185,129,.12)'; brd = '#10b981'; clr = '#34d399' }
                    else if (selected) { bg = 'rgba(239,68,68,.1)';   brd = '#ef4444'; clr = '#f87171' }
                  } else if (selected) {
                    bg = 'rgba(108,99,255,.12)'; brd = 'var(--accent)'
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
                  background: answered ? 'var(--accent)' : 'var(--surface2,#181d2e)',
                  color: answered ? '#fff' : 'var(--muted)',
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
                <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.65 }}>
                  {q.explanation}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Gabarito */}
      <div style={{ marginTop: '8px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setShowGab(g => !g)}
          style={{
            width: '100%', padding: '11px', borderRadius: '10px', cursor: 'pointer',
            border: '1px solid var(--border)',
            background: showGab ? 'rgba(108,99,255,.12)' : 'transparent',
            color: showGab ? 'var(--accent)' : 'var(--muted)',
            fontSize: '13px', fontWeight: 600, transition: 'all .15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          {showGab ? 'Ocultar Gabarito' : 'Ver Gabarito'}
        </button>

        {showGab && (
          <div style={{ marginTop: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
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
                  borderBottom: qi < questions.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                }}>
                  <div style={{ minWidth: '28px', fontSize: '11px', color: 'var(--accent)', fontWeight: 700, paddingTop: '2px' }}>Q{qi + 1}</div>
                  <div style={{
                    fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap', marginTop: '1px',
                    background: q.tipo === 'cv' ? 'rgba(245,158,11,.12)' : 'rgba(108,99,255,.12)',
                    color: q.tipo === 'cv' ? '#f59e0b' : 'var(--accent)',
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
                    {textoOpcao && <span style={{ fontSize: '12px', color: 'var(--text)' }}>{textoOpcao}</span>}
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.5 }}>
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
