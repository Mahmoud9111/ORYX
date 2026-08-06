'use client'

import { lamaSans } from '@/app/fonts'

// ── Screen 5 of the pinned section: "02 / PERFORMANCE TIMER" ──────────────────
// Pure markup + data-attribute hooks. All motion is authored on the master
// ScrollTrigger timeline in OrySection, which queries these attributes — the
// component itself never animates, so the whole screen scrubs with the wheel
// like every other layer.

const ORANGE = '#ff6a00'

// The ring stack, listed inner → outer; that order is also the stagger order,
// so the system blooms outward on the way in and dissolves outward on the way
// out. Every ring is dashed or cut to an arc — a solid circle rotating about
// its own center is indistinguishable from a still one, so the dash pattern is
// what makes the spin readable. `spin` is seconds for one full turn, negative
// for counter-clockwise; neighbours alternate direction and no two share a
// period, which keeps the stack from ever resolving into a single rigid wheel.
type Ring = {
  r: number
  spin: number
  width: number
  dash: string
  dashOpacity: number
  /** Faint full circle behind the moving stroke, so an arc still reads as a ring. */
  base?: number
  round?: boolean
}

const RINGS: Ring[] = [
  { r: 196, spin:  34, width: 2,   dash: '2 9',      dashOpacity: 0.45 },
  { r: 226, spin: -46, width: 1.5, dash: '1.5 16',   dashOpacity: 0.28 },
  { r: 258, spin:  20, width: 1.5, dash: '260 1361', dashOpacity: 0.55, base: 0.12, round: true },
  { r: 312, spin: -54, width: 1,   dash: '34 26',    dashOpacity: 0.20 },
  { r: 378, spin:  26, width: 1.5, dash: '180 2195', dashOpacity: 0.45, base: 0.10, round: true },
  { r: 446, spin: -66, width: 1,   dash: '6 34',     dashOpacity: 0.14 },
  { r: 498, spin:  42, width: 1,   dash: '120 3010', dashOpacity: 0.30, base: 0.05, round: true },
]

const EMBERS = [
  [712, 118, 5, 0.85], [886, 296, 4, 0.6],  [934, 528, 3, 0.5],
  [820, 726, 4, 0.7],  [604, 906, 3, 0.45], [352, 838, 5, 0.6],
  [168, 640, 3, 0.4],  [122, 402, 4, 0.55], [286, 176, 3, 0.45],
  [470, 62, 4, 0.5],
] as const

/** Concentric orange rings + drifting embers that sit behind the watch. */
export function PerformanceRings() {
  return (
    <div
      data-feature="perf"
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex: 0, pointerEvents: 'none' }}
    >
      {/* Square box so the rings stay circular at any aspect ratio. Carries the
          halo and the pre-load hidden state only — each ring reveals itself, so
          nothing here scales and the centering can stay on the flex parent. */}
      <div data-feat-backdrop style={{ width: '132vh', height: '132vh', opacity: 0 }}>
        <svg viewBox="0 0 1000 1000" width="100%" height="100%" style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="perf-halo" cx="50%" cy="50%" r="50%">
              <stop offset="18%" stopColor={ORANGE} stopOpacity="0" />
              <stop offset="62%" stopColor={ORANGE} stopOpacity="0.055" />
              <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
            </radialGradient>
            <filter id="perf-ember" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          <circle cx="500" cy="500" r="500" fill="url(#perf-halo)" />

          {/* Two nested groups per ring, deliberately: the outer one is the
              scrubbed reveal (scale/opacity/rotation, staggered) and the inner
              one is the free-running spin. One element carrying both would mean
              two tweens fighting over the same rotation channel. */}
          {RINGS.map(ring => (
            <g key={ring.r} data-feat-ring>
              {ring.base != null && (
                <circle cx="500" cy="500" r={ring.r} fill="none" stroke={ORANGE}
                        strokeWidth={ring.width} strokeOpacity={ring.base} />
              )}
              <g data-feat-spin={ring.spin}>
                <circle
                  cx="500" cy="500" r={ring.r} fill="none" stroke={ORANGE}
                  strokeWidth={ring.width} strokeOpacity={ring.dashOpacity}
                  strokeDasharray={ring.dash}
                  strokeLinecap={ring.round ? 'round' : 'butt'}
                />
              </g>
            </g>
          ))}

          {/* Embers drift the other way, slowly, so the field never looks locked
              to any one ring. Last in the stagger. */}
          <g data-feat-ring>
            <g data-feat-spin="-165">
              <g filter="url(#perf-ember)" fill={ORANGE}>
                {EMBERS.map(([cx, cy, r, o], i) => (
                  <circle key={i} cx={cx} cy={cy} r={r} opacity={o} />
                ))}
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
}

function StopwatchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M9.5 2h5M12 2v3M18.4 7.6l1.5-1.5M12 13.5V9.6" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 2.5c3.6 4 6.5 6.6 6.5 10.6a6.5 6.5 0 1 1-13 0c0-2 .9-3.6 2.3-5.2.3 1.4 1 2.3 2 2.6-.4-3 .8-6 2.2-8z" />
    </svg>
  )
}

function SessionsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M5 17.5 10 12l4 3 5-8.5" strokeLinecap="round" />
      <circle cx="5" cy="17.5" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="10" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="14" cy="15" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="19" cy="6.5" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  )
}

const STATS = [
  { icon: <StopwatchIcon />, label: 'FOCUS TIME', value: '24:37' },
  { icon: <FlameIcon />,     label: 'CALORIES',   value: '563 KCAL' },
  { icon: <SessionsIcon />,  label: 'SESSIONS',   value: '12' },
]

/** Copy, readout panel and pagination — everything that sits over the watch. */
export function PerformanceContent() {
  return (
    <div data-feature="perf" className="absolute inset-0" style={{ zIndex: 12, pointerEvents: 'none' }}>

      {/* ── Left: index, headline, copy, scroll cue ── */}
      <div
        className="absolute"
        style={{ left: 'clamp(36px, 5vw, 120px)', top: '50%', transform: 'translateY(-50%)' }}
      >
        {/* 02 — */}
        <div data-feat-index className="flex items-center gap-5" style={{ opacity: 0 }}>
          <span
            className="font-mono"
            style={{ color: ORANGE, fontSize: 'clamp(15px, 1.3vw, 24px)', letterSpacing: '0.18em' }}
          >
            02
          </span>
          <span
            data-feat-index-rule
            style={{ display: 'block', width: 'clamp(28px, 3vw, 52px)', height: '1.5px', background: ORANGE }}
          />
        </div>

        {/* PERFORMANCE / TIMER — each line rides up out of its own clip box */}
        <h2
          className={`${lamaSans.className} uppercase`}
          style={{
            margin: 'clamp(20px, 2.6vh, 34px) 0 0',
            fontSize: 'clamp(40px, 5.2vw, 96px)',
            lineHeight: 1.02,
            letterSpacing: '0.005em',
          }}
        >
          <span style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.04em' }}>
            {/* translateY inline, not just via gsap.set — the timeline is only
                built once the loader clears, and until then this would
                otherwise sit visible on top of screen 1. */}
            <span data-feat-line style={{ display: 'block', transform: 'translateY(112%)', color:'#fff' }}>PERFORMANCE</span>
          </span>
          <span style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.04em' }}>
            {/* translateY inline, not just via gsap.set — the timeline is only
                built once the loader clears, and until then this would
                otherwise sit visible on top of screen 1. */}
            <span data-feat-line style={{ display: 'block', transform: 'translateY(112%)', color:ORANGE }}>TIMER</span>
          </span>
        </h2>

        <p
          data-feat-copy
          style={{
            margin: 'clamp(18px, 2.4vh, 30px) 0 0',
            maxWidth: 'clamp(240px, 24vw, 420px)',
            fontSize: 'clamp(13px, 1.05vw, 20px)',
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.58)',
            fontFamily: 'var(--font-lama), system-ui, Arial, sans-serif',
            opacity: 0,
          }}
        >
          Precision timing for workouts, intervals, or any challenge you take on.
        </p>

        <div data-feat-scroll style={{ marginTop: 'clamp(26px, 3.4vh, 46px)', opacity: 0 }}>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 'clamp(10px, 0.78vw, 14px)', letterSpacing: '0.26em', color: '#fff' }}
          >
            Scroll to explore
          </span>
          <span
            data-feat-scroll-rule
            style={{
              display: 'block', marginTop: '14px', width: 'clamp(40px, 4vw, 70px)',
              height: '2px', background: ORANGE, transformOrigin: 'left center',
            }}
          />
        </div>
      </div>

      {/* ── Right: the readout panel ── */}
      <div
        className="absolute"
        style={{
          left: '74.5%', top: '50%', transform: 'translateY(-50%)',
          width: 'clamp(190px, 17vw, 340px)',
        }}
      >
        {STATS.map(stat => (
          <div key={stat.label} data-feat-stat style={{ opacity: 0 }}>
            <div className="flex items-center" style={{ gap: 'clamp(12px, 1.1vw, 22px)', padding: '4px 0 clamp(14px, 1.9vh, 24px)' }}>
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 'clamp(38px, 3vw, 54px)', height: 'clamp(38px, 3vw, 54px)',
                  borderRadius: '9999px', background: 'rgba(255,106,0,0.13)', color: ORANGE,
                }}
              >
                {stat.icon}
              </span>
              <span>
                <span
                  className="font-mono uppercase"
                  style={{
                    display: 'block', fontSize: 'clamp(9px, 0.7vw, 13px)',
                    letterSpacing: '0.22em', color: 'rgba(255,255,255,0.45)',
                  }}
                >
                  {stat.label}
                </span>
                <span
                  className={lamaSans.className}
                  style={{
                    display: 'block', marginTop: '6px', color: '#fff',
                    fontSize: 'clamp(17px, 1.5vw, 28px)', lineHeight: 1, letterSpacing: '0.01em',
                  }}
                >
                  {stat.value}
                </span>
              </span>
            </div>
            <span
              data-feat-divider
              style={{
                display: 'block', height: '1px', background: 'rgba(255,255,255,0.13)',
                transformOrigin: 'left center', marginBottom: 'clamp(14px, 1.9vh, 24px)',
              }}
            />
          </div>
        ))}
      </div>

      {/* ── Far right: 01 / 02 / 03 ── */}
      <div
        data-feat-pager
        className="absolute"
        style={{
          right: 'clamp(20px, 2.6vw, 58px)', top: '50%', transform: 'translateY(-50%)', opacity: 0,
        }}
      >
        {['01', '02', '03'].map(n => {
          const active = n === '02'
          return (
            <div key={n} className="flex items-center gap-3" style={{ padding: '9px 0' }}>
              <span
                style={{
                  width: '6px', height: '6px', borderRadius: '9999px',
                  background: active ? ORANGE : 'rgba(255,255,255,0.28)',
                }}
              />
              <span
                className="font-mono"
                style={{
                  fontSize: 'clamp(11px, 0.85vw, 16px)', letterSpacing: '0.14em',
                  color: active ? ORANGE : 'rgba(255,255,255,0.28)',
                }}
              >
                {n}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Bottom-left marker ── */}
      <div
        data-feat-badge
        className="absolute flex items-center justify-center"
        style={{
          left: 'clamp(36px, 5vw, 120px)', bottom: 'clamp(28px, 4vh, 64px)',
          width: '38px', height: '38px', borderRadius: '9999px',
          border: '1px solid rgba(255,255,255,0.22)', opacity: 0,
        }}
      >
        <span className="font-mono" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>N</span>
      </div>
    </div>
  )
}
