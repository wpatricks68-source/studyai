'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw, Clock } from 'lucide-react'

export function GlobalTimer() {
  const [seconds, setSeconds] = useState(0)
  const [isActive, setIsActive] = useState(false)

  // Load state from localStorage on mount
  useEffect(() => {
    const savedTime = localStorage.getItem('study_timer_seconds')
    const savedIsActive = localStorage.getItem('study_timer_active')
    const lastTick = localStorage.getItem('study_timer_last_tick')

    if (savedTime) setSeconds(parseInt(savedTime, 10))
    
    if (savedIsActive === 'true') {
      const now = Date.now()
      const diff = lastTick ? Math.floor((now - parseInt(lastTick, 10)) / 1000) : 0
      setSeconds(s => s + diff)
      setIsActive(true)
    }
  }, [])

  // Save state on change
  useEffect(() => {
    localStorage.setItem('study_timer_seconds', seconds.toString())
    localStorage.setItem('study_timer_active', isActive.toString())
    if (isActive) {
      localStorage.setItem('study_timer_last_tick', Date.now().toString())
    }
  }, [seconds, isActive])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isActive])

  const toggleTimer = () => setIsActive(!isActive)
  const resetTimer = () => {
    if (confirm('Zerar contador de tempo?')) {
      setIsActive(false)
      setSeconds(0)
    }
  }

  const formatTime = (s: number) => {
    const hrs = Math.floor(s / 3600)
    const mins = Math.floor((s % 3600) / 60)
    const secs = s % 60
    return `${hrs > 0 ? hrs.toString().padStart(2, '0') + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div style={{
      background: 'rgba(108,99,255,0.08)',
      border: '1px solid rgba(108,99,255,0.15)',
      borderRadius: '12px',
      padding: '12px',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
        <Clock size={12} /> Tempo de Estudo
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: isActive ? 'var(--accent)' : 'var(--text)' }}>
          {formatTime(seconds)}
        </div>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={resetTimer}
            style={{ 
              width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'var(--surface2)', color: 'var(--muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s'
            }}
            title="Resetar"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={toggleTimer}
            style={{ 
              width: '32px', height: '32px', borderRadius: '8px', border: 'none',
              background: isActive ? 'rgba(239,68,68,0.15)' : 'var(--accent)',
              color: isActive ? '#ef4444' : '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s'
            }}
          >
            {isActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        </div>
      </div>
    </div>
  )
}
