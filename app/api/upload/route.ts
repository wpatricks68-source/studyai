import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const maxSize = 10 * 1024 * 1024 // 10 MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 10 MB' }, { status: 400 })
    }

    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo não suportado. Use PDF, TXT ou MD' }, { status: 400 })
    }

    // ── Extrai texto do arquivo ───────────────────────────────
    let content = ''

    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      content = await file.text()
    } else if (file.type === 'application/pdf') {
      try {
        const pdfParse = (await import('pdf-parse')).default
        const buffer = Buffer.from(await file.arrayBuffer())
        const parsed = await pdfParse(buffer)
        content = parsed.text
      } catch (pdfErr) {
        console.error('[upload] pdf-parse error:', (pdfErr as Error).message)
        return NextResponse.json(
          { error: 'Não foi possível extrair o texto do PDF. Tente converter para TXT.' },
          { status: 422 }
        )
      }
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'O arquivo está vazio ou sem texto legível.' }, { status: 422 })
    }

    // ── Salva no Storage (best-effort, não bloqueia a resposta) ──
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
    })

  } catch (error) {
    console.error('[upload]', error)
    return NextResponse.json({ error: 'Erro inesperado no upload.' }, { status: 500 })
  }
}
