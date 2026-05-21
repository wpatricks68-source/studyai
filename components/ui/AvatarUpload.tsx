'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AvatarUploadProps = {
  userId: string
  currentAvatarUrl?: string | null
  onUploadComplete?: (publicUrl: string) => void
}

export default function AvatarUpload({
  userId,
  currentAvatarUrl = null,
  onUploadComplete,
}: AvatarUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.currentTarget.files?.[0]
    if (!nextFile) return

    if (!nextFile.type.startsWith('image/')) {
      setStatus('Escolha um arquivo de imagem válido.')
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    const nextPreviewUrl = URL.createObjectURL(nextFile)
    setFile(nextFile)
    setPreview(nextPreviewUrl)
    setPreviewUrl(nextPreviewUrl)
    setStatus(null)
  }

  async function handleUpload() {
    if (!file) {
      setStatus('Selecione uma imagem antes de enviar.')
      return
    }

    setUploading(true)
    setStatus('Enviando avatar...')

    const supabase = createClient()
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filePath = `user-profiles/${userId}-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      setStatus(`Erro ao enviar avatar: ${uploadError.message}`)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    if (!data?.publicUrl) {
      setUploading(false)
      setStatus('Erro ao obter URL pública do avatar.')
      return
    }

    setUploading(false)
    setStatus('Avatar enviado com sucesso!')
    onUploadComplete?.(data.publicUrl)
  }

  return (
    <div className="student-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(108,99,255,.14)', display: 'grid', placeItems: 'center' }}>
          <span style={{ fontSize: '18px', color: 'var(--accent)' }}>A</span>
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Atualizar avatar</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Envie uma imagem para personalizar seu perfil.</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '22px', overflow: 'hidden', background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)' }}>
          {preview ? (
            <img src={preview} alt="Preview do avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>
              Sem avatar
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label className="student-button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', background: 'var(--accent)', color: '#fff' }}>
            Selecionar imagem
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
          <button
            className="student-button"
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            style={{ background: 'var(--accent2)', color: '#03231b', width: 'max-content' }}
          >
            {uploading ? 'Enviando...' : 'Enviar avatar'}
          </button>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {file ? file.name : 'JPEG, PNG ou WEBP. Até 5 MB.'}
          </div>
        </div>
      </div>

      {status && <div style={{ fontSize: '13px', color: 'var(--text)', padding: '10px 0' }}>{status}</div>}
    </div>
  )
}
