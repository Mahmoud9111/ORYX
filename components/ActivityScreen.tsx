'use client'

import { useEffect, useRef } from 'react'
import { lamaSans } from '@/app/fonts'

// ── Screen 7 of the pinned section: "03 / ACTIVITY TRACKER" ──────────────────
// Same contract as the other two feature screens — markup plus the shared
// `data-feat-*` hooks that buildFeature() in OrySection animates, scoped by
// data-feature="act".

const GREEN = '#c2ee20'

// Backdrop is authored in a 1600×900 box and stretched with
// preserveAspectRatio="none". That distortion is invisible on organic contours,
// and it buys something worth more: every point maps to a fixed percentage of
// the viewport at any size, so the HTML waypoint labels below can be positioned
// off the same coordinates and stay pinned to their dots.
const VB_W = 1600
const VB_H = 900

// ── Topographic contours ─────────────────────────────────────────────────────
// Marching squares over fractal value noise, not a stack of concentric loops.
// That distinction is the whole look: real contours fork around saddles, pinch
// into narrow passes, close into basins and run near-parallel down a slope. No
// number of nested ellipses produces any of that — they can only ever be rings.
//
// It renders to a <canvas> rather than SVG. At this density the contour set is
// a few hundred polylines of a few hundred points each; as <path> elements that
// is megabytes of DOM for something purely decorative that never animates on
// its own. One canvas draws it in a single pass and only redraws on resize.
//
// The field and its contours are computed once in normalized 0..1 space, so a
// resize is just a re-stroke at new dimensions — no re-solving.

const GRID_W = 176
const GRID_H = 99
const LEVELS = 30
/** Polylines shorter than this are noise specks at cell scale; drop them. */
const MIN_POINTS = 7

function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Tiling value noise on a 256² lattice, smoothstep-interpolated. */
function valueNoise2D(seed: number) {
  const N = 256
  const rnd = mulberry32(seed)
  const g = new Float32Array(N * N)
  for (let i = 0; i < g.length; i++) g[i] = rnd()
  const at = (x: number, y: number) => g[(y & (N - 1)) * N + (x & (N - 1))]
  const fade = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const fx = fade(x - xi)
    const fy = fade(y - yi)
    const top = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * fx
    const bot = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * fx
    return top + (bot - top) * fy
  }
}

function buildField() {
  const noise = valueNoise2D(20260806)
  const f = new Float32Array(GRID_W * GRID_H)
  let min = Infinity
  let max = -Infinity
  for (let j = 0; j < GRID_H; j++) {
    for (let i = 0; i < GRID_W; i++) {
      // Feature scale: ~6 noise cells across the width, so peaks land at a size
      // that reads as terrain rather than as wallpaper.
      const x = (i / GRID_W) * 6.2
      const y = (j / GRID_H) * 3.6
      let amp = 1
      let freq = 1
      let sum = 0
      let norm = 0
      // Irrational-ish frequency step so octaves never line up into a grid.
      for (let o = 0; o < 5; o++) {
        sum += amp * noise(x * freq, y * freq)
        norm += amp
        amp *= 0.52
        freq *= 2.03
      }
      const v = sum / norm
      f[j * GRID_W + i] = v
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  return { f, min, max }
}

/**
 * One contour level, as stitched polylines in grid coordinates.
 * Standard 16-case marching squares; the saddle cases (5 and 10) emit two
 * segments, which is exactly where contours split around a pass.
 */
function marchLevel(f: Float32Array, level: number) {
  const segs: number[] = []
  for (let j = 0; j < GRID_H - 1; j++) {
    for (let i = 0; i < GRID_W - 1; i++) {
      const a = f[j * GRID_W + i]
      const b = f[j * GRID_W + i + 1]
      const c = f[(j + 1) * GRID_W + i + 1]
      const d = f[(j + 1) * GRID_W + i]
      let code = 0
      if (a > level) code |= 8
      if (b > level) code |= 4
      if (c > level) code |= 2
      if (d > level) code |= 1
      if (code === 0 || code === 15) continue
      const t = (v0: number, v1: number) => (level - v0) / (v1 - v0)
      const topX = i + t(a, b), topY = j
      const rgtX = i + 1,       rgtY = j + t(b, c)
      const botX = i + t(d, c), botY = j + 1
      const lftX = i,           lftY = j + t(a, d)
      const push = (x0: number, y0: number, x1: number, y1: number) => segs.push(x0, y0, x1, y1)
      switch (code) {
        case 1: case 14: push(lftX, lftY, botX, botY); break
        case 2: case 13: push(botX, botY, rgtX, rgtY); break
        case 3: case 12: push(lftX, lftY, rgtX, rgtY); break
        case 4: case 11: push(topX, topY, rgtX, rgtY); break
        case 6: case 9:  push(topX, topY, botX, botY); break
        case 7: case 8:  push(lftX, lftY, topX, topY); break
        case 5:  push(lftX, lftY, topX, topY); push(botX, botY, rgtX, rgtY); break
        case 10: push(lftX, lftY, botX, botY); push(topX, topY, rgtX, rgtY); break
      }
    }
  }

  // Stitch loose segments into runs by matching endpoints. Quantizing the key
  // is what makes neighbouring cells agree on a shared vertex — the two cells
  // compute the same crossing from the same pair of corner values, but only to
  // within float error.
  const n = segs.length / 4
  const key = (x: number, y: number) => `${Math.round(x * 4096)},${Math.round(y * 4096)}`
  const ends = new Map<string, number[]>()
  for (let s = 0; s < n; s++) {
    for (const k of [key(segs[s * 4], segs[s * 4 + 1]), key(segs[s * 4 + 2], segs[s * 4 + 3])]) {
      const list = ends.get(k)
      if (list) list.push(s); else ends.set(k, [s])
    }
  }

  const used = new Uint8Array(n)
  const lines: number[][] = []
  const grab = (k: string) => {
    const list = ends.get(k)
    if (!list) return -1
    for (const s of list) if (!used[s]) return s
    return -1
  }

  for (let s = 0; s < n; s++) {
    if (used[s]) continue
    used[s] = 1
    const line = [segs[s * 4], segs[s * 4 + 1], segs[s * 4 + 2], segs[s * 4 + 3]]
    // walk forward off the tail, then backward off the head
    for (;;) {
      const tx = line[line.length - 2], ty = line[line.length - 1]
      const next = grab(key(tx, ty))
      if (next < 0) break
      used[next] = 1
      const o = next * 4
      const flip = key(segs[o], segs[o + 1]) === key(tx, ty)
      line.push(flip ? segs[o + 2] : segs[o], flip ? segs[o + 3] : segs[o + 1])
    }
    for (;;) {
      const hx = line[0], hy = line[1]
      const next = grab(key(hx, hy))
      if (next < 0) break
      used[next] = 1
      const o = next * 4
      const flip = key(segs[o], segs[o + 1]) === key(hx, hy)
      line.unshift(flip ? segs[o + 2] : segs[o], flip ? segs[o + 3] : segs[o + 1])
    }
    if (line.length / 2 >= MIN_POINTS) lines.push(line)
  }
  return lines
}

let CONTOURS: Float32Array[] | null = null

/** Solved once, lazily, and cached — normalized to 0..1 so resizes are free. */
function contours() {
  if (CONTOURS) return CONTOURS
  const { f, min, max } = buildField()
  const span = max - min
  const out: Float32Array[] = []
  for (let l = 0; l < LEVELS; l++) {
    // Inset from the extremes: a level at the very min or max traces the one
    // pixel-sized ring around a single peak, which is just a dot.
    const level = min + span * (0.06 + (l / (LEVELS - 1)) * 0.88)
    for (const line of marchLevel(f, level)) {
      const arr = new Float32Array(line.length)
      for (let i = 0; i < line.length; i += 2) {
        arr[i] = line[i] / (GRID_W - 1)
        arr[i + 1] = line[i + 1] / (GRID_H - 1)
      }
      out.push(arr)
    }
  }
  CONTOURS = out
  return out
}

function paintTerrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)

  // Haze first — a broad pool of light the contours then sit inside.
  const haze = ctx.createRadialGradient(w * 0.45, h * 0.5, 0, w * 0.45, h * 0.5, Math.max(w, h) * 0.62)
  haze.addColorStop(0, 'rgba(194,238,32,0.10)')
  haze.addColorStop(0.6, 'rgba(194,238,32,0.03)')
  haze.addColorStop(1, 'rgba(194,238,32,0)')
  ctx.fillStyle = haze
  ctx.fillRect(0, 0, w, h)

  const lines = contours()
  const trace = () => {
    for (const line of lines) {
      ctx.beginPath()
      ctx.moveTo(line[0] * w, line[1] * h)
      for (let i = 2; i < line.length; i += 2) ctx.lineTo(line[i] * w, line[i + 1] * h)
      ctx.stroke()
    }
  }

  // Same falloff the SVG used to get from a userSpaceOnUse gradient: bright in
  // the middle of the map, dying off at the corners.
  const grad = (a0: number, a1: number, a2: number) => {
    const g = ctx.createRadialGradient(w * 0.45, h * 0.5, 0, w * 0.45, h * 0.5, Math.max(w, h) * 0.72)
    g.addColorStop(0, `rgba(194,238,32,${a0})`)
    g.addColorStop(0.5, `rgba(194,238,32,${a1})`)
    g.addColorStop(1, `rgba(194,238,32,${a2})`)
    return g
  }

  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  // Soft pass for bloom, then the hairline on top.
  ctx.lineWidth = 2.4
  ctx.strokeStyle = grad(0.09, 0.045, 0.012)
  trace()
  ctx.lineWidth = 0.8
  ctx.strokeStyle = grad(0.62, 0.30, 0.07)
  trace()
}

function TerrainCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cvs = ref.current
    if (!cvs) return
    let raf = 0

    const draw = () => {
      const w = cvs.clientWidth
      const h = cvs.clientHeight
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cvs.width = Math.round(w * dpr)
      cvs.height = Math.round(h * dpr)
      const ctx = cvs.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintTerrain(ctx, w, h)
    }

    // Solving the field is a one-off ~50ms of main thread. The screen it backs
    // is ~2400vh down the page, so it can wait for an idle slot rather than
    // competing with the loader and the first GLTF parse.
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(cb, { timeout: 2000 })
        : window.setTimeout(cb, 300)
    const handle = idle(draw)

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(draw)
    })
    ro.observe(cvs)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(handle as number)
      else clearTimeout(handle as number)
    }
  }, [])

  return <canvas ref={ref} className="absolute inset-0" style={{ width: '100%', height: '100%', display: 'block' }} />
}

// ── The route ────────────────────────────────────────────────────────────────
// Bottom-left to top-right, passing behind the watch on the way. Waypoints sit
// at the two ends, where nothing occludes them.
const ROUTE_D =
  'M 224 738 C 380 760, 470 690, 620 600 C 700 552, 760 520, 860 505 ' +
  'C 990 486, 1090 470, 1160 400 C 1240 320, 1250 280, 1352 262'

const WAYPOINTS: [number, number][] = [[224, 738], [1352, 262]]

// …and the labels that ride alongside them, in viewport percentages taken
// straight off the coordinates above.
const LABELS = [
  { text: '5.6 KM',   x: (224 / VB_W) * 100,  y: (738 / VB_H) * 100 },
  { text: '563 KCAL', x: (1352 / VB_W) * 100, y: (262 / VB_H) * 100 },
]

export function ActivityTerrain() {
  return (
    <div
      data-feature="act"
      className="absolute inset-0"
      style={{ zIndex: 0, pointerEvents: 'none' }}
    >
      <div data-feat-backdrop style={{ width: '100%', height: '100%', opacity: 0, position: 'relative' }}>
        <TerrainCanvas />
        <svg
          className="absolute inset-0"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          style={{ display: 'block' }}
        >
          <defs>
            <filter id="act-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <filter id="act-glow-tight" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>
            <filter id="act-dot" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="11" />
            </filter>
            {/* The route is revealed by growing this rect, not by dash offset —
                the stroke's own dash pattern is already spoken for by the
                marching-ants loop. */}
            <clipPath id="act-route-clip">
              <rect
                data-feat-wipe
                x="0" y="0" width={VB_W} height={VB_H}
                style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}
              />
            </clipPath>
          </defs>

          <g clipPath="url(#act-route-clip)">
            {/* bloom under the trail */}
            {/* Three passes of the same dashes: a wide soft bloom, a tight
                halo, and a hairline near-white core. All the intensity lives in
                the stacked glow, which is what lets the line itself stay this
                thin and still burn.
                Every pass carries the same flow period and starts at the same
                offset, so they march in lockstep — a static glow under moving
                dashes would smear. Dash period is 20 in the normalized
                1000-unit space, so the loop's 1000-unit step is exactly 50
                cycles and the ants never jump. */}
            <path
              data-feat-flow="8"
              d={ROUTE_D} pathLength={1000} fill="none"
              stroke={GREEN} strokeWidth="9" strokeOpacity="0.26"
              filter="url(#act-glow)"
              strokeDasharray="8 12" strokeLinecap="round"
            />
            <path
              data-feat-flow="8"
              d={ROUTE_D} pathLength={1000} fill="none"
              stroke="#e2ff5e" strokeWidth="3.4" strokeOpacity="0.45"
              filter="url(#act-glow-tight)"
              strokeDasharray="8 12" strokeLinecap="round"
            />
            <path
              data-feat-flow="8"
              d={ROUTE_D} pathLength={1000} fill="none"
              stroke="#f6ffd0" strokeWidth="1.4" strokeLinecap="round"
              strokeDasharray="8 12"
            />
          </g>

          {WAYPOINTS.map(([cx, cy], i) => (
            <g key={i} data-feat-fade>
              <circle cx={cx} cy={cy} r="20" fill={GREEN} opacity="0.5" filter="url(#act-dot)" />
              <circle cx={cx} cy={cy} r="10" fill={GREEN} />
              <circle cx={cx} cy={cy} r="5.5" fill="#fff" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function FlameIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5c3.6 4 6.5 6.6 6.5 10.6a6.5 6.5 0 1 1-13 0c0-2 .9-3.6 2.3-5.2.3 1.4 1 2.3 2 2.6-.4-3 .8-6 2.2-8z" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  )
}

function StopwatchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M9.5 2h5M12 2v3M18.4 7.6l1.5-1.5M12 13.5V9.6" />
    </svg>
  )
}

const STATS = [
  { icon: <FlameIcon />,      label: 'CALORIES',    value: '563 KCAL' },
  { icon: <PinIcon />,        label: 'DISTANCE',    value: '5.6 KM' },
  { icon: <StopwatchIcon />,  label: 'ACTIVE TIME', value: '7h 32m' },
]

export function ActivityContent() {
  return (
    <div data-feature="act" className="absolute inset-0" style={{ zIndex: 12, pointerEvents: 'none' }}>

      {/* ── Left: index, headline, copy ── */}
      <div
        className="absolute"
        style={{
          left: 'clamp(36px, 5vw, 120px)',
          top: 'calc(50% - clamp(20px, 4vh, 56px))',
          transform: 'translateY(-50%)',
        }}
      >
        <div data-feat-index className="flex items-center gap-5" style={{ opacity: 0 }}>
          <span
            className="font-mono"
            style={{ color: GREEN, fontSize: 'clamp(15px, 1.3vw, 24px)', letterSpacing: '0.18em' }}
          >
            03
          </span>
          <span
            style={{ display: 'block', width: 'clamp(28px, 3vw, 52px)', height: '1.5px', background: GREEN }}
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
            <span data-feat-line style={{ display: 'block', transform: 'translateY(112%)', color: '#fff' }}>ACTIVITY</span>
          </span>
          <span style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.04em' }}>
            <span data-feat-line style={{ display: 'block', transform: 'translateY(112%)', color: GREEN }}>TRACKER</span>
          </span>
        </h2>

        {/* Rule under the headline rather than under a scroll cue — the screen's
            one `scroll-rule` hook, so it still wipes in from the left. */}
        <span
          data-feat-scroll-rule
          style={{
            display: 'block', marginTop: 'clamp(12px, 1.6vh, 22px)',
            width: 'clamp(44px, 4.4vw, 78px)', height: '3px', background: GREEN,
            transformOrigin: 'left center',
          }}
        />

        <p
          data-feat-copy
          style={{
            margin: 'clamp(18px, 2.4vh, 30px) 0 0',
            maxWidth: 'clamp(240px, 24vw, 420px)',
            fontSize: 'clamp(13px, 1.05vw, 20px)',
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.62)',
            fontFamily: 'var(--font-lama), system-ui, Arial, sans-serif',
            opacity: 0,
          }}
        >
          Track steps, distance, calories and activity levels to build better habits.
        </p>

      </div>

      {/* ── Waypoint labels. Positioned off the same viewBox coordinates as the
          dots; because the backdrop stretches with preserveAspectRatio="none",
          those percentages hold at any viewport size. ── */}
      {LABELS.map(l => (
        <span
          key={l.text}
          data-feat-fade
          className="font-mono absolute uppercase whitespace-nowrap"
          style={{
            left: `calc(${l.x}% + clamp(26px, 2.2vw, 40px))`,
            top: `${l.y}%`,
            transform: 'translateY(-50%)',
            fontSize: 'clamp(11px, 0.95vw, 18px)',
            letterSpacing: '0.12em',
            color: '#fff',
            opacity: 0,
          }}
        >
          {l.text}
        </span>
      ))}

      {/* ── Right: the readout — outlined badges, matching the map's line art ── */}
      <div
        className="absolute"
        style={{
          left: '73%', top: 'calc(50% + clamp(42px, 8.5vh, 116px))', transform: 'translateY(-50%)',
          width: 'clamp(170px, 15vw, 300px)',
        }}
      >
        {STATS.map(stat => (
          <div key={stat.label} data-feat-stat style={{ opacity: 0 }}>
            <div className="flex items-center" style={{ gap: 'clamp(12px, 1.1vw, 22px)' }}>
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 'clamp(38px, 3vw, 54px)', height: 'clamp(38px, 3vw, 54px)',
                  borderRadius: '9999px', border: `1px solid ${GREEN}`, color: GREEN,
                }}
              >
                {stat.icon}
              </span>
              <span>
                <span
                  className="font-mono uppercase"
                  style={{
                    display: 'block', fontSize: 'clamp(9px, 0.7vw, 13px)',
                    letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)',
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
                transformOrigin: 'left center', margin: 'clamp(14px, 1.9vh, 24px) 0',
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
          const active = n === '03'
          return (
            <div key={n} className="flex items-center gap-3" style={{ padding: '9px 0' }}>
              <span
                style={{
                  width: '6px', height: '6px', borderRadius: '9999px',
                  background: active ? GREEN : 'rgba(255,255,255,0.28)',
                }}
              />
              <span
                className="font-mono"
                style={{
                  fontSize: 'clamp(11px, 0.85vw, 16px)', letterSpacing: '0.14em',
                  color: active ? GREEN : 'rgba(255,255,255,0.28)',
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
