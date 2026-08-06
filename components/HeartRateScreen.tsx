'use client'

import { lamaSans } from '@/app/fonts'

// ── Screen 6 of the pinned section: "01 / HEART RATE MONITOR" ────────────────
// Same contract as PerformanceScreen — markup plus the shared `data-feat-*`
// hooks that buildFeature() in OrySection animates. Scoped by data-feature="hr"
// so the two screens never pick up each other's elements.

const RED = '#ee0f26'

// One PQRST beat, laid out in fractions of a beat's width so the trace can be
// retimed by changing BEATS alone. Authored as straight segments rather than
// curves: a real ECG readout is drawn by a pen, and the hard corners are what
// make it read as an instrument trace instead of a decorative squiggle.
function ecgPath(width: number, baseline: number, beats: number) {
  const seg = width / beats
  let d = `M 0 ${baseline}`
  for (let i = 0; i < beats; i++) {
    const x = i * seg
    const at = (f: number) => (x + seg * f).toFixed(1)
    d += ` L ${at(0.08)} ${baseline}`
    // low chatter on the isoelectric line
    d += ` L ${at(0.12)} ${baseline - 7} L ${at(0.16)} ${baseline + 5} L ${at(0.20)} ${baseline}`
    // P wave
    d += ` L ${at(0.28)} ${baseline - 15} L ${at(0.34)} ${baseline}`
    // QRS complex — the spike
    d += ` L ${at(0.385)} ${baseline + 20} L ${at(0.43)} ${baseline - 108} L ${at(0.475)} ${baseline + 44} L ${at(0.52)} ${baseline}`
    // T wave
    d += ` L ${at(0.62)} ${baseline - 24} L ${at(0.70)} ${baseline}`
    // trailing chatter
    d += ` L ${at(0.78)} ${baseline - 6} L ${at(0.85)} ${baseline + 6} L ${at(1)} ${baseline}`
  }
  return d
}

const ECG_W = 1600
const ECG_H = 300
const ECG_BASE = 150
const ECG_D = ecgPath(ECG_W, ECG_BASE, 5)

// Dust kicked up along the trace. x/y in the same user space as the path.
const MOTES = [
  [212, 128, 2.2, 0.7], [268, 176, 1.6, 0.45], [402, 96, 2.6, 0.8],
  [438, 190, 1.8, 0.5], [560, 142, 1.5, 0.4],  [706, 118, 2.4, 0.65],
  [742, 182, 1.7, 0.45], [905, 150, 1.5, 0.35], [1048, 104, 2.5, 0.7],
  [1092, 186, 1.9, 0.5], [1244, 136, 1.6, 0.4], [1386, 112, 2.3, 0.6],
  [1432, 178, 1.7, 0.45], [1520, 152, 1.5, 0.35],
] as const

/** The ECG trace running the full width, behind the watch. */
export function HeartRateWave() {
  return (
    <div
      data-feature="hr"
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex: 0, pointerEvents: 'none' }}
    >
      <div data-feat-backdrop style={{ width: '100%', height: `${ECG_H}px`, opacity: 0 }}>
        {/* preserveAspectRatio="none" — the trace is meant to span the viewport
            edge to edge, so it stretches horizontally rather than letterboxing.
            Height is fixed in px, so the spikes keep their real proportions. */}
        <svg
          viewBox={`0 0 ${ECG_W} ${ECG_H}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          style={{ overflow: 'visible', display: 'block' }}
        >
          <defs>
            <filter id="hr-glow" x="-10%" y="-60%" width="120%" height="220%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <filter id="hr-mote" x="-400%" y="-400%" width="900%" height="900%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
            <linearGradient id="hr-fade" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"   stopColor={RED} stopOpacity="0" />
              <stop offset="14%"  stopColor={RED} stopOpacity="1" />
              <stop offset="86%"  stopColor={RED} stopOpacity="1" />
              <stop offset="100%" stopColor={RED} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Bloom under the trace */}
          <path
            data-feat-draw
            d={ECG_D} pathLength={1000}
            fill="none" stroke={RED} strokeWidth="7" strokeOpacity="0.5"
            filter="url(#hr-glow)"
            strokeDasharray="1000" strokeDashoffset="1000"
          />
          {/* The trace itself, faded at both ends so it never hard-stops on the
              viewport edge */}
          <path
            data-feat-draw
            d={ECG_D} pathLength={1000}
            fill="none" stroke="url(#hr-fade)" strokeWidth="2.4"
            strokeLinejoin="round"
            strokeDasharray="1000" strokeDashoffset="1000"
          />
          {/* Monitor sweep — a short bright segment running the length of the
              trace on a loop, the way a bedside readout refreshes. */}
          <path
            data-feat-flow="4.6"
            d={ECG_D} pathLength={1000}
            fill="none" stroke="#ff5a6a" strokeWidth="3" strokeLinecap="round"
            filter="url(#hr-glow)"
            strokeDasharray="26 974" strokeDashoffset="0"
          />

          <g filter="url(#hr-mote)" fill={RED}>
            {MOTES.map(([cx, cy, r, o], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} opacity={o} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  )
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21s-8.2-5.1-8.2-10.4A4.9 4.9 0 0 1 12 7.6a4.9 4.9 0 0 1 8.2 3C20.2 15.9 12 21 12 21z" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 13 13" fill="currentColor">
      {[0, 5, 10].flatMap(x => [0, 5, 10].map(y => (
        <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" />
      )))}
    </svg>
  )
}

const STATS = [
  { icon: <HeartIcon />, label: 'ZONE 2',  value: 'Fat Burn' },
  { icon: <GridIcon />,  label: 'MAX HR',  value: '186 BPM' },
]

// The trace's baseline sits on the vertical center and its QRS peaks reach ~108
// user units above it (the troughs only ~44 below), so the copy sits closer to
// the line than the headline does. Everything is anchored off center rather
// than laid out in one centered column, which is what keeps the headline clear
// of the spikes at any viewport height instead of only at the one I checked.
const ABOVE_TRACE = 'clamp(96px, 13vh, 150px)'
const BELOW_TRACE = 'clamp(64px, 9vh, 110px)'

/** Copy, readout and pagination — everything that sits over the watch. */
export function HeartRateContent() {
  return (
    <div data-feature="hr" className="absolute inset-0" style={{ zIndex: 12, pointerEvents: 'none' }}>

      {/* ── Left, above the trace: index + headline ── */}
      <div
        className="absolute"
        style={{ left: 'clamp(36px, 5vw, 120px)', bottom: `calc(50% + ${ABOVE_TRACE})` }}
      >
        <div data-feat-index className="flex items-center gap-5" style={{ opacity: 0 }}>
          <span
            className="font-mono"
            style={{ color: RED, fontSize: 'clamp(15px, 1.3vw, 24px)', letterSpacing: '0.18em' }}
          >
            01
          </span>
          <span
            style={{ display: 'block', width: 'clamp(28px, 3vw, 52px)', height: '1.5px', background: RED }}
          />
        </div>

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
            <span data-feat-line style={{ display: 'block', transform: 'translateY(112%)', color: '#fff' }}>HEART RATE</span>
          </span>
          <span style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.04em' }}>
            <span data-feat-line style={{ display: 'block', transform: 'translateY(112%)', color: RED }}>MONITOR</span>
          </span>
        </h2>
      </div>

      {/* ── Left, below the trace: copy + scroll cue ── */}
      <div
        className="absolute"
        style={{ left: 'clamp(36px, 5vw, 120px)', top: `calc(50% + ${BELOW_TRACE})` }}
      >
        <p
          data-feat-copy
          style={{
            margin: 0,
            maxWidth: 'clamp(240px, 24vw, 420px)',
            fontSize: 'clamp(13px, 1.05vw, 20px)',
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.58)',
            fontFamily: 'var(--font-lama), system-ui, Arial, sans-serif',
            opacity: 0,
          }}
        >
          Real-time heart rate tracking with intelligent alerts to keep you in your optimal zone.
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
              height: '2px', background: RED, transformOrigin: 'left center',
            }}
          />
        </div>
      </div>

      {/* ── Right, below the trace: the readout. Tighter than the timer
          screen's — inline icons, no badges, so the two panels don't read as
          the same module twice. ── */}
      <div
        className="absolute"
        style={{
          left: '77%', top: `calc(50% + ${BELOW_TRACE})`,
          width: 'clamp(150px, 13vw, 260px)',
        }}
      >
        {STATS.map(stat => (
          <div key={stat.label} data-feat-stat style={{ opacity: 0 }}>
            <div className="flex items-center" style={{ gap: 'clamp(9px, 0.8vw, 16px)' }}>
              <span className="shrink-0" style={{ color: RED, lineHeight: 0 }}>{stat.icon}</span>
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 'clamp(9px, 0.7vw, 13px)',
                  letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)',
                }}
              >
                {stat.label}
              </span>
            </div>
            <span
              className={lamaSans.className}
              style={{
                display: 'block', marginTop: 'clamp(6px, 0.8vh, 11px)', color: '#fff',
                fontSize: 'clamp(17px, 1.5vw, 28px)', lineHeight: 1, letterSpacing: '0.01em',
              }}
            >
              {stat.value}
            </span>
            <span
              data-feat-divider
              style={{
                display: 'block', height: '1px', background: 'rgba(255,255,255,0.13)',
                transformOrigin: 'left center', margin: 'clamp(14px, 2vh, 26px) 0',
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
          const active = n === '01'
          return (
            <div key={n} className="flex items-center gap-3" style={{ padding: '9px 0' }}>
              <span
                style={{
                  width: '6px', height: '6px', borderRadius: '9999px',
                  background: active ? RED : 'rgba(255,255,255,0.28)',
                }}
              />
              <span
                className="font-mono"
                style={{
                  fontSize: 'clamp(11px, 0.85vw, 16px)', letterSpacing: '0.14em',
                  color: active ? RED : 'rgba(255,255,255,0.28)',
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
