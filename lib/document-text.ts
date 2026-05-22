type ExtractionMode = 'plain' | 'pdfjs' | 'pdf-parse' | 'ocr'

export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
] as const

const SUPPORTED_DOCUMENT_EXTENSIONS = ['.pdf', '.txt', '.md', '.csv'] as const

export function isSupportedDocumentFile(file: File) {
  const lowerName = file.name.toLowerCase()
  return (
    SUPPORTED_DOCUMENT_TYPES.includes(file.type as (typeof SUPPORTED_DOCUMENT_TYPES)[number]) ||
    SUPPORTED_DOCUMENT_EXTENSIONS.some(ext => lowerName.endsWith(ext))
  )
}

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

async function ensurePdfPolyfills() {
  // Try to provide minimal polyfills expected by pdfjs / pdf-parse in Node.
  // This is intentionally loaded via eval so bundlers do not statically include
  // @napi-rs/canvas and warn about missing platform-specific binaries.
  try {
    const moduleName = '@napi-rs/canvas'
    // eslint-disable-next-line no-eval
    const canvas = (await eval("import(moduleName)")) as any
    if (typeof globalThis.ImageData === 'undefined' && canvas?.ImageData) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      globalThis.ImageData = canvas.ImageData
    }
    if (typeof globalThis.Path2D === 'undefined' && canvas?.Path2D) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      globalThis.Path2D = canvas.Path2D
    }
  } catch (err) {
    // ignore - missing optional dependency or unsupported deployment platform
  }

  // Minimal DOMMatrix polyfill to silence pdfjs warnings when not available
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.DOMMatrix = class DOMMatrix {}
  }
}

async function extractTextWithPdfjs(file: File) {
  await ensurePdfPolyfills()
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const buffer = Buffer.from(await file.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data: buffer, verbosity: pdfjs.VerbosityLevel.ERRORS })
  const doc = await loadingTask.promise

  let text = ''
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent({ includeMarkedContent: false, disableNormalization: false })
    const textItems = content.items.filter(
      (item): item is any =>
        typeof item === 'object' &&
        item !== null &&
        'str' in item &&
        typeof (item as any).str === 'string'
    )
    const pageText = textItems.map((item: any) => item.str).join(' ')

    text += pageText.trim() ? `${pageText.trim()}

` : ''
    page.cleanup()
  }

  await doc.destroy()
  return text.trim()
}

export async function extractTextFromFile(file: File): Promise<{ content: string; extractionMode: ExtractionMode }> {
  if (!isSupportedDocumentFile(file)) {
    throw new Error('Tipo nao suportado. Use PDF, TXT, MD ou CSV')
  }

  let content = ''
  let extractionMode: ExtractionMode = 'plain'
  const lowerName = file.name.toLowerCase()

  if (
    file.type === 'text/plain' ||
    file.type === 'text/markdown' ||
    file.type === 'text/csv' ||
    file.type === 'application/csv' ||
    file.type === 'application/vnd.ms-excel' ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.csv')
  ) {
    content = await file.text()
    extractionMode = 'plain'
  } else if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
    try {
      const pdfText = await extractTextWithPdfjs(file)
      if (pdfText.trim()) {
        content = pdfText.trim()
        extractionMode = 'pdfjs'
      } else {
        throw new Error('PDF vazio ou sem texto extraido pelo pdfjs.')
      }
    } catch (error) {
      console.warn('[document-text] pdfjs falhou, tentando pdf-parse:', (error as Error).message)
      try {
        await ensurePdfPolyfills()
        const pdfParseModule = await import('pdf-parse')
        const pdfParse = (pdfParseModule as { default?: unknown }).default ?? pdfParseModule
        const buffer = Buffer.from(await file.arrayBuffer())
        const parsed = await (pdfParse as (input: Buffer) => Promise<{ text?: string }>)(buffer)
        content = (parsed?.text ?? '').trim()
        extractionMode = 'pdf-parse'
      } catch (innerError) {
        console.warn('[document-text] pdf-parse falhou, tentando OCR:', (innerError as Error).message)
      }
    }

    if (!content.trim()) {
      // Retry OCR up to 3 times with exponential backoff for transient HTTP errors
      const maxAttempts = 3
      let attempt = 0
      let lastError: unknown = null

      while (attempt < maxAttempts) {
        try {
          content = await extractTextWithOcrSpace(file)
          extractionMode = 'ocr'
          break
        } catch (err) {
          lastError = err
          attempt += 1
          const waitMs = 500 * Math.pow(2, attempt - 1)
          // eslint-disable-next-line no-await-in-loop
          await new Promise(r => setTimeout(r, waitMs))
        }
      }

      if (!content.trim() && lastError) {
        throw lastError as Error
      }
    }
  }

  const clean = content.replace(/\u0000/g, '').trim()

  if (!clean) {
    throw new Error('O arquivo esta vazio ou sem texto legivel.')
  }

  return { content: clean, extractionMode }
}
