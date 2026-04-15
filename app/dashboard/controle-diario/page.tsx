import { AlertTriangle, CheckCircle2, Clock3, FileText, Target } from 'lucide-react'

const rows = [
  {
    date: 'Seg, 13/04',
    subject: 'Direito Constitucional',
    status: 'Parcial',
    planned: 90,
    effective: 65,
    pages: 20,
    score: 67,
    questions: '12/18',
    tags: ['Resumo pendente'],
  },
  {
    date: 'Seg, 13/04',
    subject: 'Contabilidade',
    status: 'Concluido',
    planned: 120,
    effective: 110,
    pages: 18,
    score: 88,
    questions: '22/25',
    tags: ['Bloco concluido'],
  },
  {
    date: 'Ter, 14/04',
    subject: 'TI',
    status: 'Parcial',
    planned: 90,
    effective: 60,
    pages: 14,
    score: null,
    questions: 'Sem pratica',
    tags: ['Questoes pendentes'],
  },
  {
    date: 'Qua, 15/04',
    subject: 'Direito Administrativo',
    status: 'Concluido',
    planned: 90,
    effective: 95,
    pages: 13,
    score: 93,
    questions: '13/14',
    tags: ['Bloco concluido'],
  },
]

const fields = [
  'Data',
  'Meta cumprida',
  'Disciplina',
  'CH planejada',
  'CH efetiva',
  'Descricao da meta',
  'Material',
  'Onde comecei',
  'Terminei',
  'Questoes resolvidas',
  'Acertei',
]

const rules = [
  'Status da meta: manter a logica s/n, agora como chip visual.',
  'Desempenho: abaixo de 70% vermelho, 70-80% laranja, acima de 80% verde.',
  'Leitura: continuar com a regra Terminei - Onde comecei para calcular paginas lidas.',
  'Pendencias: detectar automaticamente frases como Falta fazer questoes e Falta fazer o resumo.',
  'Meta de horas: comparar horas planejadas e efetivas por dia e por semana.',
]

function formatMin(value: number) {
  if (value < 60) return `${value}min`
  const h = Math.floor(value / 60)
  const m = value % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

function scoreTone(score: number | null) {
  if (score === null) return { label: 'Sem questoes', color: '#6b7194', bg: 'rgba(107,113,148,.12)' }
  if (score < 70) return { label: `${score}%`, color: '#ef4444', bg: 'rgba(239,68,68,.12)' }
  if (score <= 80) return { label: `${score}%`, color: '#f59e0b', bg: 'rgba(245,158,11,.12)' }
  return { label: `${score}%`, color: '#10b981', bg: 'rgba(16,185,129,.12)' }
}

export default function ControleDiarioPage() {
  const planned = rows.reduce((sum, row) => sum + row.planned, 0)
  const effective = rows.reduce((sum, row) => sum + row.effective, 0)
  const pending = rows.flatMap(row => row.tags).filter(tag => tag !== 'Bloco concluido').length
  const completed = rows.filter(row => row.status === 'Concluido').length

  return (
    <div className="page">
      <section className="hero">
        <div>
          <div className="eyebrow">Projeto da nova secao</div>
          <h1>Painel de Controle Diario de Estudos</h1>
          <p>
            Esta tela transforma a planilha em uma secao do site onde o aluno registra o estudo
            do dia, acompanha horas, desempenho e pendencias, e recebe sinais visuais baseados nas
            condicionais que ja existem no arquivo.
          </p>
        </div>
        <div className="heroBox">
          <div className="heroLabel">Proposta central</div>
          <strong>Lancar rapido, ler automatico, agir cedo.</strong>
          <span>
            O aluno deixa de preencher uma planilha fria e passa a usar um painel que mostra o que
            foi estudado, o que falta fechar e onde o rendimento caiu.
          </span>
        </div>
      </section>

      <section className="metrics">
        <div className="card">
          <div className="cardTop"><span>Horas planejadas</span><Clock3 size={18} /></div>
          <strong style={{ color: '#6c63ff' }}>{formatMin(planned)}</strong>
          <small>Meta da semana</small>
        </div>
        <div className="card">
          <div className="cardTop"><span>Horas efetivas</span><Target size={18} /></div>
          <strong style={{ color: '#10b981' }}>{formatMin(effective)}</strong>
          <small>Tempo realmente estudado</small>
        </div>
        <div className="card">
          <div className="cardTop"><span>Metas concluidas</span><CheckCircle2 size={18} /></div>
          <strong style={{ color: '#f59e0b' }}>{completed}/{rows.length}</strong>
          <small>Leitura do campo meta cumprida</small>
        </div>
        <div className="card">
          <div className="cardTop"><span>Pendencias</span><AlertTriangle size={18} /></div>
          <strong style={{ color: '#ef4444' }}>{pending}</strong>
          <small>Resumo e questoes pendentes</small>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panelKicker">Estrutura da experiencia</div>
          <h2>Blocos da nova secao</h2>
          <div className="steps">
            <div><b>1.</b> Lancamento rapido com data, disciplina, tempo, paginas e questoes.</div>
            <div><b>2.</b> Leitura automatica do texto do estudo para detectar pendencias e conclusao.</div>
            <div><b>3.</b> Cards de resumo semanal com horas, metas e taxa de acerto.</div>
            <div><b>4.</b> Tabela diaria para consulta e retomada do estudo.</div>
          </div>

          <div className="mockup">
            <div className="mockTitle">Campos do formulario</div>
            <div className="fieldGrid">
              {fields.map(field => <span key={field}>{field}</span>)}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelKicker">Condicionais mantidas</div>
          <h2>Regras da planilha que devem permanecer</h2>
          <div className="ruleList">
            {rules.map(rule => (
              <div key={rule} className="rule">
                <div className="dot" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panelKicker">Preview da interface</div>
        <h2>Tabela do painel diario</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Disciplina</th>
                <th>Status</th>
                <th>Horas</th>
                <th>Paginas</th>
                <th>Questoes</th>
                <th>Desempenho</th>
                <th>Pendencias</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const tone = scoreTone(row.score)
                return (
                  <tr key={`${row.date}-${row.subject}`}>
                    <td>{row.date}</td>
                    <td>{row.subject}</td>
                    <td>
                      <span
                        className="pill"
                        style={{
                          color: row.status === 'Concluido' ? '#10b981' : '#f59e0b',
                          background: row.status === 'Concluido' ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)',
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>{formatMin(row.effective)} de {formatMin(row.planned)}</td>
                    <td>{row.pages} pag.</td>
                    <td>{row.questions}</td>
                    <td><span className="pill" style={{ color: tone.color, background: tone.bg }}>{tone.label}</span></td>
                    <td className="tags">
                      {row.tags.map(tag => (
                        <span
                          key={tag}
                          className="tag"
                          style={{
                            color: tag === 'Bloco concluido' ? '#10b981' : '#f59e0b',
                            background: tag === 'Bloco concluido' ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="notes">
          <div className="note">
            <FileText size={16} />
            <span>O texto do estudo passa a alimentar alertas e tags automaticas.</span>
          </div>
          <div className="note">
            <Target size={16} />
            <span>A secao ja esta preparada para virar MVP funcional com banco e filtros reais.</span>
          </div>
        </div>
      </section>

      <style jsx>{`
        .page {
          min-height: 100%;
          padding: 28px 32px 40px;
          background:
            radial-gradient(circle at top left, rgba(108,99,255,.12), transparent 25%),
            radial-gradient(circle at top right, rgba(0,212,170,.08), transparent 20%),
            var(--bg, #0a0c12);
          color: var(--text, #e8eaf6);
        }
        .hero, .grid {
          display: grid;
          grid-template-columns: 1.35fr .85fr;
          gap: 18px;
          margin-bottom: 18px;
        }
        .eyebrow, .panelKicker {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--accent, #6c63ff);
          margin-bottom: 8px;
          font-weight: 700;
        }
        h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.02;
          letter-spacing: -.03em;
        }
        h2 {
          margin: 0 0 14px;
          font-size: 20px;
        }
        p {
          margin: 12px 0 0;
          max-width: 760px;
          color: var(--muted, #6b7194);
          line-height: 1.6;
          font-size: 14px;
        }
        .heroBox, .panel, .card {
          border: 1px solid var(--border, #1f2640);
          background: linear-gradient(180deg, rgba(17,20,32,.95), rgba(12,15,24,.96));
          border-radius: 22px;
          box-shadow: 0 20px 45px rgba(0,0,0,.22);
        }
        .heroBox, .card, .panel {
          padding: 18px;
        }
        .heroBox {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .heroLabel, .cardTop span, table th, .mockTitle {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: var(--muted, #6b7194);
          font-weight: 700;
        }
        .heroBox strong, .card strong {
          font-size: 24px;
          line-height: 1.1;
        }
        .heroBox span, .card small, .rule span, .note span {
          color: var(--muted, #6b7194);
          line-height: 1.55;
          font-size: 13px;
        }
        .metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }
        .cardTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          color: var(--accent, #6c63ff);
        }
        .steps, .ruleList {
          display: grid;
          gap: 10px;
        }
        .steps div, .rule, .note {
          display: flex;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.06);
          font-size: 13px;
          line-height: 1.55;
        }
        .mockup {
          margin-top: 16px;
          padding: 16px;
          border-radius: 18px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.06);
        }
        .fieldGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }
        .fieldGrid span {
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(8,10,16,.65);
          border: 1px solid rgba(255,255,255,.06);
          font-size: 13px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--accent, #6c63ff);
          margin-top: 5px;
          flex-shrink: 0;
        }
        .tableWrap {
          overflow-x: auto;
        }
        table {
          width: 100%;
          min-width: 840px;
          border-collapse: collapse;
        }
        th {
          text-align: left;
          padding: 0 0 12px;
        }
        td {
          padding: 14px 0;
          border-top: 1px solid rgba(255,255,255,.06);
          font-size: 13px;
          vertical-align: top;
        }
        .pill, .tag {
          display: inline-flex;
          align-items: center;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .tags, .notes {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .notes {
          margin-top: 16px;
        }
        @media (max-width: 1080px) {
          .hero, .grid, .metrics {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 720px) {
          .page {
            padding: 20px 16px 28px;
          }
          h1 {
            font-size: 28px;
          }
          .fieldGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
