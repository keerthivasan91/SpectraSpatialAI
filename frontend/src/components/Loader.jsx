import React from 'react'

export default function Loader({ text = 'Analyzing...' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '1rem', padding: '3rem 0',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTop: '3px solid var(--accent)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.85rem' }}>
        {text}
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
