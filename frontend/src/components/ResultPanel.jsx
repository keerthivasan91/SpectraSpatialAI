import React from 'react'
import { ShieldAlert, ShieldCheck, HelpCircle } from 'lucide-react'

const LABEL_CONFIG = {
  'AI-Generated': {
    icon: ShieldAlert,
    color: 'var(--fake)',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.25)',
    badge: 'SYNTHETIC',
  },
  'Real': {
    icon: ShieldCheck,
    color: 'var(--real)',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.25)',
    badge: 'AUTHENTIC',
  },
  'Uncertain': {
    icon: HelpCircle,
    color: 'var(--accent2)',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.25)',
    badge: 'UNCERTAIN',
  },
}

export default function ResultPanel({ label, p_real, confidence }) {
  const cfg = LABEL_CONFIG[label] || LABEL_CONFIG['Uncertain']
  const Icon = cfg.icon

  // P(REAL) gauge — bar fills left (0) to right (1), threshold markers at 0.5380 and 0.9156
  const pRealPct = (p_real * 100).toFixed(1)

  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: '12px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Icon size={28} style={{ color: cfg.color, flexShrink: 0 }} />
        <div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: '0.65rem',
            color: cfg.color, letterSpacing: '0.12em', marginBottom: '0.2rem',
          }}>
            {cfg.badge}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.4rem', color: cfg.color }}>
            {label}
          </div>
        </div>
      </div>

      {/* P(REAL) gauge */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem',
        }}>
          <span style={{ fontFamily: 'var(--mono)' }}>P(REAL)</span>
          <span style={{ fontFamily: 'var(--mono)', color: cfg.color, fontWeight: 600 }}>
            {p_real.toFixed(4)}
          </span>
        </div>

        {/* Gauge bar with threshold markers */}
        <div style={{ position: 'relative', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'visible' }}>
          {/* Filled portion */}
          <div style={{
            position: 'absolute', left: 0, top: 0,
            width: `${p_real * 100}%`, height: '100%',
            background: cfg.color, borderRadius: '4px',
            transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          }} />
          {/* Threshold markers */}
          <div style={{ position: 'absolute', left: '53.8%', top: -3, width: 2, height: 14, background: 'var(--fake)', borderRadius: 1 }} title="FAKE threshold 0.5380" />
          <div style={{ position: 'absolute', left: '91.56%', top: -3, width: 2, height: 14, background: 'var(--real)', borderRadius: 1 }} title="REAL threshold 0.9156" />
        </div>

        {/* Threshold labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', position: 'relative' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--fake)' }}>0.5380</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--muted)', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>uncertain</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--real)' }}>0.9156</span>
        </div>
      </div>

      {/* Confidence */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.4rem',
        }}>
          <span>Decision confidence</span>
          <span style={{ fontFamily: 'var(--mono)', color: cfg.color, fontWeight: 600 }}>
            {confidence.toFixed(1)}%
          </span>
        </div>
        <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: `${confidence}%`, height: '100%',
            background: cfg.color, borderRadius: '3px',
            transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      </div>
    </div>
  )
}
