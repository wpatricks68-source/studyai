'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcNextReview } from '@/lib/utils'
import type { Flashcard } from '@/types/database'

export default function FlashcardReview({ cards, totalCards }: { cards: Flashcard[]; totalCards: number }) {
  const [queue, setQueue]     = useState<Flashcard[]>(cards)
  const [idx, setIdx]         = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone]       = useState(0)
  const [correct, setCorrect] = useState(0)

  const card    = queue[idx]
  const isEnd   = idx >= queue.length

  async function rate(difficulty: 1 | 3 | 5) {
    if (!card) return
    const supabase = createClient()
    const isCorrect = difficulty >= 3

    await supabase.from('flashcards').update({
      difficulty,
      next_review: calcNextReview(difficulty).toISOString(),
    }).eq('id', card.id)

    if (isCorrect) setCorrect(c => c + 1)
    setDone(d => d + 1)
    setFlipped(false)
    setTimeout(() => setIdx(i => i + 1), 200)
  }

  if (cards.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px', padding: '40px' }}>
        <div style={{ fontSize: '48px', opacity: .4 }}>✓</div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>Nenhum card para revisar hoje</div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
          Você tem {totalCards} flashcard{totalCards !== 1 ? 's' : ''} no total.
          Volte amanhã ou crie novos na área de busca.
        </div>
        <a href="/dashboard/busca" style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
          Criar novos flashcards
        </a>
      </div>
    )
  }

  if (isEnd) {
    const pct = queue.length > 0 ? Math.round((correct / queue.length) * 100) : 0
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '40px' }}>
        <div style={{ fontSize: '52px', fontWeight: 700, color: pct >= 70 ? 'var(--green)' : 'var(--amber)' }}>{pct}%</div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
          {pct >= 80 ? 'Excelente!' : pct >= 60 ? 'Bom resultado!' : 'Continue praticando!'}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
          {correct} de {queue.length} cards acertados
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            onClick={() => { setIdx(0); setFlipped(false); setDone(0); setCorrect(0) }}
            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: '13px', cursor: 'pointer' }}
          >
            Refazer
          </button>
          <a href="/dashboard" style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
            Voltar ao dashboard
          </a>
        </div>
      </div>
    )
  }

  const pct = Math.round((idx / queue.length) * 100)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 40px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      {/* Progress */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
          <span>{idx + 1} de {queue.length} cards</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: '4px', background: 'var(--surface2)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: '2px', transition: 'width .4s' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--green)' }}>✓ {correct} corretos</span>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>•</span>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{done - correct} para revisar</span>
        </div>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          background: 'var(--surface)', border: `1px solid ${flipped ? 'var(--accent2)' : 'var(--border)'}`,
          borderRadius: '16px', padding: '40px 32px', minHeight: '220px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .25s', textAlign: 'center', userSelect: 'none',
        }}
      >
        {!flipped ? (
          <>
            <div style={{ fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
              Pergunta
            </div>
            <div style={{ fontSize: '16px', color: 'var(--text)', fontWeight: 500, lineHeight: 1.6 }}>
              {card.front}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '20px' }}>
              Toque para ver a resposta
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '11px', color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
              Resposta
            </div>
            <div style={{ fontSize: '15px', color: '#c8cae6', lineHeight: 1.7 }}>
              {card.back}
            </div>
          </>
        )}
      </div>

      {/* Rate buttons — só aparecem após virar */}
      {flipped && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          {[
            { diff: 1 as const, label: 'Difícil', color: 'rgba(239,68,68,.15)', text: '#f87171' },
            { diff: 3 as const, label: 'Regular', color: 'rgba(245,158,11,.15)', text: '#fbbf24' },
            { diff: 5 as const, label: 'Fácil',   color: 'rgba(16,185,129,.15)', text: '#34d399' },
          ].map(b => (
            <button
              key={b.diff}
              onClick={() => rate(b.diff)}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                background: b.color, color: b.text, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      {!flipped && (
        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: 'var(--muted)' }}>
          {card.materia && <span>{card.materia}</span>}
        </div>
      )}
    </div>
  )
}
