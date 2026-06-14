import React, { useState } from 'react'
import { ThumbsDown, Check, Loader2 } from 'lucide-react'
import { submitFeedback } from '../utils/api'

export default function FeedbackButton({ predictionId, currentLabel }) {
  const [state, setState] = useState('idle') // idle | choosing | loading | done | error
  const [message, setMessage] = useState('')

  const correctLabel = currentLabel === 'AI-Generated' ? 'Real' : 'AI-Generated'

  const handleMark = async () => {
    setState('loading')
    try {
      await submitFeedback(predictionId, correctLabel)
      setMessage(`Marked as ${correctLabel} — added to retraining pool.`)
      setState('done')
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Failed to submit feedback.')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1rem', borderRadius: '8px',
        background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
        color: 'var(--real)', fontSize: '0.85rem',
      }}>
        <Check size={15} />
        {message}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        onClick={handleMark}
        disabled={state === 'loading'}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.6rem 1.1rem', borderRadius: '8px', border: '1px solid var(--border)',
          background: 'var(--surface)', color: 'var(--muted)',
          cursor: state === 'loading' ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font)', fontSize: '0.85rem', fontWeight: 500,
          transition: 'all 0.15s',
        }}
      >
        {state === 'loading'
          ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
          : <ThumbsDown size={15} />}
        {state === 'loading' ? 'Submitting...' : `Wrong — it's ${correctLabel}`}
      </button>
      {state === 'error' && (
        <span style={{ color: 'var(--fake)', fontSize: '0.8rem' }}>{message}</span>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
