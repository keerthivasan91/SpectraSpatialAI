import React, { useState, useEffect, useRef } from 'react'
import { Play, CheckCircle2, XCircle, Loader2, Clock, LogOut, ChevronDown, ChevronUp } from 'lucide-react'
import { getReviewCounts, startRetrain, getRetrainStatus, getRetrainHistory } from '../utils/api'
import ReviewQueue from './ReviewQueue'

const StatusIcon = ({ status }) => {
  const p = { size: 15 }
  if (status === 'running') return <Loader2 {...p} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--accent)' }} />
  if (status === 'done')    return <CheckCircle2 {...p} style={{ color: 'var(--real)' }} />
  if (status === 'failed')  return <XCircle {...p} style={{ color: 'var(--fake)' }} />
  return <Clock {...p} style={{ color: 'var(--muted)' }} />
}

const statusColor = {
  running: 'var(--accent)', done: 'var(--real)',
  failed: 'var(--fake)', pending: 'var(--muted)',
}

export default function RetrainPanel({ adminToken, onLogout }) {
  const [counts, setCounts]       = useState({ pending_review: 0, approved: 0, rejected: 0, used_in_retrain: 0 })
  const [history, setHistory]     = useState([])
  const [activeJob, setActiveJob] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const pollRef = useRef(null)

  // Clear current polling instance securely
  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const startPolling = (jobId) => {
    // Prevent overlapping timers if one is already running
    if (pollRef.current) return;
    if (!jobId || jobId === "undefined") {
      console.warn("RetrainPanel: Blocked polling attempt due to an undefined Job ID configuration.");
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await getRetrainStatus(jobId, adminToken)
        setActiveJob(data)
        
        // Terminate the background tracking loop if the job completes or fails
        if (data.status === 'done' || data.status === 'failed') {
          stopPolling()
          loadCounts()
          loadHistory()
        }
      } catch (err) {
        console.error("Status polling failed:", err)
      }
    }, 2000)
  }

  const loadCounts = async () => {
    try {
      const { data } = await getReviewCounts(adminToken)
      setCounts(data)
    } catch {}
  }

  const loadHistory = async () => {
    try {
      const { data } = await getRetrainHistory(adminToken)
      setHistory(data)
      
      // Look for a job that was already running when the component mounted
      const running = data.find(j => j.status === 'running' || j.status === 'pending')
      if (running) {
        setActiveJob(running)
        startPolling(running.job_id)
      }
    } catch {}
  }

  // Handle initialization and authentication token updates
  useEffect(() => {
    if (!adminToken) {
      stopPolling()
      return
    }
    loadCounts()
    loadHistory()

    // Clean up timers on component unmount or logout
    return () => stopPolling()
  }, [adminToken])

  const handleStart = async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await startRetrain(adminToken)
      setActiveJob(data)
      startPolling(data.job_id)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to start retraining.')
    } finally {
      setLoading(false)
    }
  }

  const card = (extra = {}) => ({
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '1rem', ...extra,
  })

  const Stat = ({ value, label, color = 'var(--text)' }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '1.4rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.15rem' }}>{label}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Admin banner */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.5rem 1rem', borderRadius: '8px',
        background: 'rgba(110,231,247,0.06)', border: '1px solid rgba(110,231,247,0.15)',
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--accent)' }}>
          ADMIN SESSION ACTIVE
        </span>
        <button onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          background: 'none', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.8rem',
        }}>
          <LogOut size={13} /> Sign out
        </button>
      </div>

      {/* Stats dashboard */}
      <div style={{
        ...card(),
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0', textAlign: 'center',
      }}>
        {[
          [counts.pending_review, 'Pending Review',   'var(--accent2)'],
          [counts.approved,       'Approved',          'var(--real)'],
          [counts.rejected,       'Rejected',          'var(--fake)'],
          [counts.used_in_retrain,'Used in Retrain',  'var(--muted)'],
        ].map(([val, label, color], i) => (
          <div key={label} style={{
            padding: '1rem 0.5rem',
            borderRight: i < 3 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ textDecoration: 'none' }}>
              <Stat value={val} label={label} color={color} />
            </div>
          </div>
        ))}
      </div>

      {/* —— Step 1: Review Queue —— */}
      <div style={card()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)',
            color: '#0a0c10', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
          }}>1</div>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Review Flagged Images</span>
        </div>
        <ReviewQueue
          adminToken={adminToken}
          onApprovedCountChange={(n) => setCounts(c => ({ ...c, approved: c.approved + 1 }))}
        />
      </div>

      {/* —— Step 2: Retrain —— */}
      <div style={card()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: counts.approved > 0 ? 'var(--accent)' : 'var(--border)',
            color: counts.approved > 0 ? '#0a0c10' : 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
          }}>2</div>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Retrain Model</span>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
          {counts.approved === 0
            ? 'Approve at least one image above before retraining.'
            : `${counts.approved} approved sample${counts.approved !== 1 ? 's' : ''} ready. Fine-tunes the last 2 backbone blocks.`}
        </p>

        <button
          onClick={handleStart}
          disabled={loading || counts.approved === 0 || activeJob?.status === 'running'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            width: '100%', padding: '0.7rem', borderRadius: '8px', border: 'none',
            background: counts.approved > 0 ? 'var(--accent)' : 'var(--border)',
            color: counts.approved > 0 ? '#0a0c10' : 'var(--muted)',
            fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.9rem',
            cursor: counts.approved === 0 ? 'not-allowed' : 'pointer',
            opacity: activeJob?.status === 'running' ? 0.6 : 1,
          }}
        >
          {loading
            ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
            : <Play size={16} />}
          {loading
            ? 'Starting...'
            : activeJob?.status === 'running'
            ? 'Training in progress...'
            : `Retrain on ${counts.approved} sample${counts.approved !== 1 ? 's' : ''}`}
        </button>

        {error && <p style={{ color: 'var(--fake)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
      </div>

      {/* Active job log */}
      {activeJob && (
        <div style={card({ borderColor: (statusColor[activeJob.status] || 'var(--border)') + '55' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <StatusIcon status={activeJob.status} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Job #{activeJob.job_id}</span>
            <span style={{
              marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '0.7rem',
              color: statusColor[activeJob.status], textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {activeJob.status}
            </span>
          </div>
          {activeJob.log && (
            <pre style={{
              fontFamily: 'var(--mono)', fontSize: '0.74rem', color: 'var(--muted)',
              background: 'var(--bg)', padding: '0.75rem', borderRadius: '6px',
              overflowX: 'auto', whiteSpace: 'pre-wrap',
            }}>
              {activeJob.log}
            </pre>
          )}
          {activeJob.accuracy_after != null && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--real)' }}>
              Final accuracy: {activeJob.accuracy_after.toFixed(1)}%
            </p>
          )}
        </div>
      )}

      {/* Job history (collapsible) */}
      {history.length > 0 && (
        <div style={card()}>
          <button
            onClick={() => setShowHistory(h => !h)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font)', color: 'var(--text)',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Job History ({history.length})</span>
            {showHistory ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />}
          </button>

          {showHistory && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {history.map(job => (
                <div key={job.job_id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.45rem 0.75rem', borderRadius: '6px', background: 'var(--bg)',
                  fontSize: '0.82rem',
                }}>
                  <StatusIcon status={job.status} />
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)' }}>#{job.job_id}</span>
                  <span style={{ color: 'var(--text)' }}>{job.num_samples} samples</span>
                  {job.accuracy_after != null && (
                    <span style={{ marginLeft: 'auto', color: 'var(--real)', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>
                      {job.accuracy_after.toFixed(1)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}