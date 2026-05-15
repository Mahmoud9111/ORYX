'use client'

import { useState } from 'react'
import { DEFAULT_LIQUID_CONFIG, type LiquidGlassConfig } from './LiquidGlass'

type Props = {
  config: LiquidGlassConfig
  onChange: (cfg: LiquidGlassConfig) => void
  className?: string
  style?: React.CSSProperties
}

export default function LiquidGlassControls({ config, onChange, className, style }: Props) {
  const [open, setOpen] = useState(true)

  const set = <K extends keyof LiquidGlassConfig>(k: K, v: LiquidGlassConfig[K]) =>
    onChange({ ...config, [k]: v })
  const reset = () => onChange(DEFAULT_LIQUID_CONFIG)

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: 'clamp(16px, 2vh, 28px)',
        right: 'clamp(16px, 2vw, 28px)',
        zIndex: 60,
        pointerEvents: 'auto',
        width: open ? 280 : 'auto',
        color: '#fff',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
        letterSpacing: '0.05em',
        background: 'rgba(8, 8, 18, 0.55)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        ...style,
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 14px',
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        <span>LIQUID LENS</span>
        <span style={{ opacity: 0.6 }}>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div style={{ padding: '4px 14px 14px 14px', maxHeight: '70vh', overflowY: 'auto' }}>
          <Group label="LENS">
            <Slider label="Radius"       unit="px" min={40}    max={400}  step={2}     value={config.radius}       onChange={v => set('radius', v)} />
            <Slider label="Speed"        unit="ms" min={500}   max={20000} step={100}  value={config.speed}        onChange={v => set('speed', v)} />
            <Slider label="Smoothing"              min={0.01}  max={0.50} step={0.005} value={config.smoothing}    onChange={v => set('smoothing', v)} />
            <Slider label="Trail"                  min={0}     max={1.5}  step={0.01}  value={config.trail}        onChange={v => set('trail', v)} />
          </Group>

          <Group label="REFRACTION">
            <Slider label="Displacement" unit="px" min={0}     max={200}  step={1}     value={config.displacement} onChange={v => set('displacement', v)} />
            <Slider label="Frequency"              min={0.002} max={0.04} step={0.0005} value={config.frequency}   onChange={v => set('frequency', v)} />
            <Slider label="Smoothness"             min={0}     max={8}    step={0.1}   value={config.smoothness}   onChange={v => set('smoothness', v)} />
            <Slider label="Octaves"                min={1}     max={4}    step={1}     value={config.octaves}      onChange={v => set('octaves', v)} />
          </Group>

          <Group label="GLASS">
            <Slider label="Blur"         unit="px" min={0}     max={24}   step={0.5}   value={config.blur}         onChange={v => set('blur', v)} />
            <Slider label="Saturate"     unit="%"  min={50}    max={260}  step={1}     value={config.saturate}     onChange={v => set('saturate', v)} />
            <Slider label="Edge"                   min={0}     max={1.2}  step={0.01}  value={config.edge}         onChange={v => set('edge', v)} />
          </Group>

          <button
            onClick={reset}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        opacity: 0.45,
        fontSize: 9.5,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

function Slider({
  label, unit, min, max, step, value, onChange,
}: {
  label: string
  unit?: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  const fmt = step >= 1 ? value.toFixed(0) : step >= 0.01 ? value.toFixed(2) : value.toFixed(3)
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 4 }}>
      <span style={{ opacity: 0.75 }}>{label}</span>
      <span style={{ opacity: 0.55, fontVariantNumeric: 'tabular-nums' }}>
        {fmt}{unit ? ` ${unit}` : ''}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          gridColumn: '1 / -1',
          width: '100%',
          accentColor: '#d36cf0',
          height: 14,
          cursor: 'pointer',
        }}
      />
    </label>
  )
}
