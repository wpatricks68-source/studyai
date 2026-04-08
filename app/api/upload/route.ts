import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function extractTextWithOcrSpace(file: File) {
  const apiKey = process.env.OCR_SPACE_API_KEY

  if (!apiKey) {
    throw new Error('OCR_SPACE_API_KEY não configurada')
  }

  const form = new FormData()
  form.append('file', file)
  form.append('language', 'por')
  form.append('isOverlayRequired', 'false')
  form.append('scale', 'true')
  form.append('OCREngine', '2')
  form.append('filetype', 'PDF')

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      apikey: apiKey,
    },
    body: form,
  })

  if (!res.ok) {
    throw new Error(`OCR HTTP ${res.status}`)
  }

  const data = await res.json()

  if (data.IsErroredOnProcessing) {
    const message =
      data.ErrorMessage?.join?.(' | ') ||
      data.ErrorMessage ||
      'OCR falhou ao processar o PDF'
    throw new Error(message)
  }

  const text = Array.isArray(data.ParsedResults)
    ? data.ParsedResults.map((r: { ParsedText?: string }) => r.ParsedText ?? '').join('\n')
    : ''

  return text.trim()
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo: 10 MB' },
        { status: 400 }
      )
    }

    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo não suportado. Use PDF, TXT ou MD' },
        { status: 400 }
      )
    }

    let content = ''
    let extractionMode: 'plain' | 'pdf-parse' | 'ocr' = 'plain'

    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      content = await file.text()
      extractionMode = 'plain'
    } else if (file.type === 'application/pdf') {
      // 1) tenta extração normal
      try {
        const pdfParseModule = await import('pdf-parse')
        const pdfParse = (pdfParseModule as any).default ?? pdfParseModule
        const buffer = Buffer.from(await file.arrayBuffer())
        const parsed = await pdfParse(buffer)
        content = (parsed?.text ?? '').trim()
        extractionMode = 'pdf-parse'
      } catch (err) {
        console.warn('[upload] pdf-parse falhou, tentando OCR:', (err as Error).message)
      }

      // 2) fallback automático para OCR
      if (!content.trim()) {
        try {
          content = await extractTextWithOcrSpace(file)
          extractionMode = 'ocr'
        } catch (ocrErr) {
          console.error('[upload] OCR falhou:', (ocrErr as Error).message)
          return NextResponse.json(
            {
              error: 'Não foi possível extrair o texto do PDF.',
              detail: (ocrErr as Error).message,
            },
            { status: 422 }
          )
        }
      }
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: 'O arquivo está vazio ou sem texto legível.' },
        { status: 422 }
      )
    }

    const fileName = `${user.id}/${Date.now()}-${file.name}`

    supabase.storage
      .from('study-uploads')
      .upload(fileName, file, { contentType: file.type, upsert: false })
      .catch(e => console.warn('[upload] storage ignorado:', (e as Error)?.message))

    return NextResponse.json({
      fileName,
      content: content.slice(0, 15000),
      originalName: file.name,
      size: file.size,
      extractionMode,
    })
  } catch (error) {
    console.error('[upload]', error)
    return NextResponse.json(
      { error: 'Erro inesperado no upload.' },
      { status: 500 }
    )
  }
}