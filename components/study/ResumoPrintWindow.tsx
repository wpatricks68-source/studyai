'use client'

import { FileDown, X } from 'lucide-react'

interface PrintableFlashcard {
  id?: string
  front: string
  back: string
}

interface PrintableQuestion {
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
  title: string
  subtitle?: string | null
  resumo: string | null
  flashcards?: PrintableFlashcard[]
  questions?: PrintableQuestion[]
  onClose: () => void
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatInline(value: string) {
  return escapeHtml(value).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

function parseLegacyMarkdown(md: string) {
  let isList = false
  let result = ''

  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      if (isList) { result += '</ul>'; isList = false }
      result += `<h2>${formatInline(line.slice(3))}</h2>`
    } else if (line.startsWith('### ')) {
      if (isList) { result += '</ul>'; isList = false }
      result += `<h3>${formatInline(line.slice(4))}</h3>`
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      if (!isList) { result += '<ul>'; isList = true }
      result += `<li>${formatInline(line.replace(/^[-•] /, ''))}</li>`
    } else if (line.trim() === '') {
      if (isList) { result += '</ul>'; isList = false }
      result += '<div class="resumo-print-break"><br/></div>'
    } else {
      if (isList) { result += '</ul>'; isList = false }
      result += `<p>${formatInline(line)}</p>`
    }
  }

  if (isList) result += '</ul>'
  return result
}

function getResumoHtml(content: string | null) {
  if (!content) return '<p>Conteúdo não disponível.</p>'

  try {
    const data = JSON.parse(content)
    if (data?.type === 'rich' && typeof data.html === 'string') {
      return data.html
    }
  } catch {
    return parseLegacyMarkdown(content)
  }

  return parseLegacyMarkdown(content)
}

function getCanvas(content: string | null) {
  if (!content) return ''

  try {
    const data = JSON.parse(content)
    if (data?.type === 'rich' && typeof data.canvas === 'string') return data.canvas
  } catch {}

  return ''
}

function getQuestionAnswer(question: PrintableQuestion) {
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

export default function ResumoPrintWindow({
  title,
  subtitle,
  resumo,
  flashcards = [],
  questions = [],
  onClose,
}: Props) {
  const canvas = getCanvas(resumo)

  return (
    <div
      id="resumo-print-window"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--bg,#0a0c12)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text,#e8eaf6)',
      }}
    >
      <style>{`
        #resumo-print-window .resumo-print-content h2,
        #resumo-print-window .resumo-print-content .ed-h2 {
          font-size: 18px;
          margin: 24px 0 10px;
          color: var(--text,#e8eaf6);
        }

        #resumo-print-window .resumo-print-content h3,
        #resumo-print-window .resumo-print-content .ed-h3 {
          font-size: 15px;
          margin: 18px 0 8px;
          color: var(--text,#e8eaf6);
        }

        #resumo-print-window .resumo-print-content p,
        #resumo-print-window .resumo-print-content .ed-p {
          margin: 8px 0;
        }

        #resumo-print-window .resumo-print-content ul,
        #resumo-print-window .resumo-print-content .ed-ul {
          margin: 8px 0 12px 22px;
          padding: 0;
        }

        #resumo-print-window .resumo-print-content li,
        #resumo-print-window .resumo-print-content .ed-li {
          margin: 6px 0;
        }

        @media print {
          @page { margin: 18mm; }

          html,
          body {
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          #resumo-print-window,
          #resumo-print-window * {
            visibility: visible !important;
          }

          #resumo-print-window {
            position: absolute !important;
            inset: auto !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            display: block !important;
            overflow: visible !important;
            background: #fff !important;
            color: #111 !important;
          }

          #resumo-print-window .resumo-print-topbar {
            display: none !important;
          }

          #resumo-print-window .resumo-print-scroll {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
          }

          #resumo-print-window .resumo-print-page {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #111 !important;
            padding: 0 !important;
          }

          #resumo-print-window .resumo-print-content,
          #resumo-print-window .resumo-print-content *,
          #resumo-print-window .resumo-print-meta,
          #resumo-print-window .resumo-print-section,
          #resumo-print-window .resumo-print-section * {
            color: #111 !important;
            overflow: visible !important;
          }

          #resumo-print-window .resumo-print-content h2,
          #resumo-print-window .resumo-print-content h3,
          #resumo-print-window .resumo-print-content .ed-h2,
          #resumo-print-window .resumo-print-content .ed-h3,
          #resumo-print-window .resumo-print-section-title {
            color: #1a1a2e !important;
          }

          #resumo-print-window .resumo-print-card,
          #resumo-print-window .resumo-print-question {
            break-inside: avoid;
            page-break-inside: avoid;
            background: #fff !important;
            border-color: #d7dbe7 !important;
          }
        }
      `}</style>

      <div
        className="resumo-print-topbar"
        style={{
          height: '60px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border,#1f2640)',
          background: 'var(--surface,#111420)',
          flexShrink: 0,
          gap: '16px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text,#e8eaf6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '11px', color: 'var(--muted,#6b7194)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '3px' }}>
              {subtitle}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={() => window.print()}
            style={{
              background: 'var(--accent,#6c63ff)',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              height: '32px',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <FileDown size={14} /> Exportar PDF
          </button>

          <button
            onClick={onClose}
            title="Fechar"
            style={{
              background: 'var(--surface2,#181d2e)',
              border: '1px solid var(--border,#1f2640)',
              color: 'var(--text,#e8eaf6)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        className="resumo-print-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '32px 20px', display: 'flex', justifyContent: 'center' }}
      >
        <article
          className="resumo-print-page"
          style={{
            width: '100%',
            maxWidth: '900px',
            background: 'var(--surface,#111420)',
            border: '1px solid var(--border,#1f2640)',
            borderRadius: '10px',
            padding: '34px 42px',
            minHeight: 'calc(100vh - 124px)',
          }}
        >
          <header style={{ marginBottom: '28px', borderBottom: '1px solid var(--border,#1f2640)', paddingBottom: '16px' }}>
            <h1 style={{ margin: 0, color: 'var(--text,#e8eaf6)', fontSize: '24px', lineHeight: 1.25 }}>
              {title}
            </h1>
            <div className="resumo-print-meta" style={{ marginTop: '8px', color: 'var(--muted,#6b7194)', fontSize: '12px' }}>
              {subtitle || 'StudyAI'}
            </div>
          </header>

          <section className="resumo-print-section" style={{ marginBottom: '36px' }}>
            <div className="resumo-print-section-title" style={{ color: 'var(--accent,#6c63ff)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
              Resumo
            </div>
            <div style={{ position: 'relative' }}>
              <div
                className="resumo-print-content"
                style={{ color: 'var(--text,#e8eaf6)', fontSize: '14px', lineHeight: 1.85 }}
                dangerouslySetInnerHTML={{ __html: getResumoHtml(resumo) }}
              />
              {canvas && (
                <img
                  src={canvas}
                  alt="Anotações"
                  style={{ position: 'absolute', inset: '0 auto auto 0', width: '100%', height: 'auto', pointerEvents: 'none' }}
                />
              )}
            </div>
          </section>

          {flashcards.length > 0 && (
            <section className="resumo-print-section" style={{ marginTop: '34px' }}>
              <div className="resumo-print-section-title" style={{ color: 'var(--accent,#6c63ff)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                Flashcards ({flashcards.length})
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {flashcards.map((card, index) => (
                  <div
                    key={card.id ?? index}
                    className="resumo-print-card"
                    style={{ border: '1px solid var(--border,#1f2640)', borderRadius: '8px', padding: '14px 16px', background: 'var(--surface2,#181d2e)' }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--accent,#6c63ff)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                      Card {index + 1}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text,#e8eaf6)', fontWeight: 700, lineHeight: 1.6, marginBottom: '8px' }}>
                      {card.front}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted,#9aa3bd)', lineHeight: 1.65 }}>
                      {card.back}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {questions.length > 0 && (
            <section className="resumo-print-section" style={{ marginTop: '34px' }}>
              <div className="resumo-print-section-title" style={{ color: '#00d4aa', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                Questões ({questions.length})
              </div>
              <div style={{ display: 'grid', gap: '14px' }}>
                {questions.map((question, index) => (
                  <div
                    key={question.id ?? index}
                    className="resumo-print-question"
                    style={{ border: '1px solid var(--border,#1f2640)', borderRadius: '8px', padding: '16px 18px', background: 'var(--surface2,#181d2e)' }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#00d4aa', fontWeight: 800 }}>Q{index + 1}</span>
                      <span style={{ fontSize: '10px', color: 'var(--muted,#9aa3bd)', textTransform: 'uppercase' }}>
                        {question.tipo === 'cv' ? 'Certo / Errado' : 'Múltipla escolha'}
                      </span>
                      {question.banca && (
                        <span style={{ fontSize: '10px', color: 'var(--muted,#9aa3bd)', marginLeft: 'auto' }}>
                          {question.banca}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '14px', color: 'var(--text,#e8eaf6)', fontWeight: 600, lineHeight: 1.65, marginBottom: '12px' }}>
                      {question.question}
                    </div>

                    {question.tipo === 'mc' && question.options && (
                      <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} style={{ display: 'flex', gap: '8px', fontSize: '13px', lineHeight: 1.55, color: 'var(--muted,#9aa3bd)' }}>
                            <strong>{['A', 'B', 'C', 'D', 'E'][optionIndex]})</strong>
                            <span>{option}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ fontSize: '13px', color: '#00d4aa', fontWeight: 700, borderTop: '1px dashed var(--border,#1f2640)', paddingTop: '10px' }}>
                      Gabarito: {getQuestionAnswer(question)}
                    </div>

                    {question.explanation && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted,#9aa3bd)', lineHeight: 1.65 }}>
                        <strong>Explicação:</strong> {question.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </div>
  )
}
