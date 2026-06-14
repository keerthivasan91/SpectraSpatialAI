import React, { useRef, useState } from 'react'
import { UploadCloud, ImageIcon } from 'lucide-react'

export default function ImageUpload({ onFile, disabled }) {
  const inputRef = useRef()
  const [dragOver, setDragOver] = useState(false)

  const handle = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    onFile(file)
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handle(e.dataTransfer.files[0]) }}
      style={{
        border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '3rem 2rem',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: dragOver ? 'rgba(110,231,247,0.04)' : 'var(--surface)',
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handle(e.target.files[0])}
      />
      <UploadCloud size={36} style={{ color: 'var(--accent)', marginBottom: '0.75rem' }} />
      <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
        Drop an image or click to browse
      </p>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
        PNG, JPG, WEBP supported
      </p>
    </div>
  )
}
