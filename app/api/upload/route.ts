import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromFile, SUPPORTED_DOCUMENT_TYPES } from '@/lib/document-text'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo nao enviado' }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Maximo: 10 MB' },
        { status: 400 }
      )
    }

    if (!SUPPORTED_DOCUMENT_TYPES.includes(file.type as (typeof SUPPORTED_DOCUMENT_TYPES)[number])) {
      return NextResponse.json(
        { error: 'Tipo nao suportado. Use PDF, TXT ou MD' },
        { status: 400 }
      )
    }

    const { content, extractionMode } = await extractTextFromFile(file)
    const fileName = `${user.id}/${Date.now()}-${file.name}`

    supabase.storage
      .from('study-uploads')
      .upload(fileName, file, { contentType: file.type, upsert: false })
      .catch(error => console.warn('[upload] storage ignorado:', (error as Error)?.message))

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
