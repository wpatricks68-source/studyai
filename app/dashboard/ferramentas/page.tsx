'use client'

import { useState, useEffect, useRef } from 'react'

type Tool = 'pomodoro' | 'stopwatch' | 'timer'

export default function FerramentasPage() {
  const [tool, setTool] = useState<Tool>('pomodoro')

  return (
    <div style={{ padding: '28px 32px', flex: 1, overflowY: 'auto' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Ferramentas</h1>
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '28px' }}>Gerencie seu tempo de estudo</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        {(['pomodoro', 'stopwatch', 'timer'] as Tool[]).map(t => (
          <button
            key={t}
            onClick={() => setTool(t)}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--border)',
              background: tool === t ? 'var(--accent)' : 'transparent',
              color: tool === t ? '#fff' : 'var(--muted)',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            {t === 'pomodoro' ? 'Pomodoro' : t === 'stopwatch' ? 'Cronômetro' : 'Temporizador'}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '480px' }}>
        {tool === 'pomodoro' && <PomodoroTool />}
        {tool === 'stopwatch' && <StopwatchTool />}
        {tool === 'timer' && <TimerTool />}
      </div>
    </div>
  )
}

/* ── POMODORO ── */
function PomodoroTool() {
  const FOCUS = 25 * 60
  const BREAK = 5 * 60
  const [time, setTime]       = useState(FOCUS)
  const [running, setRunning] = useState(false)
  const [phase, setPhase]     = useState<'focus' | 'break'>('focus')
  const [session, setSession] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setTime(t => {
          if (t <= 1) {
            clearInterval(ref.current!)
            setRunning(false)
            if (phase === 'focus') {
              setSession(s => s + 1)
              setPhase('break')
              return BREAK
            } else {
              setPhase('focus')
              return FOCUS
            }
          }
          return t - 1
        })
      }, 1000)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running, phase])

  const pct = phase === 'focus' ? ((FOCUS - time) / FOCUS) : ((BREAK - time) / BREAK)
  const r   = 70
  const circ = 2 * Math.PI * r
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  function reset() {
    setRunning(false)
    setTime(phase === 'focus' ? FOCUS : BREAK)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 24px' }}>
        <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--surface2)" strokeWidth="8" />
          <circle cx="80" cy="80" r={r} fill="none"
            stroke={phase === 'focus' ? 'var(--accent)' : 'var(--accent2)'}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{ transition: 'stroke-dashoffset .5s' }}
          />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmt(time)}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
            {phase === 'focus' ? 'Foco' : 'Pausa'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={reset} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: '16px' }}>↺</button>
        <button
          onClick={() => setRunning(r => !r)}
          style={{ width: '48px', height: '48px', borderRadius: '50%', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '18px' }}
        >
          {running ? '⏸' : '▶'}
        </button>
        <button
          onClick={() => { setPhase(p => p === 'focus' ? 'break' : 'focus'); setRunning(false); setTime(phase === 'focus' ? BREAK : FOCUS) }}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: '14px' }}
        >⇄</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: i < session % 4 ? 'var(--accent)' : 'var(--surface2)', border: '1px solid var(--border)' }} />
        ))}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '10px' }}>
        Sessão {session + 1} • {session > 0 ? `${session} concluída${session > 1 ? 's' : ''}` : 'Primeira sessão'}
      </div>
    </div>
  )
}

/* ── CRONÔMETRO ── */
function StopwatchTool() {
  const [ms, setMs]       = useState(0)
  const [running, setRunning] = useState(false)
  const [laps, setLaps]   = useState<number[]>([])
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setMs(m => m + 100), 100)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])

  function fmt(ms: number) {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', fontWeight: 300, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '2px', marginBottom: '24px' }}>
        {fmt(ms)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => { if (running && ms > 0) setLaps(l => [ms, ...l]) }}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer' }}
        >
          Lap
        </button>
        <button
          onClick={() => setRunning(r => !r)}
          style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: running ? 'var(--amber)' : 'var(--accent2)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          {running ? 'Pausar' : 'Iniciar'}
        </button>
        <button
          onClick={() => { setRunning(false); setMs(0); setLaps([]) }}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>
      {laps.length > 0 && (
        <div style={{ maxHeight: '160px', overflowY: 'auto', textAlign: 'left' }}>
          {laps.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)' }}>
              <span>Lap {laps.length - i}</span>
              <span style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmt(l)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── TEMPORIZADOR ── */
function TimerTool() {
  const [minutes, setMinutes] = useState(45)
  const [time, setTime]       = useState(45 * 60)
  const [running, setRunning] = useState(false)
  const [done, setDone]       = useState(false)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setTime(t => {
          if (t <= 1) { clearInterval(ref.current!); setRunning(false); setDone(true); return 0 }
          return t - 1
        })
      }, 1000)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])

  function start() {
    setTime(minutes * 60)
    setDone(false)
    setRunning(true)
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '28px' }}>
        <input
          type="number"
          value={minutes}
          onChange={e => { setMinutes(Number(e.target.value)); setRunning(false); setTime(Number(e.target.value) * 60) }}
          min={1} max={180}
          disabled={running}
          style={{ width: '70px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', color: 'var(--text)', fontSize: '18px', textAlign: 'center', outline: 'none' }}
        />
        <span style={{ fontSize: '14px', color: 'var(--muted)' }}>minutos</span>
      </div>

      <div style={{ fontSize: '52px', fontWeight: 300, color: done ? 'var(--green)' : 'var(--text)', fontVariantNumeric: 'tabular-nums', marginBottom: '24px' }}>
        {done ? 'Tempo!' : fmt(time)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        {!running ? (
          <button onClick={start} style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            Iniciar
          </button>
        ) : (
          <>
            <button onClick={() => setRunning(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer' }}>
              Pausar
            </button>
            <button onClick={() => { setRunning(false); setTime(minutes * 60); setDone(false) }} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--red)', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
