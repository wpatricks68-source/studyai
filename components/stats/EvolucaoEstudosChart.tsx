'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts'

interface EvolutionData {
  disciplina: string
  pendente: number
  andamento: number
  concluido: number
}

interface Props {
  data: EvolutionData[]
}

// Computes percentage label for the concluido bar
function pctLabel(value: number, entry: Record<string, unknown>) {
  const total = ((entry.concluido as number) ?? 0) + ((entry.andamento as number) ?? 0) + ((entry.pendente as number) ?? 0)
  if (!total || !value) return ''
  const pct = Math.round((value / total) * 100)
  return pct > 0 ? `${pct}%` : ''
}

// Custom label that renders pct inside the concluido bar
function ConcluídoLabel(props: {
  x?: number; y?: number; width?: number; height?: number; value?: number;
  concluido?: number; andamento?: number; pendente?: number
}) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props
  const total = value  // value here is the concluido count; total must be computed separately
  if (!value || width < 20) return null
  return (
    <text
      x={x + width / 2}
      y={y + height / 2 + 4}
      textAnchor="middle"
      fill="#fff"
      fontSize={10}
      fontWeight={700}
      opacity={0.9}
      style={{ pointerEvents: 'none' }}
    >
      {value}
    </text>
  )
}

export default function EvolucaoEstudosChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        height: '220px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: 'var(--muted)',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span style={{ fontSize: 13 }}>Nenhum dado do edital disponível ainda.</span>
      </div>
    )
  }

  // Annotate data with percentage for tooltip
  const enriched = data.map(d => {
    const total = d.concluido + d.andamento + d.pendente
    const pct = total > 0 ? Math.round((d.concluido / total) * 100) : 0
    return { ...d, _pct: pct, _total: total }
  })

  const itemHeight = 28
  const chartHeight = Math.max(260, enriched.length * (itemHeight + 16) + 60)

  return (
    <div style={{ width: '100%', height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={enriched}
          layout="vertical"
          margin={{ top: 4, right: 52, left: 8, bottom: 8 }}
          barCategoryGap="30%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            vertical={true}
            stroke="rgba(255,255,255,0.04)"
          />
          <XAxis type="number" hide />
          <YAxis
            dataKey="disciplina"
            type="category"
            width={130}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11, fontWeight: 500 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{
              background: '#0d1020',
              border: '1px solid rgba(116,97,255,0.2)',
              borderRadius: '10px',
              fontSize: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
              padding: '10px 14px',
            }}
            formatter={(value: number, name: string, props) => {
              const total = (props.payload as { _total: number })?._total ?? 1
              const pct = Math.round((value / total) * 100)
              return [`${value} (${pct}%)`, name]
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '16px', fontSize: '11px', fontWeight: 500 }}
          />
          <Bar dataKey="concluido" name="Concluído" stackId="a" fill="#10d494" radius={[0, 0, 0, 0]} barSize={itemHeight}>
            <LabelList
              content={(props) => {
                const { x, y, width, height, value } = props as {
                  x: number; y: number; width: number; height: number; value: number;
                  index: number
                }
                if (!value || (width as number) < 28) return null
                const total = enriched.find(d => d.concluido === value)?._total ?? value
                const pct = Math.round((value / total) * 100)
                return (
                  <text
                    x={(x as number) + (width as number) / 2}
                    y={(y as number) + (height as number) / 2 + 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={10}
                    fontWeight={700}
                    style={{ pointerEvents: 'none' }}
                  >
                    {pct}%
                  </text>
                )
              }}
            />
          </Bar>
          <Bar dataKey="andamento" name="Em Andamento" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} barSize={itemHeight} />
          <Bar dataKey="pendente" name="Pendente" stackId="a" fill="rgba(255,255,255,0.06)" radius={[0, 4, 4, 0]} barSize={itemHeight} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
