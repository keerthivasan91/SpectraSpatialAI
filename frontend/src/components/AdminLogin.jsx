import React, { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'

export default function AdminLogin({ onSuccess }) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!token.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/retrain/history', {
        headers: { 'X-Admin-Token': token.trim() },
      })
      if (res.status === 403) {
        setError('Invalid admin token.')
      } else if (res.ok) {
        onSuccess(token.trim())
      } else {
        setError(`Unexpected error: ${res.status}`)
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: 360, margin: '6rem auto', padding: '2rem',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <KeyRound size={20} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Admin Access</span>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
        Enter the admin token from your <code style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: '0.8rem' }}>.env</code> file to access retraining controls.
      </p>

      <input
        type="password"
        placeholder="Admin token"
        value={token}
        onChange={e => setToken(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleLogin()}
        style={{
          padding: '0.65rem 0.9rem', borderRadius: '8px',
          border: '1px solid var(--border)', background: 'var(--bg)',
          color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '0.9rem',
          outline: 'none',
        }}
      />

      {error && (
        <span style={{ color: 'var(--fake)', fontSize: '0.82rem' }}>{error}</span>
      )}

      <button
        onClick={handleLogin}
        disabled={loading || !token.trim()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          padding: '0.65rem', borderRadius: '8px', border: 'none',
          background: token.trim() ? 'var(--accent)' : 'var(--border)',
          color: token.trim() ? '#0a0c10' : 'var(--muted)',
          fontWeight: 600, fontFamily: 'var(--font)', fontSize: '0.9rem',
          cursor: token.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
        {loading ? 'Verifying...' : 'Enter Admin Panel'}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
