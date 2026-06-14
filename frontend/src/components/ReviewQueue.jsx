import React, { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, Loader2, RefreshCw, Eye, Flame, Inbox } from 'lucide-react'
import { getReviewQueue, reviewSample } from '../utils/api'

const LABEL_COLOR = {
  'AI-Generated': 'var(--fake)',
  'Real': 'var(--real)',
  'Uncertain': 'var(--accent2)',
}

function ImageCard({ sample, adminToken, onDecision }) {
  const [view, setView]       = useState('original') // 'original' | 'gradcam'
  const [loading, setLoading] = useState(null)        // 'approve' | 'reject' | null
  const [decided, setDecided] = useState(false)

  const decide = async (approved) => {
    setLoading(approved ? 'approve' : 'reject')
    try {
      await reviewSample(sample.id, approved, adminToken)
      setDecided(true)
      onDecision(sample.id, approved)
    } catch (e) {
      console.error('Review failed', e)
    } finally {
      setLoading(null)
    }
  }

  if (decided) return null  // remove card from queue after decision

  const imgSrc = view === 'original' && sample.image_b64
    ? `data:image/jpeg;base64,${sample.image_b64}`
    : view === 'gradcam' && sample.gradcam_b64
    ? `data:image/png;base64,${sample.gradcam_b64}`
    : null

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '12px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Image view toggle */}
      <div style={{
        display: 'flex', gap: '0.25rem', padding: '0.5rem 0.75rem',
        borderBottom: '1px solid var(--border)', background: 'var(--bg)',
      }}>
        {[['original', Eye, 'Original'], ['gradcam', Flame, 'GradCAM']].map(([id, Icon, label]) => (
          <button key={id} onClick={() => setView(id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.25rem 0.6rem', borderRadius: '5px', border: 'none',
            cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.75rem',
            background: view === id ? 'var(--border)' : 'transparent',
            color: view === id ? 'var(--text)' : 'var(--muted)',
          }}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* Image */}
      <div style={{ aspectRatio: '1', background: 'var(--bg)', overflow: 'hidden' }}>
        {imgSrc
          ? <img src={imgSrc} alt={sample.filename} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
              No image
            </div>
        }
      </div>

      {/* Meta */}
      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flexGrow: 1 }}>
        <p style={{
          fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {sample.filename}
        </p>

        {/* Prediction → correction */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
          <span style={{ color: LABEL_COLOR[sample.label] || 'var(--muted)', fontWeight: 600 }}>
            {sample.label}
          </span>
          <span style={{ color: 'var(--muted)' }}>→</span>
          <span style={{ color: LABEL_COLOR[sample.correct_label] || 'var(--text)', fontWeight: 600 }}>
            {sample.correct_label || '?'}
          </span>
        </div>

        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          conf: {sample.confidence.toFixed(1)}%
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => decide(true)}
          disabled={!!loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
            padding: '0.6rem', border: 'none', borderRight: '1px solid var(--border)',
            background: 'transparent', cursor: loading ? 'not-allowed' : 'pointer',
            color: 'var(--real)', fontFamily: 'var(--font)', fontSize: '0.8rem', fontWeight: 600,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {loading === 'approve'
            ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
            : <CheckCircle2 size={13} />}
          Approve
        </button>
        <button
          onClick={() => decide(false)}
          disabled={!!loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
            padding: '0.6rem', border: 'none',
            background: 'transparent', cursor: loading ? 'not-allowed' : 'pointer',
            color: 'var(--fake)', fontFamily: 'var(--font)', fontSize: '0.8rem', fontWeight: 600,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {loading === 'reject'
            ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
            : <XCircle size={13} />}
          Reject
        </button>
      </div>
    </div>
  )
}

export default function ReviewQueue({ adminToken, onApprovedCountChange }) {
  const [queue, setQueue]     = useState([])
  const [loading, setLoading] = useState(true)
  const [approved, setApproved] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getReviewQueue(adminToken)
      setQueue(data)
    } catch (e) {
      console.error('Failed to load review queue', e)
    } finally {
      setLoading(false)
    }
  }, [adminToken])

  useEffect(() => { load() }, [load])

  const handleDecision = (id, wasApproved) => {
    setQueue(q => q.filter(s => s.id !== id))
    if (wasApproved) {
      const next = approved + 1
      setApproved(next)
      onApprovedCountChange?.(next)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', padding: '2rem 0' }}>
        <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '0.85rem' }}>Loading review queue...</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Review Queue</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
            Inspect each flagged image before retraining
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {queue.length > 0 && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: '0.72rem',
              color: 'var(--accent2)', background: 'rgba(167,139,250,0.08)',
              border: '1px solid rgba(167,139,250,0.2)',
              padding: '0.2rem 0.5rem', borderRadius: '4px',
            }}>
              {queue.length} to review
            </span>
          )}
          <button onClick={load} style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
            padding: '0.3rem 0.6rem', cursor: 'pointer',
            color: 'var(--muted)', fontFamily: 'var(--font)', fontSize: '0.78rem',
          }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Empty state */}
      {queue.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '0.75rem', padding: '3rem 0', color: 'var(--muted)',
        }}>
          <Inbox size={32} style={{ opacity: 0.4 }} />
          <p style={{ fontSize: '0.85rem' }}>No images pending review.</p>
          {approved > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--real)' }}>
              {approved} sample{approved !== 1 ? 's' : ''} approved this session — ready to retrain.
            </p>
          )}
        </div>
      )}

      {/* Grid */}
      {queue.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
        }}>
          {queue.map(sample => (
            <ImageCard
              key={sample.id}
              sample={sample}
              adminToken={adminToken}
              onDecision={handleDecision}
            />
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
