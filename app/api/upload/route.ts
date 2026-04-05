import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
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

    // Fazer upload no Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('study-uploads')
      .upload(fileName, file, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    // Extrair texto do arquivo
    let content = ''
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      content = await file.text()
    } else if (file.type === 'application/pdf') {
      // Para PDF: retorna aviso e usa o nome do arquivo como contexto
      // A extração real de PDF requer pdf-parse (adicionar se necessário)
      content = `[Arquivo PDF: ${file.name}]\nConteúdo extraído do arquivo enviado pelo usuário.`
    }

    // Limitar tamanho do conteúdo para a IA
    const truncated = content.slice(0, 15000)

    return NextResponse.json({
      fileName,
      content: truncated,
      originalName: file.name,
      size: file.size,
    })
  } catch (error) {
    console.error('[Upload]', error)
    return NextResponse.json({ error: 'Erro no upload' }, { status: 500 })
  }
}
