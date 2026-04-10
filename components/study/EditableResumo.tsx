"use client"

import * as React from "react"
import { Bold, Italic, Underline, Highlighter, PenTool, Eraser, Save, MousePointer2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Props {
  content: string
  sessionId: string | null
  loading?: boolean
}

function parseLegacyMarkdown(md: string) {
  let isList = false
  const lines = md.split('\n')
  let result = ''

  for (let line of lines) {
    if (line.startsWith('## ')) {
      if (isList) { result += '</ul>'; isList = false; }
      result += `<h2 class="ed-h2">${line.replace('## ', '')}</h2>`
    } else if (line.startsWith('### ')) {
      if (isList) { result += '</ul>'; isList = false; }
      result += `<h3 class="ed-h3">${line.replace('### ', '')}</h3>`
    } else if (line.startsWith('**') && line.endsWith('**') && !line.includes(' ')) {
      if (isList) { result += '</ul>'; isList = false; }
      result += `<p class="ed-p"><strong>${line.replace(/\*\*/g, '')}</strong></p>`
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      if (!isList) { result += '<ul class="ed-ul">'; isList = true; }
      let replaced = line.replace(/^[-•] /, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      result += `<li class="ed-li">${replaced}</li>`
    } else if (line.trim() === '') {
      if (isList) { result += '</ul>'; isList = false; }
      result += `<div class="ed-br"><br/></div>`
    } else {
      if (isList) { result += '</ul>'; isList = false; }
      let replaced = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      result += `<p class="ed-p">${replaced}</p>`
    }
  }
  if (isList) result += '</ul>'
  return result
}

export function EditableResumo({ content, sessionId, loading }: Props) {
  const [canvasData, setCanvasData] = React.useState('')
  
  const [mode, setMode] = React.useState<'text' | 'pen' | 'eraser'>('text')
  const [penColor, setPenColor] = React.useState('#ef4444') // default red pen
  const [penSize, setPenSize] = React.useState(2)
  const [hlColor, setHlColor] = React.useState('#ffff00')
  const [foreColor, setForeColor] = React.useState('#e8eaf6')
  const [fontSizeItem, setFontSizeItem] = React.useState('3')

  // Saved selection for highlight (selection is lost when clicking toolbar)
  const savedSelectionRef = React.useRef<Range | null>(null)
  
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState('')
  
  const editorRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  const isDrawing = React.useRef(false)
  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null)

  // INIT — set innerHTML directly only once to avoid re-renders wiping editor content
  React.useEffect(() => {
    if (loading || !editorRef.current) return
    try {
      const data = JSON.parse(content)
      if (data.type === 'rich') {
        editorRef.current.innerHTML = data.html
        setCanvasData(data.canvas)
        return
      }
    } catch {
      // fallback
      editorRef.current.innerHTML = parseLegacyMarkdown(content)
    }
  }, [content, loading])

  // RESIZE CANVAS & LOAD IMAGE
  React.useEffect(() => {
    if (loading || !canvasRef.current || !containerRef.current) return
    
    const canvas = canvasRef.current
    const container = containerRef.current
    
    // We set canvas to match container scroll height
    const ro = new ResizeObserver(() => {
      if (!canvas || !container) return
      const w = container.clientWidth
      const h = Math.max(container.clientHeight, container.scrollHeight)
      
      // Only resize if changed to avoid clearing
      if (canvas.width !== w || canvas.height !== h) {
        // Save old content
        const oldImage = new Image()
        oldImage.src = canvas.toDataURL()
        
        canvas.width = w
        canvas.height = h
        
        oldImage.onload = () => {
          const ctx = canvas.getContext('2d')
          if (ctx) {
             ctx.drawImage(oldImage, 0, 0)
             ctxRef.current = ctx
          }
        }
      }
    })
    
    ro.observe(container)
    
    return () => ro.disconnect()
  }, [loading])

  // INITIAL DRAW ON CANVAS IF WE HAVE SAVED DATA
  React.useEffect(() => {
    if (canvasData && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const img = new Image()
        img.src = canvasData
        img.onload = () => {
          ctx.clearRect(0,0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
        }
      }
    }
  }, [canvasData])

  // EVENT HANDLERS DRAWING
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'text' || !canvasRef.current) return
    e.preventDefault() // prevent scrolling
    isDrawing.current = true
    const { offsetX, offsetY } = getCoordinates(e, canvasRef.current)
    const ctx = canvasRef.current.getContext('2d')
    if (ctx) {
      ctxRef.current = ctx
      ctx.beginPath()
      ctx.moveTo(offsetX, offsetY)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = mode === 'eraser' ? '#000000' : penColor
      ctx.lineWidth = mode === 'eraser' ? penSize * 4 : penSize
      if (mode === 'eraser') {
         ctx.globalCompositeOperation = 'destination-out'
      } else {
         ctx.globalCompositeOperation = 'source-over'
      }
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || mode === 'text' || !ctxRef.current || !canvasRef.current) return
    e.preventDefault()
    const { offsetX, offsetY } = getCoordinates(e, canvasRef.current)
    ctxRef.current.lineTo(offsetX, offsetY)
    ctxRef.current.stroke()
  }

  const endDrawing = () => {
    if (mode === 'text') return
    isDrawing.current = false
    ctxRef.current?.closePath()
  }

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    if ('touches' in e) {
      const touch = e.touches[0]
      const rect = canvas.getBoundingClientRect()
      return {
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top
      }
    }
    return {
      offsetX: e.nativeEvent.offsetX,
      offsetY: e.nativeEvent.offsetY
    }
  }

  // Save current text selection before focus is lost (e.g., clicking toolbar)
  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  // Restore a previously saved selection
  const restoreSelection = () => {
    if (!savedSelectionRef.current) return
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(savedSelectionRef.current)
    }
  }

  // TEXT FORMATTING
  const formatText = (cmd: string, val?: string) => {
    restoreSelection()
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
  }

  // SAVE — reads innerHTML directly from the DOM (never from state)
  const handleSave = async () => {
    if (!sessionId || !editorRef.current || !canvasRef.current) return
    setIsSaving(true)
    setErrorMsg('')
    try {
      const currentHtml = editorRef.current.innerHTML
      const currentCanvas = canvasRef.current.toDataURL()
      
      const payload = JSON.stringify({
        type: 'rich',
        html: currentHtml,
        canvas: currentCanvas
      })

      const supabase = createClient()
      const { error } = await supabase.from('study_sessions').update({ content: payload }).eq('id', sessionId)
      if (error) throw error
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--muted)', fontSize: '13px' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
        Carregando conteúdo formatado...
      </div>
    )
  }

  const toggleMode = (m: 'text' | 'pen' | 'eraser') => {
    if (mode === m && m !== 'text') setMode('text')
    else setMode(m)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '800px', margin: '0 auto', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      
      {/* TOOLBAR */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        
        {/* Type Tool */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--surface2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button onClick={() => toggleMode('text')} style={{ padding: '6px', borderRadius: '6px', background: mode === 'text' ? 'var(--border)' : 'transparent', color: mode === 'text' ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', border: 'none' }} title="Modo Texto/Ponteiro">
            <MousePointer2 size={16} />
          </button>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 4px' }} />

        {/* Text Formats (only works when text mode) */}
        <div style={{ display: 'flex', gap: '2px', opacity: mode === 'text' ? 1 : 0.5, pointerEvents: mode === 'text' ? 'auto' : 'none' }}>
          <button onMouseDown={e => e.preventDefault()} onClick={() => formatText('bold')} style={{ padding: '6px', borderRadius: '6px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', border: 'none' }} title="Negrito"><Bold size={16}/></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => formatText('italic')} style={{ padding: '6px', borderRadius: '6px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', border: 'none' }} title="Itálico"><Italic size={16}/></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => formatText('underline')} style={{ padding: '6px', borderRadius: '6px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', border: 'none' }} title="Sublinhado"><Underline size={16}/></button>
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
            {/* onMouseDown saves selection BEFORE the click moves focus away */}
            <button
              onMouseDown={e => { e.preventDefault(); saveSelection() }}
              onClick={() => formatText('backColor', hlColor)}
              style={{ padding: '6px', borderRadius: '6px', background: 'transparent', color: hlColor, cursor: 'pointer', border: 'none' }}
              title="Realçar"
            >
              <Highlighter size={16}/>
            </button>
            {/* Changing color just updates state — selection is saved on mousedown of the button */}
            <input
              type="color"
              value={hlColor}
              onMouseDown={saveSelection}
              onChange={e => setHlColor(e.target.value)}
              style={{ width: '20px', height: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', margin: '0 4px' }}
              title="Escolher cor de realce"
            />
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

          {/* Cor da Fonte */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: foreColor, padding: '0 4px' }} title="Cor do texto">A</span>
            <input
              type="color"
              value={foreColor}
              onMouseDown={saveSelection}
              onChange={e => {
                setForeColor(e.target.value)
                formatText('foreColor', e.target.value)
              }}
              style={{ width: '20px', height: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', margin: '0 4px' }}
              title="Alterar cor da fonte"
            />
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

          {/* Tamanho da Fonte */}
          <select 
            value={fontSizeItem}
            onMouseDown={saveSelection}
            onChange={e => {
               setFontSizeItem(e.target.value)
               formatText('fontSize', e.target.value)
            }}
            style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', padding: '2px 4px', outline: 'none', cursor: 'pointer' }}
            title="Tamanho da fonte"
          >
            <option value="1">Tamanho 1</option>
            <option value="2">Tamanho 2</option>
            <option value="3">Tamanho 3</option>
            <option value="4">Tamanho 4</option>
            <option value="5">Tamanho 5</option>
            <option value="6">Tamanho 6</option>
            <option value="7">Tamanho 7</option>
          </select>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 4px' }} />

        {/* Pen / Eraser Tools */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button onClick={() => toggleMode('pen')} style={{ padding: '6px', borderRadius: '6px', background: mode === 'pen' ? 'var(--border)' : 'transparent', color: penColor, cursor: 'pointer', border: 'none' }} title="Caneta Livre">
              <PenTool size={16} />
            </button>
            <input type="color" value={penColor} onChange={e => {setPenColor(e.target.value); setMode('pen')}} style={{ width: '20px', height: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} />
          </div>

          {/* Pen Size */}
          <select value={penSize} onChange={e => setPenSize(Number(e.target.value))} style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', padding: '0 4px', outline: 'none', cursor: 'pointer', opacity: mode === 'pen' || mode === 'eraser' ? 1 : 0.5 }}>
            <option value={2}>P</option>
            <option value={4}>M</option>
            <option value={8}>G</option>
          </select>

          <button onClick={() => toggleMode('eraser')} style={{ padding: '6px', borderRadius: '6px', background: mode === 'eraser' ? 'var(--border)' : 'transparent', color: mode === 'eraser' ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', border: 'none' }} title="Borracha">
            <Eraser size={16}/>
          </button>
        </div>

        {/* Save */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
           {errorMsg && <span style={{ color: 'var(--red)', fontSize: '11px' }}>{errorMsg}</span>}
           <button onClick={handleSave} disabled={isSaving || !sessionId} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: isSaving || !sessionId ? 'default' : 'pointer', opacity: isSaving || !sessionId ? 0.6 : 1 }}>
             <Save size={14} />
             {isSaving ? 'Salvando...' : 'Salvar Resumo'}
           </button>
        </div>
      </div>

      {/* EDITOR AREA */}
      <div 
        ref={containerRef}
        style={{ position: 'relative', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
      >
        <div 
          ref={editorRef}
          contentEditable={mode === 'text'}
          suppressContentEditableWarning
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          style={{
            minHeight: '100%',
            outline: 'none',
            color: 'var(--text)',
            fontSize: '14px',
            lineHeight: 1.8,
            cursor: mode === 'text' ? 'text' : 'default',
            userSelect: mode === 'text' ? 'auto' : 'none',
            padding: '24px 32px'
          }}
        />

        {/* CANVAS OVERLAY */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: mode === 'text' ? 'none' : 'auto',
            touchAction: mode === 'text' ? 'auto' : 'none',
            cursor: mode === 'pen' ? 'crosshair' : mode === 'eraser' ? 'cell' : 'default'
          }}
        />
      </div>

    </div>
  )
}

