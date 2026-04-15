type ExtractionMode = 'plain' | 'pdf-parse' | 'ocr'

export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
] as const

export async function extractTextWithOcrSpace(file: File) {
  const apiKey = process.env.OCR_SPACE_API_KEY

  if (!apiKey) {
    throw new Error('OCR_SPACE_API_KEY nao configurada')
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
    headers: { apikey: apiKey },
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
    ? data.ParsedResults.map((item: { ParsedText?: string }) => item.ParsedText ?? '').join('\n')
    : ''

  return text.trim()
}

export async function extractTextFromFile(file: File): Promise<{ content: string; extractionMode: ExtractionMode }> {
  if (!SUPPORTED_DOCUMENT_TYPES.includes(file.type as (typeof SUPPORTED_DOCUMENT_TYPES)[number])) {
    throw new Error('Tipo nao suportado. Use PDF, TXT ou MD')
  }

  let content = ''
  let extractionMode: ExtractionMode = 'plain'

  if (file.type === 'text/plain' || file.type === 'text/markdown') {
    content = await file.text()
    extractionMode = 'plain'
  } else if (file.type === 'application/pdf') {
    try {
      const pdfParseModule = await import('pdf-parse')
      const pdfParse = (pdfParseModule as { default?: unknown }).default ?? pdfParseModule
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await (pdfParse as (input: Buffer) => Promise<{ text?: string }>)(buffer)
      content = (parsed?.text ?? '').trim()
      extractionMode = 'pdf-parse'
    } catch (error) {
      console.warn('[document-text] pdf-parse falhou, tentando OCR:', (error as Error).message)
    }

    if (!content.trim()) {
      content = await extractTextWithOcrSpace(file)
      extractionMode = 'ocr'
    }
  }

  const clean = content.replace(/\u0000/g, '').trim()

  if (!clean) {
    throw new Error('O arquivo esta vazio ou sem texto legivel.')
  }

  return { content: clean, extractionMode }
}
