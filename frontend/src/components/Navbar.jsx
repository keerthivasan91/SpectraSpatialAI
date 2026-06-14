import React from 'react'
import { ScanSearch } from 'lucide-react'

const S = {
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 2rem', borderBottom: '1px solid var(--border)',
    background: 'rgba(10,12,16,0.85)', backdropFilter: 'blur(12px)',
    position: 'sticky', top: 0, zIndex: 50,
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em',
  },
  tag: {
    fontSize: '0.65rem', fontFamily: 'var(--mono)',
    color: 'var(--accent)', background: 'rgba(110,231,247,0.08)',
    border: '1px solid rgba(110,231,247,0.2)',
    padding: '0.2rem 0.5rem', borderRadius: '4px', letterSpacing: '0.05em',
  },
  tabs: { display: 'flex', gap: '0.25rem' },
  tab: (active) => ({
    padding: '0.4rem 1rem', borderRadius: '6px', border: 'none',
    cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.85rem',
    fontWeight: 500, transition: 'all 0.15s',
    background: active ? 'var(--border)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--muted)',
  }),
}

// Admin tab is only shown when isAdmin=true
export default function Navbar({ tab, setTab, isAdmin }) {
  const tabs = isAdmin ? ['Detect', 'Retrain'] : ['Detect']
  return (
    <nav style={S.nav}>
      <div style={S.brand}>
        <ScanSearch size={22} style={{ color: 'var(--accent)' }} />
        <span>SpectraSpatial</span>
        <span style={S.tag}>AI DETECTOR</span>
      </div>
      <div style={S.tabs}>
        {tabs.map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
    </nav>
  )
}
