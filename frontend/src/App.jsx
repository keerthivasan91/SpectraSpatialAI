import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import ImageUpload from './components/ImageUpload'
import ResultPanel from './components/ResultPanel'
import GradCAMView from './components/GradCAMView'
import FeedbackButton from './components/FeedbackButton'
import RetrainPanel from './components/RetrainPanel'
import AdminLogin from './components/AdminLogin'
import Loader from './components/Loader'
import { predictImage } from './utils/api'
import { RotateCcw, KeyRound } from 'lucide-react'

export default function App() {
  const [tab, setTab]           = useState('Detect')
  const [status, setStatus]     = useState('idle')
  const [result, setResult]     = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Admin state
  const [adminToken, setAdminToken] = useState('')  // empty = not logged in
  const [showLogin, setShowLogin]   = useState(false)

  // Track window width natively for responsive layout adjustments
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isAdmin = !!adminToken

  const handleFile = async (file) => {
    setStatus('loading')
    setResult(null)
    try {
      const { data } = await predictImage(file)
      setResult(data)
      setStatus('done')
    } catch (e) {
      setErrorMsg(e.response?.data?.detail || 'Prediction failed. Is the backend running?')
      setStatus('error')
    }
  }

  const reset = () => { setStatus('idle'); setResult(null); setErrorMsg('') }

  const handleAdminLogin = (token) => {
    setAdminToken(token)
    setShowLogin(false)
    setTab('Retrain')
  }

  const handleAdminLogout = () => {
    setAdminToken('')
    setTab('Detect')
  }

  // Fluid responsive layout margins
  const layout = { 
    maxWidth: 900, 
    margin: '0 auto', 
    padding: isMobile ? '1.5rem 1rem' : '2rem 1.5rem' 
  }

  // If Retrain tab is clicked while not admin → show login
  const handleTabChange = (t) => {
    if (t === 'Retrain' && !isAdmin) { setShowLogin(true); return }
    setShowLogin(false)
    setTab(t)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar tab={tab} setTab={handleTabChange} isAdmin={isAdmin} />

      <main style={layout}>

        {/* Admin login overlay */}
        {showLogin && (
          <AdminLogin onSuccess={handleAdminLogin} />
        )}

        {/* Detect tab */}
        {!showLogin && tab === 'Detect' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <h1 style={{
                fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700,
                letterSpacing: '-0.03em', marginBottom: '0.4rem',
              }}>
                Is this image{' '}
                <span style={{
                  background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  AI-generated
                </span>?
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                Upload any image — SpectraSpatial analyses both spatial and frequency-domain signals.
              </p><br></br>
              <p>
  Note: The underlying model is exclusively trained on human faces.
</p>
              
              {/* Dynamic Warning disclaimer matching your training requirements */}
              <p style={{ 
                marginTop: '0.75rem', 
                fontSize: '0.78rem', 
                fontWeight: '500',
                color: 'rgb(245, 158, 11)', 
                background: 'rgba(245, 158, 11, 0.1)', 
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                ⚠️ <span>Note: The underlying model is exclusively trained on human faces.</span>
              </p>
            </div>

            {status === 'idle' && <ImageUpload onFile={handleFile} />}
            {status === 'loading' && <Loader text="Running inference + GradCAM..." />}

            {status === 'error' && (
              <div style={{
                padding: '1rem 1.25rem', borderRadius: '10px',
                background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                color: 'var(--fake)', fontSize: '0.9rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: '1rem'
              }}>
                <span style={{ wordBreak: 'break-word' }}>{errorMsg}</span>
                <button onClick={reset} style={{
                  background: 'none', border: 'none', color: 'var(--fake)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                  fontFamily: 'var(--font)', fontSize: '0.85rem', flexShrink: 0
                }}>
                  <RotateCcw size={14} /> Retry
                </button>
              </div>
            )}

            {status === 'done' && result && (
              <div style={{
                display: 'grid',
                // Stacks into 1 column on mobile, drops into two panels on desktop
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.4fr) minmax(0,1fr)',
                gap: '1.25rem', 
                alignItems: 'start',
                width: '100%'
              }}>
                <GradCAMView original={result.gradcam_original} heatmap={result.gradcam_heatmap} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                  <ResultPanel label={result.label} p_real={result.p_real} confidence={result.confidence} />
                  <FeedbackButton predictionId={result.prediction_id} currentLabel={result.label} />
                  <button onClick={reset} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                    fontFamily: 'var(--font)', fontSize: '0.85rem', width: '100%'
                  }}>
                    <RotateCcw size={14} /> Analyse another image
                  </button>
                </div>
              </div>
            )}

            {/* Admin shortcut for non-admin users */}
            {!isAdmin && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button onClick={() => setShowLogin(true)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  background: 'none', border: 'none', color: 'var(--muted)',
                  cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.78rem',
                }}>
                  <KeyRound size={12} /> Admin
                </button>
              </div>
            )}
          </div>
        )}

        {/* Retrain tab — admin only */}
        {!showLogin && tab === 'Retrain' && isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.3rem' }}>
                Manual Retraining
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                Fine-tunes on new user-flagged samples only. Previously retrained samples are excluded automatically.
              </p>
            </div>
            <RetrainPanel adminToken={adminToken} onLogout={handleAdminLogout} />
          </div>
        )}

      </main>
    </div>
  )
}