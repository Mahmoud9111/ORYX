'use client'

import { forwardRef, useId, useMemo } from 'react'

type OryxLogoProps = {
  /** Size of the rendered square in px (or any CSS length via `style`). */
  size?: number | string
  /** Stroke color for grid / bounding boxes / circles. */
  lineColor?: string
  /** Fill color for the anchor squares. */
  anchorColor?: string
  /** Stroke for the orange-tinted anchor square outlines (kept subtle in the ref). */
  anchorStroke?: string
  /** Color of the bezier handle bars + their end dots. */
  handleColor?: string
  /**
   * Handle bar half-length as a fraction of the circle radius. 0.5523 is the
   * real bezier-circle constant (kappa) — what a vector editor would show.
   */
  handleScale?: number
  /** Radius of the round dot capping each handle. */
  dotRadius?: number
  /** Stroke width of the construction lines. */
  strokeWidth?: number
  /** How far past the 800-unit viewBox the horizontal grid lines run. */
  gridExtendX?: number
  /** How far past the 800-unit viewBox the vertical grid lines run. */
  gridExtendY?: number
  /** 0..0.5 — fraction of each grid line that fades to transparent at either end. */
  gridFade?: number
  /** Optional className passed to the root <svg>. */
  className?: string
  /** Optional inline style passed to the root <svg>. */
  style?: React.CSSProperties
  /** When true, dashes on the circles are removed (useful for the "settled" state). */
  solid?: boolean
}

// ──────────────────────────────────────────────────────────────────────────────
// Geometry. Everything is centered in a 800×800 viewBox so an animator can
// scale, rotate, or trace any single primitive without re-deriving values.
// Tweak these and the layout follows.
// ──────────────────────────────────────────────────────────────────────────────
const VIEW = 800
const C = VIEW / 2              // center
const R_OUT = 300               // outer circle radius
const R_IN = 245                // inner circle radius — sits close under R_OUT
const ANCHOR = 14               // anchor square side
const HALF_A = ANCHOR / 2
const KAPPA = 0.5523            // bezier circle constant

// Helper: turn a center point into a <rect> at that coord.
const anchor = (cx: number, cy: number, key: string) => ({
  key,
  x: cx - HALF_A,
  y: cy - HALF_A,
})

// A handle bar: tangent to the circle at an on-curve point, so N/S run
// horizontally and E/W run vertically. `len` is the half-length, i.e. the bar
// reaches `len` in both directions from the anchor.
const handle = (key: string, cx: number, cy: number, axis: 'h' | 'v', len: number) => ({
  key,
  x1: axis === 'h' ? cx - len : cx,
  y1: axis === 'h' ? cy : cy - len,
  x2: axis === 'h' ? cx + len : cx,
  y2: axis === 'h' ? cy : cy + len,
})

// Every cardinal point of one circle, with its tangent axis.
const cardinals = (cx: number, cy: number, r: number) => [
  { id: 'N', x: cx,     y: cy - r, axis: 'h' as const },
  { id: 'E', x: cx + r, y: cy,     axis: 'v' as const },
  { id: 'S', x: cx,     y: cy + r, axis: 'h' as const },
  { id: 'W', x: cx - r, y: cy,     axis: 'v' as const },
]

const OryxLogo = forwardRef<SVGSVGElement, OryxLogoProps>(function OryxLogo(
  {
    size = '100%',
    lineColor = 'rgba(255,255,255,0.22)',
    anchorColor = '#ff7a1a',
    anchorStroke = 'rgba(255,140,40,0.0)',
    handleColor = '#ff7a1a',
    handleScale = KAPPA,
    dotRadius = 5,
    strokeWidth = 1,
    gridExtendX = 1400,
    gridExtendY = 1400,
    gridFade = 0.28,
    className,
    style,
    solid = false,
  },
  ref,
) {
  // Bounding box edges for each circle.
  const outerBox = { left: C - R_OUT, right: C + R_OUT, top: C - R_OUT, bottom: C + R_OUT }
  const innerBox = { left: C - R_IN,  right: C + R_IN,  top: C - R_IN,  bottom: C + R_IN  }

  // Anchor squares: 4 cardinal points on each circle + 4 bounding-box corners
  // for each. The reference image also shows a couple of extra anchors on the
  // right edge of the inner box (midway between corner and cardinal) — added
  // here as `outer-mid-*` so they read the same.
  const anchors = useMemo(() => [
    // outer circle cardinals — the on-curve points the handles hang off
    anchor(C, outerBox.top, 'outer-N'),
    anchor(outerBox.right, C, 'outer-E'),
    anchor(C, outerBox.bottom, 'outer-S'),
    anchor(outerBox.left, C, 'outer-W'),

    // inner circle cardinals
    anchor(C, innerBox.top, 'inner-N'),
    anchor(innerBox.right, C, 'inner-E'),
    anchor(C, innerBox.bottom, 'inner-S'),
    anchor(innerBox.left, C, 'inner-W'),
  ], [outerBox.left, outerBox.right, outerBox.top, outerBox.bottom,
      innerBox.left, innerBox.right, innerBox.top, innerBox.bottom])

  // Bezier handle bars — one per cardinal point on each circle, tangent to the
  // curve, capped with a round dot at each end.
  const handles = useMemo(() => [
    ...cardinals(C, C, R_OUT).map(p =>
      handle(`outer-${p.id}`, p.x, p.y, p.axis, R_OUT * handleScale)),
    ...cardinals(C, C, R_IN).map(p =>
      handle(`inner-${p.id}`, p.x, p.y, p.axis, R_IN * handleScale)),
  ], [handleScale])

  const circumOut = 2 * Math.PI * R_OUT
  const circumIn  = 2 * Math.PI * R_IN

  // Grid lines overshoot the viewBox on both sides (the <svg> is overflow:visible)
  // and are painted with a gradient that fades to transparent at each end, so
  // they read as receding rather than being cut off. Both axes reach far past
  // the box, so the grid spans well beyond the logo in every direction.
  const gridMinX = -gridExtendX
  const gridMaxX = VIEW + gridExtendX
  const gridMinY = -gridExtendY
  const gridMaxY = VIEW + gridExtendY
  const uid = useId().replace(/:/g, '')
  const fadeH = `oryx-fade-h-${uid}`
  const fadeV = `oryx-fade-v-${uid}`

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={size}
      height={size}
      className={className}
      style={{ overflow: 'visible', display: 'block', ...style }}
      xmlns="http://www.w3.org/2000/svg"
      data-oryx-logo
    >
      {/* ── Fade gradients for the grid lines. userSpaceOnUse because a
              horizontal/vertical line has a zero-area bounding box, which makes
              objectBoundingBox gradients collapse. ────────────────────────── */}
      <defs>
        <linearGradient id={fadeH} gradientUnits="userSpaceOnUse" x1={gridMinX} y1={0} x2={gridMaxX} y2={0}>
          <stop offset="0"              stopColor={lineColor} stopOpacity="0" />
          <stop offset={gridFade}       stopColor={lineColor} stopOpacity="1" />
          <stop offset={1 - gridFade}   stopColor={lineColor} stopOpacity="1" />
          <stop offset="1"              stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={fadeV} gradientUnits="userSpaceOnUse" x1={0} y1={gridMinY} x2={0} y2={gridMaxY}>
          <stop offset="0"              stopColor={lineColor} stopOpacity="0" />
          <stop offset={gridFade}       stopColor={lineColor} stopOpacity="1" />
          <stop offset={1 - gridFade}   stopColor={lineColor} stopOpacity="1" />
          <stop offset="1"              stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Grid lines (faint, dotted) ─────────────────────────────────── */}
      <g
        data-oryx-grid
        strokeWidth={strokeWidth}
        strokeDasharray="2 6"
        fill="none"
      >
        {/* horizontal grid lines at each box edge */}
        <g stroke={`url(#${fadeH})`}>
          <line data-oryx-grid-line="h-outer-top"    x1={gridMinX} y1={outerBox.top}    x2={gridMaxX} y2={outerBox.top} />
          <line data-oryx-grid-line="h-outer-bottom" x1={gridMinX} y1={outerBox.bottom} x2={gridMaxX} y2={outerBox.bottom} />
          <line data-oryx-grid-line="h-inner-top"    x1={gridMinX} y1={innerBox.top}    x2={gridMaxX} y2={innerBox.top} />
          <line data-oryx-grid-line="h-inner-bottom" x1={gridMinX} y1={innerBox.bottom} x2={gridMaxX} y2={innerBox.bottom} />
        </g>

        {/* vertical grid lines at each box edge */}
        <g stroke={`url(#${fadeV})`}>
          <line data-oryx-grid-line="v-outer-left"  x1={outerBox.left}  y1={gridMinY} x2={outerBox.left}  y2={gridMaxY} />
          <line data-oryx-grid-line="v-outer-right" x1={outerBox.right} y1={gridMinY} x2={outerBox.right} y2={gridMaxY} />
          <line data-oryx-grid-line="v-inner-left"  x1={innerBox.left}  y1={gridMinY} x2={innerBox.left}  y2={gridMaxY} />
          <line data-oryx-grid-line="v-inner-right" x1={innerBox.right} y1={gridMinY} x2={innerBox.right} y2={gridMaxY} />
        </g>
      </g>

      {/* ── Bounding box (slightly brighter than the grid) ────────────── */}
      <g
        data-oryx-bbox
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeDasharray="3 5"
        fill="none"
      >
        <rect
          data-oryx-bbox-outer
          x={outerBox.left}
          y={outerBox.top}
          width={R_OUT * 2}
          height={R_OUT * 2}
        />
      </g>

      {/* ── The two construction circles. pathLength=1 lets you animate a
              draw-on with `strokeDashoffset: 1 → 0`, no math required. ── */}
      <g data-oryx-circles fill="none">
        <circle
          data-oryx-circle="outer"
          cx={C}
          cy={C}
          r={R_OUT}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={strokeWidth}
          strokeDasharray={solid ? undefined : '4 4'}
          pathLength={1}
          // Native props for raw geometry-based animation if you'd rather not
          // use pathLength — kept here for convenience:
          data-circumference={circumOut}
        />
        <circle
          data-oryx-circle="inner"
          cx={C}
          cy={C}
          r={R_IN}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={strokeWidth}
          strokeDasharray={solid ? undefined : '4 4'}
          pathLength={1}
          data-circumference={circumIn}
        />
      </g>

      {/* ── Bezier handle bars + end dots. pathLength=1 on each bar so a
              draw-on is just `strokeDashoffset: 1 → 0`. ─────────────────── */}
      <g data-oryx-handles>
        {handles.map(h => (
          <g key={h.key} data-oryx-handle={h.key}>
            <line
              data-oryx-handle-bar={h.key}
              x1={h.x1}
              y1={h.y1}
              x2={h.x2}
              y2={h.y2}
              stroke={handleColor}
              strokeWidth={strokeWidth * 2}
              strokeDasharray={solid ? undefined : '6 5'}
              pathLength={1}
            />
            <circle data-oryx-handle-dot={`${h.key}-a`} cx={h.x1} cy={h.y1} r={dotRadius} fill={handleColor} />
            <circle data-oryx-handle-dot={`${h.key}-b`} cx={h.x2} cy={h.y2} r={dotRadius} fill={handleColor} />
          </g>
        ))}
      </g>

      {/* ── Orange anchor squares ─────────────────────────────────────── */}
      <g data-oryx-anchors fill={anchorColor} stroke={anchorStroke}>
        {anchors.map(a => (
          <rect
            key={a.key}
            data-oryx-anchor={a.key}
            x={a.x}
            y={a.y}
            width={ANCHOR}
            height={ANCHOR}
          />
        ))}
      </g>
    </svg>
  )
})

export default OryxLogo
