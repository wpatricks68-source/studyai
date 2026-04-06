'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type GenType  = 'summary' | 'flashcards' | 'questions'
type ViewMode = 'resumo' | 'flashcards' | 'questoes'

interface Source { title: string; url: string; snippet: string }

interface Flashcard { front: string; back: string }

interface Question {
  question: string
  tipo: 'cv' | 'mc'
  options?: string[]
  correct?: number
  gabarito?: string
  explanation: string
  banca?: string
}

interface SessionState {
  query:      string
  resumo:     string
  flashcards: Flashcard[]
  questions:  Question[]
  sources:    Source[]
  sessionId:  string | null
  savedAt:    string | null
}

const EMPTY: SessionState = {
  query: '',
  resumo: '',
  flashcards: [],
  questions: [],
  sources: [],
  sessionId: null,
  savedAt: null,
}

export default function BuscaPage() {
  const [query, setQuery] = useState('')
  const [session, setSession] = useState<SessionState>(EMPTY)
  const [view, setView] = useState<ViewMode>('resumo')
  const [phase, setPhase] = useState<'idle' | 'searching' | 'generating' | 'done'>('idle')
  const [genTarget, setGenTarget] = useState<GenType | null>(null)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  function cancel() {
    abortRef.current?.abort()
    setPhase('idle')
    setGenTarget(null)
  }

  const isLoading = phase === 'searching' || phase === 'generating'
  const hasContent = phase === 'done' && session.resumo

  return (
    <div className="p-6 text-white">

      {/* INPUT */}
      <input
        className="w-full p-2 rounded bg-zinc-800 mb-4"
        placeholder="Digite o que deseja estudar..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* LOADING */}
      {isLoading && (
        <div className="mb-4">
          <span>
            {phase === 'searching'
              ? 'Pesquisando na web...'
              : genTarget === 'summary'
                ? 'Gerando resumo com IA...'
                : genTarget === 'flashcards'
                  ? 'Criando flashcards...'
                  : 'Gerando questões...'}
          </span>
        </div>
      )}

      {/* RESULTADO */}
      {hasContent && (
        <div>
          <h2 className="text-xl font-bold mb-2">Resumo</h2>
          <p>{session.resumo}</p>
        </div>
      )}

      {/* ERRO */}
      {error && (
        <div className="text-red-400 mt-4">
          {error}
        </div>
      )}

    </div>
  )
}