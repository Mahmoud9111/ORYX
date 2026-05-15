'use client'

import { useEffect, useId, useRef } from 'react'

export type LiquidGlassConfig = {
  radius: number        // lens radius in px (size)
  speed: number         // ms per full diagonal sweep (lower = faster)
  blur: number          // backdrop blur (px)
  saturate: number      // backdrop saturation (%)
  displacement: number  // wobble amplitude (px) — pulls page pixels around the rim
  frequency: number     // turbulence baseFrequency — coarseness of the wobble (lower = broader)
  octaves: number       // turbulence octaves — 1 = silky, higher = more detail
  smoothness: number    // gaussian blur stdDev applied to the displacement field
  edge: number          // 0..1 — rim highlight + inner shadow strength
  smoothing: number     // 0..1 cursor follow lerp (lower = more viscous lag)
  trail: number         // 0..1.5 velocity-driven stretch along motion direction
}

export const DEFAULT_LIQUID_CONFIG: LiquidGlassConfig = {
  radius:       520,
  speed:        6000,
  blur:         0,
  saturate:     160,
  displacement: 90,
  frequency:    0.008,
  octaves:      1,
  smoothness:   3.0,
  edge:         0.5,
  smoothing:    0.12,
  trail:        0.55,
}

type Props = {
  config?: LiquidGlassConfig
  /** If provided, drives the blob position (cycle progress = current % 1). Otherwise the blob auto-loops on a wall clock. */
  progressRef?: React.RefObject<number>
  className?: string
  style?: React.CSSProperties
}

export default function LiquidGlass({ config = DEFAULT_LIQUID_CONFIG, progressRef, className, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lensRef = useRef<HTMLDivElement>(null)
  const configRef = useRef(config)
  // safe to use during render and unique per instance
  const rawId = useId()
  const fid = `liquid-lens-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    const container = containerRef.current
    const lens = lensRef.current
    if (!container || !lens) return

    const startT = performance.now()

    let raf = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const cfg = configRef.current
      const r = cfg.radius
      const rect = container.getBoundingClientRect()

      let t: number
      if (progressRef) {
        const v = progressRef.current ?? 0
        t = ((v % 1) + 1) % 1
      } else {
        const cycle = Math.max(1, cfg.speed)
        t = ((now - startT) % cycle) / cycle
      }

      // Center starts fully off the top-right corner and travels to fully off the bottom-left.
      // Reset (t: 1 -> 0) happens with the blob off-screen so the loop is seamless.
      const startX = rect.width  + r
      const startY = -r
      const endX   = -r
      const endY   = rect.height + r

      const posX = startX + (endX - startX) * t
      const posY = startY + (endY - startY) * t

      // Constant velocity along the diagonal — stretch is steady throughout the run.
      const angle = Math.atan2(endY - startY, endX - startX)
      const stretch = Math.min(0.5, cfg.trail * 0.35)
      const sx = 1 + stretch
      const sy = 1 - stretch * 0.45

      lens.style.transform =
        `translate3d(${posX - r}px, ${posY - r}px, 0) ` +
        `rotate(${angle}rad) scale(${sx}, ${sy}) rotate(${-angle}rad)`
      lens.style.opacity = '1'
    }
    raf = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(raf)
  }, [progressRef])

  // live size + filter style updates
  useEffect(() => {
    const lens = lensRef.current
    if (!lens) return
    const d = config.radius * 2
    lens.style.width = `${d}px`
    lens.style.height = `${d}px`
    lens.style.backdropFilter =
      `blur(${config.blur}px) saturate(${config.saturate}%) url(#${fid})`
    // Safari fallback (no SVG-filter ref in backdrop-filter)
    ;(lens.style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter =
      `blur(${config.blur}px) saturate(${config.saturate}%)`
    const e = config.edge
    lens.style.boxShadow =
      `inset 0 4px ${18 * e}px rgba(255,255,255,${0.30 * e}),` +
      `inset 0 -4px ${22 * e}px rgba(255,255,255,${0.10 * e}),` +
      `inset 0 0 ${24 * e}px rgba(255,255,255,${0.10 * e}),` +
      `0 12px 36px rgba(0,0,0,${0.25 * e})`
    lens.style.border = `1px solid rgba(255,255,255,${0.22 * e})`
  }, [config, fid])

  // gentle, slow breathing — small variation around the configured frequency
  const fLo = (config.frequency * 0.90).toFixed(5)
  const fHi = (config.frequency * 1.12).toFixed(5)

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', ...style }}
    >
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden>
        <defs>
          <filter id={fid} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={config.frequency}
              numOctaves={Math.max(1, Math.round(config.octaves))}
              seed={3}
              result="turb"
            >
              <animate
                attributeName="baseFrequency"
                dur="22s"
                values={`${fLo};${fHi};${fLo}`}
                calcMode="spline"
                keySplines="0.42 0 0.58 1 ; 0.42 0 0.58 1"
                keyTimes="0;0.5;1"
                repeatCount="indefinite"
              />
            </feTurbulence>
            {/* Gaussian-blurring the displacement field is what makes the warp silky-smooth */}
            <feGaussianBlur
              in="turb"
              stdDeviation={config.smoothness}
              result="turbSmooth"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="turbSmooth"
              scale={config.displacement}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div
        ref={lensRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: config.radius * 2,
          height: config.radius * 2,
          borderRadius: '50%',
          pointerEvents: 'none',
          opacity: 1,
          willChange: 'transform, opacity',
          // initial values are also set imperatively in the sync effect
          backdropFilter: `blur(${config.blur}px) saturate(${config.saturate}%) url(#${fid})`,
        }}
      />
    </div>
  )
}
