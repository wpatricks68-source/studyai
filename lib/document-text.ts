type ExtractionMode = 'plain' | 'pdfjs' | 'pdf-parse' | 'ocr'

type PdfjsWorkerGlobal = typeof globalThis & {
  pdfjsWorker?: {
    WorkerMessageHandler?: unknown
  }
}

export class DocumentExtractionError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
    this.name = 'DocumentExtractionError'
  }
}

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

    if (/maximum page limit of 3/i.test(message)) {
      throw new DocumentExtractionError(
        'O PDF parece ser escaneado/imagem e o OCR configurado aceita no maximo 3 paginas. Envie um PDF com texto selecionavel, um arquivo menor de ate 3 paginas ou divida o documento.'
      )
    }

    throw new DocumentExtractionError(message)
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

async function ensurePdfWorker() {
  const target = globalThis as PdfjsWorkerGlobal

  if (target.pdfjsWorker?.WorkerMessageHandler) {
    return
  }

  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs') as {
    WorkerMessageHandler?: unknown
  }

  if (worker.WorkerMessageHandler) {
    target.pdfjsWorker = {
      ...target.pdfjsWorker,
      WorkerMessageHandler: worker.WorkerMessageHandler,
    }
  }
}

async function extractTextWithPdfjs(file: File) {
  await ensurePdfPolyfills()
  await ensurePdfWorker()
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data, verbosity: pdfjs.VerbosityLevel.ERRORS })
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
  let pdfExtractionError = ''
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
      const message = (error as Error).message
      pdfExtractionError = message
      console.warn('[document-text] pdfjs falhou, tentando pdf-parse:', message)
      try {
        await ensurePdfPolyfills()
        await ensurePdfWorker()
        const { PDFParse } = await import('pdf-parse')
        const data = new Uint8Array(await file.arrayBuffer())
        const parser = new PDFParse({ data })
        const parsed = await parser.getText().finally(() => parser.destroy())
        content = (parsed?.text ?? '').trim()
        extractionMode = 'pdf-parse'
      } catch (innerError) {
        const message = (innerError as Error).message
        pdfExtractionError = `${pdfExtractionError} ${message}`.trim()
        console.warn('[document-text] pdf-parse falhou, tentando OCR:', message)
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
        if (lastError instanceof DocumentExtractionError) {
          if (
            /maximo 3 paginas|maximum page limit of 3/i.test(lastError.message) &&
            /fake worker|pdf\.worker|worker failed|worker/i.test(pdfExtractionError)
          ) {
            throw new DocumentExtractionError(
              'Nao foi possivel extrair texto do PDF no servidor porque o worker do leitor de PDF nao foi carregado. Publique a correcao mais recente e tente novamente.'
            )
          }

          throw lastError
        }

        throw new DocumentExtractionError(
          (lastError as Error)?.message || 'Nao foi possivel extrair texto do PDF via OCR.'
        )
      }
    }
  }

  const clean = content.replace(/\u0000/g, '').trim()

  if (!clean) {
    throw new DocumentExtractionError('O arquivo esta vazio ou sem texto legivel.')
  }

  return { content: clean, extractionMode }
}
