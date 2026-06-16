import React, { useState, useEffect } from 'react'
import { Eye, Flame, Layers } from 'lucide-react'

export default function GradCAMView({ original, heatmap }) {
  const [active, setActive] = useState('heatmap')
  
  // Track viewport breakpoint state dynamically
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const Tab = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActive(id)}
      style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '0.4rem',
        padding: isMobile ? '0.5rem 0.6rem' : '0.4rem 0.9rem', // Larger touch targets for mobile fingers
        borderRadius: '6px', 
        border: 'none',
        cursor: 'pointer', 
        fontFamily: 'var(--font)', 
        fontSize: isMobile ? '0.78rem' : '0.82rem', // Slightly smaller text on small viewports
        fontWeight: 500,
        background: active === id ? 'var(--border)' : 'transparent',
        color: active === id ? 'var(--text)' : 'var(--muted)',
        transition: 'all 0.15s',
        flex: isMobile ? 1 : 'none', // Evenly distributes tabs on mobile widths
        whiteSpace: 'nowrap'
      }}
    >
      <Icon size={isMobile ? 13 : 14} />
      {label}
    </button>
  )

  return (
    <div style={{ 
      background: 'var(--surface)', 
      border: '1px solid var(--border)', 
      borderRadius: '12px', 
      overflow: 'hidden',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Tab bar container wrapper */}
      <div style={{
        display: 'flex', 
        gap: '0.25rem', 
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid var(--border)',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'auto', // Horizontal scroll fallback if viewport gets extremely narrow
        WebkitOverflowScrolling: 'touch'
      }}>
        <Tab id="original" icon={Eye} label="Original" />
        <Tab id="heatmap" icon={Flame} label="GradCAM" />
        {/* Swapped standard Eye icon for Layers to distinguish the split variant nicely */}
        <Tab id="split" icon={Layers} label={isMobile ? "Split" : "Side-by-Side"} />
      </div>

      {/* Image rendering workspace panel */}
      <div style={{ padding: isMobile ? '0.75rem' : '1rem', boxSizing: 'border-box', width: '100%' }}>
        {active === 'original' && (
          <img
            src={`data:image/png;base64,${original}`}
            alt="Original View"
            style={{ width: '100%', height: 'auto', borderRadius: '8px', display: 'block' }}
          />
        )}
        {active === 'heatmap' && (
          <img
            src={`data:image/png;base64,${heatmap}`}
            alt="GradCAM heatmap attention map"
            style={{ width: '100%', height: 'auto', borderRadius: '8px', display: 'block' }}
          />
        )}
        {active === 'split' && (
          <div style={{ 
            display: 'grid', 
            // 1 column on mobile, drops into side-by-side splits on tablets/desktop
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
            gap: isMobile ? '1rem' : '0.75rem',
            width: '100%'
          }}>
            <div style={{ width: '100%' }}>
              <p style={{ 
                fontSize: '0.68rem', 
                color: 'var(--muted)', 
                fontFamily: 'var(--mono)', 
                marginBottom: '0.4rem', 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em' 
              }}>
                Original
              </p>
              <img 
                src={`data:image/png;base64,${original}`} 
                alt="Original Sub-panel" 
                style={{ width: '100%', height: 'auto', borderRadius: '6px', display: 'block' }} 
              />
            </div>
            <div style={{ width: '100%' }}>
              <p style={{ 
                fontSize: '0.68rem', 
                color: 'var(--muted)', 
                fontFamily: 'var(--mono)', 
                marginBottom: '0.4rem', 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em' 
              }}>
                GradCAM
              </p>
              <img 
                src={`data:image/png;base64,${heatmap}`} 
                alt="Heatmap Sub-panel" 
                style={{ width: '100%', height: 'auto', borderRadius: '6px', display: 'block' }} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}