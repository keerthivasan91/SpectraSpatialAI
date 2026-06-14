import React, { useState } from 'react'
import { Eye, Flame } from 'lucide-react'

export default function GradCAMView({ original, heatmap }) {
  const [active, setActive] = useState('heatmap')

  const Tab = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActive(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.4rem 0.9rem', borderRadius: '6px', border: 'none',
        cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.82rem', fontWeight: 500,
        background: active === id ? 'var(--border)' : 'transparent',
        color: active === id ? 'var(--text)' : 'var(--muted)',
        transition: 'all 0.15s',
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  )

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '0.25rem', padding: '0.75rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <Tab id="original" icon={Eye} label="Original" />
        <Tab id="heatmap" icon={Flame} label="GradCAM" />
        <Tab id="split" icon={Eye} label="Side-by-Side" />
      </div>

      {/* Image area */}
      <div style={{ padding: '1rem' }}>
        {active === 'original' && (
          <img
            src={`data:image/png;base64,${original}`}
            alt="Original"
            style={{ width: '100%', borderRadius: '8px', display: 'block' }}
          />
        )}
        {active === 'heatmap' && (
          <img
            src={`data:image/png;base64,${heatmap}`}
            alt="GradCAM heatmap"
            style={{ width: '100%', borderRadius: '8px', display: 'block' }}
          />
        )}
        {active === 'split' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Original</p>
              <img src={`data:image/png;base64,${original}`} alt="Original" style={{ width: '100%', borderRadius: '6px', display: 'block' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>GradCAM</p>
              <img src={`data:image/png;base64,${heatmap}`} alt="Heatmap" style={{ width: '100%', borderRadius: '6px', display: 'block' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
