import React from 'react'
import logoFull from '../SpectraSpatial.svg' // <-- Point this to where you saved the first full SVG file

const S = {
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.85rem 2rem', borderBottom: '1px solid var(--border)',
    background: 'rgba(10,12,16,0.85)', backdropFilter: 'blur(12px)',
    position: 'sticky', top: 0, zIndex: 50,
  },
  brand: {
    display: 'flex', 
    alignItems: 'center',
    // Removed the super tight height restriction to let the graphic expand
  },
  logo: {
    width: '250px', // Explicit width gives the vector graphic real estate to breathe
    height: 'auto',  // Auto height maintains the exact mathematical proportions
    display: 'block',
    margin: '-4px 0', // Slight negative margin pulls it tight if your nav padding is tall
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

export default function Navbar({ tab, setTab, isAdmin }) {
  const tabs = isAdmin ? ['Detect', 'Retrain'] : ['Detect']

  return (
    <nav style={S.nav}>
      <div style={S.brand}>
        {/* The single full SVG handles the icon, brand text, and AI alignment beautifully */}
        <img 
          src={logoFull} 
          alt="SpectraSpatial AI Platform" 
          style={S.logo} 
        />
      </div>

      <div style={S.tabs}>
        {tabs.map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
    </nav>
  )
}