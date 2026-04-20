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
  Cell
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

export default function EvolucaoEstudosChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        Nenhum dado do edital verticalizado disponível.
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="disciplina" 
            type="category" 
            width={120} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{ 
              background: 'var(--surface)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
          <Bar dataKey="concluido" name="Concluído" stackId="a" fill="var(--green)" radius={[0, 0, 0, 0]} barSize={20} />
          <Bar dataKey="andamento" name="Em Andamento" stackId="a" fill="var(--amber)" radius={[0, 0, 0, 0]} barSize={20} />
          <Bar dataKey="pendente" name="Pendente" stackId="a" fill="var(--surface2)" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
