'use client'

import { useEffect, useMemo, useState } from 'react'
import { HelpCircle, Plus, Sparkles, Upload } from 'lucide-react'

export interface InteractiveQuestion {
  id?: string
  question: string
  tipo?: 'cv' | 'mc' | string
  options?: string[] | null
  correct?: number | null
  gabarito?: string | null
  explanation?: string | null
  banca?: string | null
}

interface Props {
  questions: InteractiveQuestion[]
  loading?: boolean
  title?: string
  maxWidth?: number | string
  showEmptyState?: boolean
  onOpenManual?: () => void
  onGenerateAI?: () => void
  onImport?: () => void
  onDelete?: (id: string) => void
  onEdit?: (q: InteractiveQuestion) => void
}

function getCorrectAnswer(question: InteractiveQuestion) {
  if (question.tipo === 'cv') return question.gabarito ?? ''
  return typeof question.correct === 'number' ? question.correct : null
}

function getAnswerLabel(question: InteractiveQuestion) {
  if (question.tipo === 'cv') {
    if (question.gabarito === 'C') return 'CERTO'
    if (question.gabarito === 'E') return 'ERRADO'
    return question.gabarito || '-'
  }

  if (typeof question.correct === 'number') {
    const letter = ['A', 'B', 'C', 'D', 'E'][question.correct] ?? String(question.correct + 1)
    const option = question.options?.[question.correct]
    return option ? `${letter} - ${option}` : letter
  }

  return question.gabarito || '-'
}

function isAnswerCorrect(question: InteractiveQuestion, answer: string | number | undefined) {
  if (answer === undefined) return false
  return answer === getCorrectAnswer(question)
}

export default function InteractiveQuestionsPanel({
  questions,
  loading = false,
  title = 'Questões do tema',
  maxWidth = 820,
  showEmptyState,
  onOpenManual,
  onGenerateAI,
  onImport,
  onDelete,
  onEdit,
}: Props) {
  const [answers, setAnswers] = useState<Record<number, string | number>>({})
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [showGabarito, setShowGabarito] = useState(false)

  const questionKey = useMemo(
    () => questions.map((q, index) => q.id ?? `${index}:${q.question}`).join('|'),
    [questions]
  )

  useEffect(() => {
    setAnswers({})
    setRevealed({})
    setShowGabarito(false)
  }, [questionKey])

  const shouldShowEmpty = showEmptyState ?? Boolean(onOpenManual || onGenerateAI)

  if (loading) {
    return (
      <div className="iq-shell" style={{ maxWidth, width: '100%' }}>
        <PanelStyles />
        <div className="iq-loading">
          <div className="iq-spinner" />
          Gerando questões...
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    if (!shouldShowEmpty) return null

    return (
      <div className="iq-shell" style={{ maxWidth, width: '100%' }}>
        <PanelStyles />
        <div className="iq-empty">
          <div className="iq-empty-icon">
            <HelpCircle size={22} />
          </div>
          <div className="iq-empty-title">Nenhuma questão gerada ainda</div>
          <div className="iq-empty-copy">Crie questões para praticar sem sair do resumo.</div>
          <div className="iq-empty-actions">
            {onImport && (
              <button className="iq-secondary-action" onClick={onImport}>
                <Upload size={15} /> Importar
              </button>
            )}
            {onGenerateAI && (
              <button className="iq-primary-action" onClick={onGenerateAI}>
                <Sparkles size={15} /> Gerar com IA
              </button>
            )}
            {onOpenManual && (
              <button className="iq-secondary-action" onClick={onOpenManual}>
                <Plus size={15} /> Criar manualmente
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const totalRespondidas = Object.keys(revealed).length
  const totalCorretas = Object.entries(revealed).filter(([index, isRevealed]) => {
    if (!isRevealed) return false
    return isAnswerCorrect(questions[Number(index)], answers[Number(index)])
  }).length
  const pct = totalRespondidas > 0 ? Math.round((totalCorretas / totalRespondidas) * 100) : 0
  const pctColor = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <section className="iq-shell" style={{ maxWidth, width: '100%' }}>
      <PanelStyles />

      <div className="iq-header">
        <div>
          <div className="iq-title">{title}</div>
          <div className="iq-count">
            {questions.length} quest{questions.length !== 1 ? 'ões' : 'ão'}
          </div>
        </div>

        <div className="iq-header-actions iq-screen-control">
          {onImport && (
            <button className="iq-secondary-action iq-compact-action" onClick={onImport} title="Importar de arquivo TXT/CSV">
              <Upload size={14} /> Importar
            </button>
          )}
          {onOpenManual && (
            <button className="iq-secondary-action iq-compact-action" onClick={onOpenManual}>
              <Plus size={14} /> Nova questão
            </button>
          )}
          {onGenerateAI && (
            <button className="iq-primary-action iq-compact-action" onClick={onGenerateAI}>
              <Sparkles size={14} /> Gerar
            </button>
          )}
        </div>
      </div>

      {totalRespondidas > 0 && (
        <div className="iq-score iq-screen-control">
          <div className="iq-score-value" style={{ color: pctColor }}>{pct}%</div>
          <div>
            <div className="iq-score-main">{totalCorretas} de {totalRespondidas} corretas</div>
            <div className="iq-score-sub">
              {questions.length - totalRespondidas > 0
                ? `${questions.length - totalRespondidas} ainda não respondida(s)`
                : 'Todas respondidas'}
            </div>
          </div>
        </div>
      )}

      <div className="iq-list">
        {questions.map((question, index) => {
          const answered = answers[index] !== undefined
          const isRevealed = Boolean(revealed[index])
          const isCorrect = isAnswerCorrect(question, answers[index])

          return (
            <article key={question.id ?? index} className="iq-card">
              <div className="iq-card-header">
                <div className="iq-card-meta">
                  <span className="iq-number">Q{index + 1}</span>
                  <span className={question.tipo === 'cv' ? 'iq-badge iq-badge-cv' : 'iq-badge iq-badge-mc'}>
                    {question.tipo === 'cv' ? 'Certo / Errado' : 'Múltipla escolha'}
                  </span>
                </div>
                {question.banca && <span className="iq-bank">{question.banca}</span>}
                {(onEdit || onDelete) && (
                  <div className="iq-card-actions">
                    {onEdit && (
                      <button className="iq-action-btn" onClick={() => onEdit(question)} title="Editar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                    )}
                    {onDelete && (
                      <button 
                        className="iq-action-btn" 
                        onClick={() => { if(question.id && confirm('Excluir esta questão?')) onDelete(question.id) }} 
                        title="Excluir"
                        style={{ opacity: question.id ? 1 : 0.4, cursor: question.id ? 'pointer' : 'not-allowed' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="iq-question-text">{question.question}</div>

              {question.tipo === 'cv' ? (
                <div className="iq-cv-options">
                  {(['C', 'E'] as const).map(option => {
                    const selected = answers[index] === option
                    const optionIsRight = option === question.gabarito
                    const stateClass = isRevealed
                      ? optionIsRight
                        ? 'iq-option-correct'
                        : selected
                          ? 'iq-option-wrong'
                          : ''
                      : selected
                        ? 'iq-option-selected'
                        : ''

                    return (
                      <button
                        key={option}
                        className={`iq-option-button ${stateClass}`}
                        onClick={() => !isRevealed && setAnswers(prev => ({ ...prev, [index]: option }))}
                        disabled={isRevealed}
                      >
                        {option === 'C' ? 'Certo' : 'Errado'}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="iq-mc-options">
                  {(question.options ?? []).map((option, optionIndex) => {
                    const selected = answers[index] === optionIndex
                    const optionIsRight = optionIndex === question.correct
                    const stateClass = isRevealed
                      ? optionIsRight
                        ? 'iq-option-correct'
                        : selected
                          ? 'iq-option-wrong'
                          : ''
                      : selected
                        ? 'iq-option-selected'
                        : ''

                    return (
                      <button
                        key={optionIndex}
                        className={`iq-option-button iq-mc-option ${stateClass}`}
                        onClick={() => !isRevealed && setAnswers(prev => ({ ...prev, [index]: optionIndex }))}
                        disabled={isRevealed}
                      >
                        <span className="iq-option-letter">{['A', 'B', 'C', 'D', 'E'][optionIndex]}</span>
                        <span>{option}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {!isRevealed ? (
                <button
                  className="iq-confirm iq-screen-control"
                  onClick={() => answered && setRevealed(prev => ({ ...prev, [index]: true }))}
                  disabled={!answered}
                >
                  Confirmar resposta
                </button>
              ) : (
                <div className={isCorrect ? 'iq-feedback iq-feedback-correct iq-screen-control' : 'iq-feedback iq-feedback-wrong iq-screen-control'}>
                  <div className="iq-feedback-title">
                    {isCorrect ? 'Resposta correta' : 'Resposta incorreta'}
                  </div>
                  <div className="iq-feedback-copy">
                    {question.explanation || `Gabarito: ${getAnswerLabel(question)}`}
                  </div>
                </div>
              )}

              <div className="iq-print-answer">
                <strong>Gabarito:</strong> {getAnswerLabel(question)}
                {question.explanation && <div><strong>Explicação:</strong> {question.explanation}</div>}
              </div>
            </article>
          )
        })}
      </div>

      <div className="iq-gabarito iq-screen-control">
        <button className="iq-gabarito-toggle" onClick={() => setShowGabarito(value => !value)}>
          {showGabarito ? 'Ocultar gabarito' : 'Ver gabarito'}
        </button>

        {showGabarito && (
          <div className="iq-gabarito-list">
            {questions.map((question, index) => (
              <div key={question.id ?? index} className="iq-gabarito-row">
                <span className="iq-gabarito-index">Q{index + 1}</span>
                <span className="iq-gabarito-answer">{getAnswerLabel(question)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function PanelStyles() {
  return (
    <style>{`
      .iq-shell {
        color: var(--text,#e8eaf6);
      }

      .iq-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }

      .iq-title {
        color: var(--text,#e8eaf6);
        font-size: 18px;
        font-weight: 700;
        line-height: 1.25;
      }

      .iq-count,
      .iq-score-sub,
      .iq-empty-copy {
        color: var(--muted,#6b7194);
        font-size: 12px;
        line-height: 1.5;
      }

      .iq-header-actions,
      .iq-empty-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .iq-primary-action,
      .iq-secondary-action,
      .iq-confirm,
      .iq-gabarito-toggle {
        border-radius: 8px;
        min-height: 36px;
        padding: 8px 13px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
      }

      .iq-primary-action {
        border: none;
        background: var(--accent,#6c63ff);
        color: #fff;
      }

      .iq-secondary-action {
        border: 1px solid var(--border,#1f2640);
        background: var(--surface2,#181d2e);
        color: var(--text,#e8eaf6);
      }

      .iq-score,
      .iq-empty,
      .iq-card,
      .iq-gabarito-list {
        background: var(--surface,#111420);
        border: 1px solid var(--border,#1f2640);
        border-radius: 12px;
      }

      .iq-score {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 14px 18px;
        margin-bottom: 18px;
      }

      .iq-score-value {
        min-width: 56px;
        font-size: 28px;
        font-weight: 800;
        line-height: 1;
      }

      .iq-score-main {
        color: var(--text,#e8eaf6);
        font-size: 13px;
        font-weight: 700;
      }

      .iq-list {
        display: grid;
        gap: 14px;
      }

      .iq-card {
        padding: 18px;
        break-inside: avoid;
      }

      .iq-card-header,
      .iq-card-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .iq-card-header {
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .iq-card-actions {
        display: flex;
        gap: 4px;
      }

      .iq-action-btn {
        background: var(--surface2,#181d2e);
        border: 1px solid var(--border,#1f2640);
        border-radius: 6px;
        width: 26px;
        height: 26px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--muted,#6b7194);
        transition: all .15s;
      }

      .iq-action-btn:hover {
        color: var(--accent,#6c63ff);
      }

      .iq-action-btn:last-child:hover {
        color: #ef4444;
      }

      .iq-number {
        color: var(--accent,#6c63ff);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .iq-badge {
        border-radius: 5px;
        padding: 3px 7px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .iq-badge-cv {
        background: rgba(245,158,11,.12);
        color: #f59e0b;
      }

      .iq-badge-mc {
        background: rgba(108,99,255,.12);
        color: var(--accent,#6c63ff);
      }

      .iq-bank {
        color: var(--muted,#6b7194);
        font-size: 10px;
      }

      .iq-question-text {
        color: var(--text,#e8eaf6);
        font-size: 14px;
        font-weight: 600;
        line-height: 1.7;
        margin-bottom: 16px;
        overflow-wrap: anywhere;
      }

      .iq-cv-options {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .iq-mc-options {
        display: grid;
        gap: 8px;
      }

      .iq-option-button {
        width: 100%;
        border: 1px solid var(--border,#1f2640);
        border-radius: 8px;
        background: var(--surface2,#181d2e);
        color: var(--text,#e8eaf6);
        min-height: 42px;
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all .15s;
        text-align: left;
      }

      .iq-option-button:disabled {
        cursor: default;
      }

      .iq-mc-option {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-weight: 500;
        line-height: 1.55;
      }

      .iq-option-letter {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid currentColor;
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
      }

      .iq-option-selected {
        border-color: var(--accent,#6c63ff);
        background: rgba(108,99,255,.12);
        color: var(--accent,#6c63ff);
      }

      .iq-option-correct {
        border-color: #10b981;
        background: rgba(16,185,129,.12);
        color: #34d399;
      }

      .iq-option-wrong {
        border-color: #ef4444;
        background: rgba(239,68,68,.10);
        color: #f87171;
      }

      .iq-confirm {
        width: 100%;
        border: none;
        background: var(--accent,#6c63ff);
        color: #fff;
        margin-top: 14px;
      }

      .iq-confirm:disabled {
        background: var(--surface2,#181d2e);
        color: var(--muted,#6b7194);
        cursor: default;
      }

      .iq-feedback {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 8px;
        line-height: 1.65;
      }

      .iq-feedback-correct {
        border: 1px solid rgba(16,185,129,.3);
        background: rgba(16,185,129,.08);
      }

      .iq-feedback-wrong {
        border: 1px solid rgba(239,68,68,.25);
        background: rgba(239,68,68,.08);
      }

      .iq-feedback-title {
        font-size: 12px;
        font-weight: 800;
        margin-bottom: 4px;
      }

      .iq-feedback-correct .iq-feedback-title {
        color: #34d399;
      }

      .iq-feedback-wrong .iq-feedback-title {
        color: #f87171;
      }

      .iq-feedback-copy {
        color: #c8cae6;
        font-size: 12px;
      }

      .iq-gabarito {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid var(--border,#1f2640);
      }

      .iq-gabarito-toggle {
        width: 100%;
        border: 1px solid var(--border,#1f2640);
        background: transparent;
        color: var(--muted,#6b7194);
      }

      .iq-gabarito-list {
        margin-top: 12px;
        overflow: hidden;
      }

      .iq-gabarito-row {
        display: grid;
        grid-template-columns: 54px minmax(0, 1fr);
        gap: 10px;
        padding: 11px 14px;
        border-bottom: 1px solid var(--border,#1f2640);
        font-size: 13px;
      }

      .iq-gabarito-row:last-child {
        border-bottom: none;
      }

      .iq-gabarito-index {
        color: var(--accent,#6c63ff);
        font-weight: 800;
      }

      .iq-gabarito-answer {
        color: var(--text,#e8eaf6);
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .iq-empty {
        padding: 34px 20px;
        text-align: center;
      }

      .iq-empty-icon {
        width: 42px;
        height: 42px;
        margin: 0 auto 12px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--accent,#6c63ff);
        background: rgba(108,99,255,.12);
      }

      .iq-empty-title {
        color: var(--text,#e8eaf6);
        font-size: 15px;
        font-weight: 800;
        margin-bottom: 5px;
      }

      .iq-empty-actions {
        justify-content: center;
        margin-top: 18px;
      }

      .iq-loading {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--muted,#6b7194);
        font-size: 13px;
        padding: 18px 0;
      }

      .iq-spinner {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid var(--accent,#6c63ff);
        border-top-color: transparent;
        animation: iq-spin .7s linear infinite;
      }

      .iq-print-answer {
        display: none;
      }

      @keyframes iq-spin {
        to { transform: rotate(360deg); }
      }

      @media (max-width: 720px) {
        .iq-header {
          align-items: stretch;
          flex-direction: column;
        }

        .iq-header-actions,
        .iq-empty-actions {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
        }

        .iq-compact-action,
        .iq-empty-actions button {
          width: 100%;
        }

        .iq-score {
          align-items: flex-start;
          padding: 13px 14px;
        }

        .iq-card {
          padding: 14px;
        }

        .iq-card-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .iq-question-text {
          font-size: 13px;
          line-height: 1.65;
        }

        .iq-cv-options {
          grid-template-columns: 1fr;
        }

        .iq-gabarito-row {
          grid-template-columns: 44px minmax(0, 1fr);
          padding: 10px 12px;
        }
      }

      @media print {
        .iq-screen-control {
          display: none !important;
        }

        .iq-shell,
        .iq-card,
        .iq-question-text,
        .iq-card * {
          color: #111 !important;
        }

        .iq-card {
          background: #fff !important;
          border-color: #d7dbe7 !important;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .iq-option-button {
          background: #fff !important;
          border-color: #d7dbe7 !important;
          color: #111 !important;
        }

        .iq-print-answer {
          display: block !important;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px dashed #ccd2e1;
          font-size: 12px;
          line-height: 1.55;
          color: #111 !important;
        }
      }
    `}</style>
  )
}
