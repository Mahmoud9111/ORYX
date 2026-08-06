'use client'

import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'
import Ory from './models/Ory'
import { useLoader } from '@/contexts/LoaderContext'
import SplitText from './SplitText/SplitText'
import LiquidGlass, { type LiquidGlassConfig } from './LiquidGlass'
import IceFrameBackground from './IceFrameBackground'
import OryxLogo from './OryxLogo'
import { lamaSans } from '@/app/fonts'


gsap.registerPlugin(ScrollTrigger, GSAPSplitText)
RectAreaLightUniformsLib.init()

// Every headline, the pixel-style title and the wordmark on the last screen all
// use the one site typeface; aliases kept so each call site still reads by role.
const pixelFont = lamaSans
const condensedFont = lamaSans
const wordmarkFont = lamaSans

// ── Blob liquid lens — tweak everything here ──
const BLOB_CONFIG: LiquidGlassConfig = {
  radius:       1700,    // lens size (px)
  speed:        4500,    // unused here — GSAP drives progress; see BLOB_SPEED
  blur:         0.01,       // backdrop blur (px)
  saturate:     150,     // backdrop saturation (%)
  displacement: 34,      // wobble amplitude (px) — warp strength at the rim
  frequency:    0.001,   // noise coarseness — lower = broader wobble
  octaves:      1,       // noise detail — 1 = silky, higher = more grain
  smoothness:   0.5,     // gaussian blur on displacement field
  edge:         0,     // 0..1 — rim highlight + inner shadow strength
  smoothing:    0.12,    // 0..1 — cursor follow lerp (unused with progressRef)
  trail:        0.67,    // 0..1.5 — velocity-driven stretch along motion
}
const BLOB_SPEED = 6              // seconds for one diagonal sweep (lower = faster)
const BLOB_EASE  = 'expo.out'     // sprint at the start, ease out at the end

// Layer-5 strokes — rendered size of the OryxLogo construction drawing. Its
// outer circle is 75% of this box (R_OUT 300 in an 800 viewBox), so this is
// sized so that circle hugs the watch at its final zoomed-out scale (0.68).
const L5_LOGO_SIZE = 'clamp(210px, 32vh, 480px)'

// Last screen, once the watch is gone: the strokes scale up from the drawing's
// center in two phases. First the small inner circle grows and stops halfway
// through the tail; only then does the big outer circle take over and carry on
// to a larger final size. Each circle drags its own gray grid lines with it,
// one short delay behind.
// The two radii are 245 (inner) and 300 (outer), so the big circle has to grow
// along with the small one in phase 1 or the small one bursts straight through
// it: 245 × 1.25 = 306 would clear a static 300. At the lead scale below the
// outer sits at 300 × 1.15 = 345, holding a 39-unit gap at the tightest point.
const L5_SCALE_INNER = 1.25       // where the small circle stops, mid-tail
const L5_SCALE_OUTER_LEAD = 1.15  // big circle's phase-1 size, just clear of the small one
const L5_SCALE_OUTER = 1.5        // …then it keeps going, alone
const L5_SCALE_DELAY = 0.2        // timeline units between a circle and its gray strokes (≈9vh)
const L5_T_INNER = 17.0           // phase 1 starts — right as the watch finishes fading
const L5_T_OUTER = 18.2           // phase 2 starts — after the inner set has settled
// Outer circle diameter as a fraction of the rendered logo box (R_OUT 300 of an
// 800 viewBox → 600/800). Needed to work out how far the drawing has to shrink
// or grow to sit exactly on the O of the wordmark.
const L5_OUTER_DIA_RATIO = 0.75

// Layer 6 — the ORYX wordmark. Once the drawing has finished growing it slides
// off center and lands on the O, which fades up from nothing while it travels.
// Starting size only. measureFit() overwrites it at runtime with whatever makes
// the O exactly as wide as the drawing's outer circle — this value just has to
// render once so the glyph's proportions can be measured off it.
const ORYX_WORDMARK_SIZE = 'clamp(92px, 21vw, 470px)'
const ORYX_MAX_WIDTH = 0.94       // …unless fitting the O would push ORYX past this much of the screen
const L6_T    = 20.2              // move + fade start (≈918vh)
const L6_DUR  = 2.0               // …and how long both take (≈91vh)
const L6_HOLD = 0.8               // beat on the resolved logo before it breaks up

// …then the construction drawing has done its job: it fades off and the
// wordmark falls away to a small centered logo, both on the same scroll.
const L6_T_OUT      = L6_T + L6_DUR + L6_HOLD  // 23.0
const L6_OUT_DUR    = 1.2         // strokes fade out over this, clear before the watch arrives
const L6_SHRINK_LAG = 0.8         // wordmark waits this long before following
const L6_SHRINK_DUR = 2.0
const ORYX_SMALL    = 0.06        // final wordmark scale — small enough to sit inside the watch face
// Flat gray while it is a backdrop for the construction strokes, turning white
// as it shrinks onto the caseback, where it reads as engraving.
const ORYX_GRAY     = '#3b3b3b'
const ORYX_WHITE    = '#ffffff'

// Last beat: the watch fades back in, reversed, overlapping the shrink almost
// end to end — the wordmark is still settling onto the caseback as the caseback
// arrives under it, rather than one waiting on the other. Both are
// centered on the screen — the canvas grid keeps its middle column centered and
// the camera looks at the origin the model sits on — so the text lands in the
// middle of the watch without any nudging.
const L6_WATCH_DELAY = 1.0        // …a good beat behind it, so it doesn't arrive on the nose
const L6_T_WATCH    = L6_T_OUT + L6_SHRINK_LAG + L6_WATCH_DELAY  // 24.8
const L6_WATCH_DUR  = L6_SHRINK_DUR              // …over the same length of stretch
const L6_END_HOLD   = 1.0         // space at the end, pins the timeline at 30.2
// Where the watch turns its back. Off the timeline playhead rather than raw
// scrollY, so it can't drift out of step with the scrubbed canvas fade below —
// it has to land while the canvas is still at a hard 0, in both directions.
const L6_T_FLIP     = L6_T_WATCH - 0.4  // 23.4

// …and then the wordmark goes while the watch turns round to its face, the two
// on one window so the letters dissolve as the caseback swings away.
const L6_T_GONE     = L6_T_WATCH + L6_WATCH_DUR + 0.8  // 26.6
const L6_GONE_DUR   = 1.6

type MousePos = { x: number; y: number }

function MouseFollowModel({
  mouseRef,
  backRef,
}: {
  mouseRef: React.RefObject<MousePos>
  /** 0 = dial to camera, 1 = caseback to camera. Scrubbed for the turn back. */
  backRef: React.RefObject<number>
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!groupRef.current) return
    const { x, y } = mouseRef.current ?? { x: 0, y: 0 }
    // p: 0 at top → 1 after 300vh of scroll
    const p = Math.min(window.scrollY / (window.innerHeight * 3), 1)

    // ── Screen 1 (p: 0 → 0.33)  mouse-follow rotation ──────────────────────
    const s1p = THREE.MathUtils.clamp(p * 3, 0, 1)             // 0→1 over screen 1
    const rotY = THREE.MathUtils.lerp(x * 0.8, 0, s1p)         // mouse Y fades out
    const rotX = THREE.MathUtils.lerp(-y * 0.55, 0, s1p)       // mouse X fades out

    // ── Screen 2 (p: 0.33 → 0.67)  pre-tilt + zoom-in ──────────────────────
    const s2p = THREE.MathUtils.clamp((p - 0.33) / 0.34, 0, 1) // 0→1 over screen 2
    const tiltX  = THREE.MathUtils.lerp(rotX, 0.55, s2p)       // curve watch face up
    const zoom2  = THREE.MathUtils.lerp(1.0, 1.15, s2p)        // gentle zoom

    // ── Screen 3 (p: 0.67 → 1.0)  full flip + deep zoom ────────────────────
    const s3p    = THREE.MathUtils.clamp((p - 0.67) * 3, 0, 1) // 0→1 over screen 3
    const s3pE   = s3p * s3p * (3 - 2 * s3p)                   // smoothstep easing
    const zoomS3 = THREE.MathUtils.clamp((p - 0.78) * 3, 0, 1) // delayed zoom start
    const finalY = THREE.MathUtils.lerp(rotY, -Math.PI * 2, s3pE)
    const finalX = THREE.MathUtils.lerp(tiltX, 0, s3pE)
    const finalScale = THREE.MathUtils.lerp(zoom2, 1.45, zoomS3 * zoomS3)

    // ── Screen 4 (0 → 1 over the 4th 100vh)  zoom back out ──────────────────
    const s4p = THREE.MathUtils.clamp((window.scrollY / window.innerHeight - 3), 0, 1)
    const s4pE = s4p * s4p * (3 - 2 * s4p)                     // smoothstep
    const s4Scale = THREE.MathUtils.lerp(finalScale, 1.0, s4pE)

    // ── Outro (scrollY 500vh → 570vh)  extra pull-back. The layer-4 text is
    //    gone by ≈435vh, so a full screen of scroll passes with the watch
    //    just sitting there before it starts shrinking. Ends at 570 rather
    //    than 600 so the 0.06 lerp below has room to actually converge on the
    //    target scale — the watch is visibly settled into the ring before the
    //    fade-out begins (≈641vh). ─────────────────────────────────────────
    const s5p = THREE.MathUtils.clamp((window.scrollY / window.innerHeight - 5.0) / 0.7, 0, 1)
    const s5pE = s5p * s5p * (3 - 2 * s5p)                     // smoothstep
    const s5Scale = THREE.MathUtils.lerp(s4Scale, 0.68, s5pE)

    // ── Caseback. Driven straight off the timeline, never eased here: the
    //    switch onto the back (t 23.4) is thrown while the canvas is at opacity
    //    0 so it is never seen turning, and the turn back to the dial is
    //    scrubbed, so it tracks the wheel frame for frame. At 0 it hands back to
    //    the eased path with no jump, since the two agree exactly there.
    const back = backRef.current
    groupRef.current.rotation.y = back > 0
      ? finalY + Math.PI * back
      : THREE.MathUtils.lerp(groupRef.current.rotation.y, finalY, 0.08)
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, finalX, 0.08)
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, s5Scale, 0.06))
  })

  return (
    <group ref={groupRef}>
      <Ory scale={1.0} position={[0, 0, 0]} />
    </group>
  )
}

function PixelGridIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="currentColor" className={className}>
      {([0, 5, 10] as number[]).flatMap(x =>
        ([0, 5, 10] as number[]).map(y => (
          <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" />
        ))
      )}
    </svg>
  )
}

function CrosshairIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <rect x="4" y="4" width="8" height="8" />
      <line x1="8" y1="0" x2="8" y2="4" />
      <line x1="8" y1="12" x2="8" y2="16" />
      <line x1="0" y1="8" x2="4" y2="8" />
      <line x1="12" y1="8" x2="16" y2="8" />
    </svg>
  )
}

export default function OrySection() {
  const mouseRef = useRef<MousePos>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef<HTMLDivElement>(null)
  const liquidProgressRef = useRef<number>(0)
  const watchBackRef = useRef<number>(0)
  const { done } = useLoader()

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Hide entrance elements and layer-2 elements before they animate
  useGSAP(() => {
    gsap.set('[data-ani]', { opacity: 0, y: 32 })
  }, { scope: pinnedRef })

  // Entrance reveal when loader clears
  useGSAP(() => {
    if (!done) return

    // If user already scrolled past the entrance area, snap straight to the
    // final state so the scrub timeline can take over without fighting us.
    if (window.scrollY > 5) {
      gsap.set('[data-ani]', { opacity: 1, y: 0 })
      return
    }

    const entrance = gsap.to('[data-ani]', {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: (i) => i * 0.15,
    })

    // If the user starts scrolling mid-entrance, fast-forward so the
    // scroll-driven fade-out isn't held hostage by this tween.
    const onScroll = () => {
      if (window.scrollY > 5) {
        entrance.progress(1)
        window.removeEventListener('scroll', onScroll)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, { scope: pinnedRef, dependencies: [done] })

  // Pinned scroll transition
  useGSAP(() => {
    if (!done || !containerRef.current || !pinnedRef.current) return

    const pinned = pinnedRef.current
    const layer1 = pinned.querySelectorAll('[data-layer1]')
    const leftEl   = pinned.querySelector<HTMLElement>('[data-l2-left]')
    const rightEl  = pinned.querySelector<HTMLElement>('[data-l2-right]')
    const leftEl3  = pinned.querySelector<HTMLElement>('[data-l3-left]')
    const rightEl3 = pinned.querySelector<HTMLElement>('[data-l3-right]')
    const waterproofEl  = pinned.querySelector<HTMLElement>('[data-l4-waterproof]')
    const liquidEl      = pinned.querySelector<HTMLElement>('[data-l4-liquid]')
    const iceFrameEl    = pinned.querySelector<HTMLElement>('[data-l4-iceframe]')
    const l4LeftEl      = pinned.querySelector<HTMLElement>('[data-l4-left]')
    const l4RightEl     = pinned.querySelector<HTMLElement>('[data-l4-right]')
    const l4LeftLine    = pinned.querySelector<SVGLineElement>('[data-l4-line-left]')
    const l4RightLine   = pinned.querySelector<SVGLineElement>('[data-l4-line-right]')
    const l4LeftDot     = pinned.querySelector<SVGCircleElement>('[data-l4-dot-left]')
    const l4RightDot    = pinned.querySelector<SVGCircleElement>('[data-l4-dot-right]')
    const l5El          = pinned.querySelector<HTMLElement>('[data-l5]')
    const l6El          = pinned.querySelector<HTMLElement>('[data-l6]')
    const wordEl        = pinned.querySelector<HTMLElement>('[data-oryx-word]')
    const canvasEl      = pinned.querySelector<HTMLElement>('[data-canvas]')

    const navHeader = document.querySelector('header')

    const leftSplit   = leftEl   ? new GSAPSplitText(leftEl,   { type: 'words' }) : null
    const rightSplit  = rightEl  ? new GSAPSplitText(rightEl,  { type: 'words' }) : null
    const leftSplit3  = leftEl3  ? new GSAPSplitText(leftEl3,  { type: 'words' }) : null
    const rightSplit3 = rightEl3 ? new GSAPSplitText(rightEl3, { type: 'words' }) : null
    const l4LeftSplit  = l4LeftEl  ? new GSAPSplitText(l4LeftEl,  { type: 'words' }) : null
    const l4RightSplit = l4RightEl ? new GSAPSplitText(l4RightEl, { type: 'words' }) : null

    // Parents start at opacity 0 (inline CSS, prevents refresh flash). Once
    // SplitText has hidden each word individually, we promote the parent back
    // to opacity 1 so the per-word reveal can actually be seen.
    if (leftSplit)   gsap.set(leftSplit.words,   { opacity: 0 })
    if (leftEl)      gsap.set(leftEl,  { y: -14, opacity: 1 })
    if (rightSplit)  gsap.set(rightSplit.words,  { opacity: 0 })
    if (rightEl)     gsap.set(rightEl, { y: 14, opacity: 1 })
    if (leftSplit3)  gsap.set(leftSplit3.words,  { opacity: 0 })
    if (leftEl3)     gsap.set(leftEl3, { y: -14, opacity: 1 })
    if (rightSplit3) gsap.set(rightSplit3.words, { opacity: 0 })
    if (rightEl3)    gsap.set(rightEl3, { y: 14, opacity: 1 })
    if (waterproofEl) gsap.set(waterproofEl, { opacity: 0, filter: 'blur(50px)', x: -60 })
    if (liquidEl)     gsap.set(liquidEl,     { opacity: 0 })
    if (iceFrameEl)   gsap.set(iceFrameEl,   { opacity: 0 })
    if (l4LeftEl)    gsap.set(l4LeftEl,   { x: -30, opacity: 0 })
    if (l4LeftSplit) gsap.set(l4LeftSplit.words,  { opacity: 0 })
    if (l4RightEl)   gsap.set(l4RightEl,  { x: 30,  opacity: 0 })
    if (l4RightSplit) gsap.set(l4RightSplit.words, { opacity: 0 })
    if (l4LeftLine)  gsap.set(l4LeftLine,  { strokeDasharray: 800, strokeDashoffset: 800 })
    if (l4RightLine) gsap.set(l4RightLine, { strokeDasharray: 800, strokeDashoffset: 800 })
    if (l4LeftDot)   gsap.set(l4LeftDot,  { opacity: 0 })
    if (l4RightDot)  gsap.set(l4RightDot, { opacity: 0 })
    if (l5El)        gsap.set(l5El, { opacity: 0, x: 0, y: 0, scale: 1 })
    if (l6El)        gsap.set(l6El, { opacity: 0, scale: 1 })

    // Layer-5 strokes, grouped so each set can scale on its own clock. Each
    // circle takes its handles + anchors along so the geometry stays coherent
    // while it grows, and the gray grid lines are split the same way — the ones
    // sitting on the inner box travel with the inner circle, the outer ones and
    // the bounding box travel with the outer circle.
    const l5Inner     = l5El?.querySelectorAll('[data-oryx-circle="inner"], [data-oryx-handle^="inner"], [data-oryx-anchor^="inner"]')
    const l5InnerGray = l5El?.querySelectorAll('[data-oryx-grid-line*="inner"]')
    const l5Outer     = l5El?.querySelectorAll('[data-oryx-circle="outer"], [data-oryx-handle^="outer"], [data-oryx-anchor^="outer"]')
    const l5OuterGray = l5El?.querySelectorAll('[data-oryx-grid-line*="outer"], [data-oryx-bbox]')


    // ── Fitting the wordmark to the drawing. The strokes are the fixed thing:
    // the wordmark is resized so its O is exactly as wide as the outer circle,
    // and the drawing then only has to slide sideways onto it (k stays 1). All
    // of it is measured rather than hard-coded, because the answer moves with
    // the viewport and the font's own metrics. Canvas TextMetrics gives the
    // glyph's ink box (not its advance box, which carries side bearings), and
    // the zero-size <i> parked inside the span reports the text baseline —
    // together they pin the O's true center and diameter.
    const fit = { dx: 0, dy: 0, k: 1 }
    let fitTween: gsap.core.Tween | null = null
    let tlRef: gsap.core.Timeline | null = null

    const measureFit = () => {
      const svgEl  = l5El?.querySelector('svg')
      const wordEl = pinned.querySelector<HTMLElement>('[data-oryx-word]')
      const oEl    = pinned.querySelector<HTMLElement>('[data-oryx-word-o]')
      const baseEl = pinned.querySelector<HTMLElement>('[data-oryx-word-baseline]')
      if (!l5El || !svgEl || !wordEl || !oEl || !baseEl) return

      // Neutralize the transforms on both layers so we read where they start
      // from, not where a half-scrubbed tween currently has them — the O is
      // measured through layer 6, which shrinks at the end of the section.
      const savedL5 = l5El.style.transform
      const savedL6 = l6El?.style.transform ?? ''
      l5El.style.transform = 'none'
      if (l6El) l6El.style.transform = 'none'
      const restore = () => {
        l5El.style.transform = savedL5
        if (l6El) l6El.style.transform = savedL6
      }

      const box = svgEl.getBoundingClientRect()

      // The outer circle is already blown up to L5_SCALE_OUTER by the time the
      // move starts — that's the diameter the O has to match.
      const outerDia = box.width * L5_OUTER_DIA_RATIO * L5_SCALE_OUTER
      const cs  = getComputedStyle(oEl)
      const fs0 = parseFloat(cs.fontSize) || 0
      if (!outerDia || !fs0) return restore()

      // Ink box of the O in em units, so it holds for any font size we pick.
      // Values below are fallbacks, used only if TextMetrics is unavailable.
      let leftEm = -0.04, rightEm = 0.76, ascEm = 0.72, descEm = 0.01
      const ctx = document.createElement('canvas').getContext('2d')
      if (ctx) {
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs0}px ${cs.fontFamily}`
        // An unparseable font string is silently ignored by the canvas, which
        // would then measure 10px sans-serif — check the size actually took.
        const applied = Math.abs(parseFloat(ctx.font) - fs0) < 0.5
        const m = ctx.measureText('O')
        if (applied && Number.isFinite(m.actualBoundingBoxAscent) && Number.isFinite(m.actualBoundingBoxRight)) {
          leftEm  = m.actualBoundingBoxLeft   / fs0
          rightEm = m.actualBoundingBoxRight  / fs0
          ascEm   = m.actualBoundingBoxAscent / fs0
          descEm  = m.actualBoundingBoxDescent / fs0
        }
      }
      const diaEm = ((rightEm + leftEm) + (ascEm + descEm)) / 2

      // Size the wordmark off the circle — but never so large that ORYX runs
      // off the screen. If that cap bites, the drawing gives up the difference.
      const wordEm   = wordEl.getBoundingClientRect().width / fs0
      const maxFs    = (pinned.clientWidth * ORYX_MAX_WIDTH) / (wordEm || 3)
      const targetFs = Math.min(outerDia / diaEm, maxFs)
      wordEl.style.fontSize = `${targetFs}px`

      // Re-read the O now the wordmark has been resized under it.
      const oBox     = oEl.getBoundingClientRect()
      const baseline = baseEl.getBoundingClientRect().top

      fit.k  = (targetFs * diaEm) / outerDia   // 1 unless the width cap kicked in
      fit.dx = oBox.left + ((rightEm - leftEm) / 2) * targetFs - (box.left + box.width / 2)
      fit.dy = baseline + ((descEm - ascEm) / 2) * targetFs - (box.top + box.height / 2)

      restore()
    }

    measureFit()

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: pinned,
        scrub: 0.5,
        anticipatePin: 1,
        // Re-measure on resize/refresh and force the fit tween to re-read its
        // function-based values, so the drawing keeps landing on the O.
        onRefresh: () => {
          measureFit()
          fitTween?.invalidate()
          // Covers a reload straight into the tail, where the callback below
          // may never be crossed. The turn tween owns the value from L6_T_GONE
          // on, so this only has to settle the stretch before it.
          if (tlRef && tlRef.time() < L6_T_GONE) {
            watchBackRef.current = tlRef.time() >= L6_T_FLIP ? 1 : 0
          }
        },
      },
    })
    tlRef = tl

    // 0–40 %: fade layer-1 out. immediateRender:false so the from-vars don't
    // snap layer1 to opacity:1 the moment the timeline is built (which was
    // clobbering the entrance reveal).
    tl.fromTo(layer1,
      { opacity: 1, y: 0 },
      { opacity: 0, y: -28, duration: 0.4, ease: 'power2.inOut', stagger: 0.03, immediateRender: false },
      0
    )

    if (navHeader) {
      tl.fromTo(navHeader,
        { opacity: 1, y: 0 },
        { opacity: 0, y: -24, duration: 0.28, ease: 'power2.inOut' },
        0
      )
    }

    // 42–100 %: word by word start→end, left from bottom, right from top
    if (leftSplit?.words.length) {
      tl.fromTo(leftEl,
        { y: -85 },
        { y: 0, duration: 0.9, ease: 'power2.out' },
        0.42
      )
      tl.fromTo(leftSplit.words,
        { opacity: 0 },
        { opacity: 1, duration: 0.65, ease: 'power1.inOut', stagger: { each: 0.09, from: 'end' } },
        0.42
      )
    }
    if (rightSplit?.words.length) {
      tl.fromTo(rightEl,
        { y: 85 },
        { y: 0, duration: 0.9, ease: 'power2.out' },
        0.42
      )
      tl.fromTo(rightSplit.words,
        { opacity: 0 },
        { opacity: 1, duration: 0.65, ease: 'power1.inOut', stagger: { each: 0.09, from: 'start' } },
        0.42
      )
    }

    // Layer 2 fade out
    if (leftSplit?.words.length) {
      tl.to(leftSplit.words, { opacity: 0, duration: 0.4, stagger: { each: 0.05, from: 'start' } }, 1.55)
      tl.to(leftEl, { y: -30, duration: 0.45, ease: 'power2.in' }, 1.55)
    }
    if (rightSplit?.words.length) {
      tl.to(rightSplit.words, { opacity: 0, duration: 0.4, stagger: { each: 0.05, from: 'end' } }, 1.55)
      tl.to(rightEl, { y: 30, duration: 0.45, ease: 'power2.in' }, 1.55)
    }

    // Layer 3 fade in — synced with 3D Screen 3 (p: 0.67→1.0 = scrollY 201vh, GSAP ≈ 3.45)
    if (leftSplit3?.words.length) {
      tl.fromTo(leftEl3, { y: -85 }, { y: 0, duration: 0.9, ease: 'power2.out' }, 3.2)
      tl.fromTo(leftSplit3.words, { opacity: 0 }, { opacity: 1, duration: 0.65, ease: 'power1.inOut', stagger: { each: 0.09, from: 'end' } }, 3.2)
    }
    if (rightSplit3?.words.length) {
      tl.fromTo(rightEl3, { y: 85 }, { y: 0, duration: 0.9, ease: 'power2.out' }, 3.2)
      tl.fromTo(rightSplit3.words, { opacity: 0 }, { opacity: 1, duration: 0.65, ease: 'power1.inOut', stagger: { each: 0.09, from: 'start' } }, 3.2)
    }

    // Layer 3 fade out — before waterproof at 5.45 (3D Screen 3 ends at GSAP ≈ 5.14)
    if (leftSplit3?.words.length) {
      tl.to(leftSplit3.words, { opacity: 0, duration: 0.45, ease: 'power2.in' }, 4.7)
      tl.to(leftEl3, { y: -30, duration: 0.5, ease: 'power2.in' }, 4.7)
    }
    if (rightSplit3?.words.length) {
      tl.to(rightSplit3.words, { opacity: 0, duration: 0.45, ease: 'power2.in' }, 4.7)
      tl.to(rightEl3, { y: 30, duration: 0.5, ease: 'power2.in' }, 4.7)
    }

    // Layer 4: WATER PROOF — clip sweeps left-to-right, blur clears as it goes
    if (waterproofEl) {
      tl.fromTo(
        waterproofEl,
        { opacity: 0, filter: 'blur(50px)', x: -60 },
        { opacity: 1, filter: 'blur(0px)',  x: 0,   duration: 1.4, ease: 'power1.inOut' },
        5.45
      )
    }

    // Liquid blob: one-shot timer animation triggered when scroll passes 7.0
    // (right as the WATER PROOF text + lines reveal completes). Independent
    // of scroll speed — the blob plays from top-right → bottom-left once.
    const blobTl = gsap.timeline({ paused: true })
    if (liquidEl) {
      blobTl.fromTo(liquidEl, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
    }
    blobTl.fromTo(liquidProgressRef, { current: 0 }, { current: 1, duration: BLOB_SPEED, ease: BLOB_EASE }, 0)

    tl.call(function () {
      const dir = tl.scrollTrigger?.direction ?? 1
      if (dir > 0) {
        blobTl.restart()
      } else {
        blobTl.pause(0)
        liquidProgressRef.current = 0
        if (liquidEl) gsap.set(liquidEl, { opacity: 0 })
      }
    }, [], 7.0)

    // Ice frame: fade in alongside the blob in screen 4 (scrub-driven, reverses on scroll up)
    if (iceFrameEl) {
      tl.fromTo(
        iceFrameEl,
        { opacity: 0 },
        { opacity: 1, duration: 2.0, ease: 'sine.inOut' },
        6.6
      )
      // Outro: fade back out as the user finishes the section
      tl.to(
        iceFrameEl,
        { opacity: 0, duration: 2.0, ease: 'sine.inOut' },
        9.0
      )
    }

    // Layer 4 pointer lines + text — appear after WATER PROOF finishes (5.45 + 1.4 = 6.85)
    if (l4LeftDot)  tl.to(l4LeftDot,  { opacity: 0.9, duration: 0.05 }, 6.85)
    if (l4RightDot) tl.to(l4RightDot, { opacity: 0.9, duration: 0.05 }, 6.95)
    if (l4LeftLine)  tl.to(l4LeftLine,  { strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut' }, 6.85)
    if (l4RightLine) tl.to(l4RightLine, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut' }, 6.95)
    if (l4LeftEl)    tl.to(l4LeftEl,  { x: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }, 6.9)
    if (l4LeftSplit?.words.length) {
      tl.to(l4LeftSplit.words, { opacity: 1, duration: 0.3, ease: 'power1.inOut', stagger: { each: 0.04, from: 'start' } }, 6.94)
    }
    if (l4RightEl)   tl.to(l4RightEl, { x: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }, 7.0)
    if (l4RightSplit?.words.length) {
      tl.to(l4RightSplit.words, { opacity: 1, duration: 0.3, ease: 'power1.inOut', stagger: { each: 0.04, from: 'start' } }, 7.04)
    }

    // Layer 4 outro — headline, pointer text and lines clear as the user
    // scrolls on to the next screen (same window as the ice frame fade at 9.0)
    const L4_OUT = 9.0
    if (waterproofEl) {
      tl.to(waterproofEl, { opacity: 0, filter: 'blur(50px)', x: 60, duration: 1.4, ease: 'power1.inOut' }, L4_OUT)
    }
    // lines retract back the way they drew, dots snap out behind them
    if (l4LeftLine)  tl.to(l4LeftLine,  { strokeDashoffset: 800, duration: 0.5, ease: 'power2.inOut' }, L4_OUT)
    if (l4RightLine) tl.to(l4RightLine, { strokeDashoffset: 800, duration: 0.5, ease: 'power2.inOut' }, L4_OUT + 0.1)
    if (l4LeftDot)   tl.to(l4LeftDot,  { opacity: 0, duration: 0.05 }, L4_OUT + 0.5)
    if (l4RightDot)  tl.to(l4RightDot, { opacity: 0, duration: 0.05 }, L4_OUT + 0.6)
    if (l4LeftSplit?.words.length) {
      tl.to(l4LeftSplit.words, { opacity: 0, duration: 0.3, ease: 'power1.inOut', stagger: { each: 0.04, from: 'end' } }, L4_OUT)
    }
    if (l4LeftEl)    tl.to(l4LeftEl,  { x: -30, opacity: 0, duration: 0.5, ease: 'power2.in' }, L4_OUT)
    if (l4RightSplit?.words.length) {
      tl.to(l4RightSplit.words, { opacity: 0, duration: 0.3, ease: 'power1.inOut', stagger: { each: 0.04, from: 'end' } }, L4_OUT + 0.1)
    }
    if (l4RightEl)   tl.to(l4RightEl, { x: 30, opacity: 0, duration: 0.5, ease: 'power2.in' }, L4_OUT + 0.1)

    // ── Tail. The container is 1472vh (= 1372vh of scroll once pinned) and every
    // cue above was authored against 500vh of scroll, i.e. 45.43vh per timeline
    // unit — running the timeline to 30.2 keeps that ratio so nothing above
    // shifts. One thing at a time, in scroll terms — bar the shrink, where the
    // watch deliberately comes up underneath the wordmark:
    //   500→570vh (t 11.0→12.5): watch zooms out. Strokes still fully hidden.
    //   570→618vh (t 12.5→13.6): settle beat — lets the 0.06 scale lerp land
    //   618→682vh (t 13.6→15.0): NOW the strokes fade in, around a watch that
    //                            has already stopped moving
    //   682→709vh (t 15.0→15.6): hold, watch fitted inside the strokes
    //   709→773vh (t 15.6→17.0): watch fades out
    //   773→827vh (t 17.0→18.2): small circle + its gray lines grow and stop;
    //                            big circle edges out with them, staying clear
    //   827→900vh (t 18.2→19.8): big circle + its gray lines carry on alone
    //   900→918vh (t 19.8→20.2): beat — the finished drawing, holding
    //   918→1008vh (t 20.2→22.2): drawing slides left onto the O of ORYX while
    //                            the wordmark fades up from 0 underneath it
    //  1008→1045vh (t 22.2→23.0): the logo, resolved — holding
    //  1045→1099vh (t 23.0→24.2): construction strokes fade off
    //  1108vh      (t 24.4):      the watch switches to its caseback, unseen
    //  1081→1172vh (t 23.8→25.8): wordmark shrinks to a small centered logo…
    //  1127→1218vh (t 24.8→26.8): …with the watch fading up a beat behind it
    //  1218→1254vh (t 26.8→27.6): the lockup holds
    //  1254→1327vh (t 27.6→29.2): wordmark fades away as the watch turns round
    //                             to its face
    //  1327→1372vh (t 29.2→30.2): space — the watch, front on, holding
    if (l5El) {
      tl.fromTo(l5El, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'none' }, 13.6)
    }
    if (canvasEl) {
      tl.fromTo(canvasEl,
        { opacity: 1 },
        { opacity: 0, duration: 1.4, ease: 'power2.in', immediateRender: false },
        15.6
      )
    }
    // Strokes blow up into the empty screen the watch left behind, in two
    // phases. svgOrigin pins every scale to the drawing's center (400 400 in the
    // 800 viewBox) so the rings stay concentric instead of each drifting off its
    // own bbox. Scrubbed and linear, so it tracks the wheel both ways.
    const GROW = { ease: 'none', immediateRender: false, svgOrigin: '400 400' } as const

    // Phase 1 (17.0→18.2) — the small circle grows and stops there, holding that
    // size for the rest of the section. The big circle rides along on the same
    // clock, just far enough to stay outside it, so the small one is never seen
    // crossing the ring that's supposed to contain it.
    if (l5Inner?.length) {
      tl.fromTo(l5Inner, { scale: 1 }, { scale: L5_SCALE_INNER, duration: 1.0, ...GROW }, L5_T_INNER)
    }
    if (l5Outer?.length) {
      tl.fromTo(l5Outer, { scale: 1 }, { scale: L5_SCALE_OUTER_LEAD, duration: 1.0, ...GROW }, L5_T_INNER)
    }
    if (l5InnerGray?.length) {
      tl.fromTo(l5InnerGray, { scale: 1 }, { scale: L5_SCALE_INNER, duration: 1.0, ...GROW }, L5_T_INNER + L5_SCALE_DELAY)
    }
    if (l5OuterGray?.length) {
      tl.fromTo(l5OuterGray, { scale: 1 }, { scale: L5_SCALE_OUTER_LEAD, duration: 1.0, ...GROW }, L5_T_INNER + L5_SCALE_DELAY)
    }

    // Phase 2 (18.2→19.8) — big circle alone now, picking up from its lead size
    // and pulling well away from the stopped inner one.
    if (l5Outer?.length) {
      tl.fromTo(l5Outer, { scale: L5_SCALE_OUTER_LEAD }, { scale: L5_SCALE_OUTER, duration: 1.4, ...GROW }, L5_T_OUTER)
    }
    if (l5OuterGray?.length) {
      tl.fromTo(l5OuterGray, { scale: L5_SCALE_OUTER_LEAD }, { scale: L5_SCALE_OUTER, duration: 1.4, ...GROW }, L5_T_OUTER + L5_SCALE_DELAY)
    }

    // Phase 3 (20.2→21.8) — the payoff. The wordmark fades in from nothing while
    // the whole drawing slides onto its O, arriving just before the fade
    // completes. The O has already been sized to the circle by measureFit, so
    // scale normally stays at 1 and this is a pure translation. x/y/scale are
    // function-based so a refresh picks up freshly measured values instead of
    // drifting off the glyph.
    if (l6El) {
      tl.fromTo(l6El,
        { opacity: 0 },
        { opacity: 1, duration: L6_DUR * 0.85, ease: 'none', immediateRender: false },
        L6_T
      )
    }
    if (l5El) {
      // Built standalone (rather than via tl.fromTo, which returns the timeline)
      // so onRefresh has a handle to invalidate. immediateRender:false keeps it
      // from rendering on the root before tl.add adopts it.
      fitTween = gsap.fromTo(l5El,
        { x: 0, y: 0, scale: 1 },
        {
          x: () => fit.dx,
          y: () => fit.dy,
          scale: () => fit.k,
          duration: L6_DUR,
          ease: 'power2.inOut',
          immediateRender: false,
        }
      )
      tl.add(fitTween, L6_T)
    }

    // Phase 4 (23.0→25.8) — the construction drawing has served its purpose, so
    // it fades off and the wordmark drops back to a small centered logo. The
    // shrink starts a beat late so the strokes are already clearing when the
    // letters start to move, rather than both going at once.
    if (l5El) {
      tl.fromTo(l5El,
        { opacity: 1 },
        { opacity: 0, duration: L6_OUT_DUR, ease: 'power2.inOut', immediateRender: false },
        L6_T_OUT
      )
    }
    if (l6El) {
      tl.fromTo(l6El,
        { scale: 1 },
        // Linear, and so is the watch fade below — same window, same rate, so
        // the two visibly move together instead of one front-loading.
        { scale: ORYX_SMALL, duration: L6_SHRINK_DUR, ease: 'none', immediateRender: false },
        L6_T_OUT + L6_SHRINK_LAG
      )
    }
    // …brightening as it goes: gray reads as a backdrop at full size, white as
    // engraving once it is small and sitting on the caseback.
    if (wordEl) {
      tl.fromTo(wordEl,
        { color: ORYX_GRAY },
        { color: ORYX_WHITE, duration: L6_SHRINK_DUR, ease: 'none', immediateRender: false },
        L6_T_OUT + L6_SHRINK_LAG
      )
    }

    // The watch turns its back here — a straight switch of the rotation useFrame
    // targets, thrown 0.4 units (≈18vh) before the fade below starts and undone
    // on the way back up, both while the canvas is still at a hard 0.
    tl.call(function () {
      watchBackRef.current = (tl.scrollTrigger?.direction ?? 1) > 0 ? 1 : 0
    }, [], L6_T_FLIP)

    // Phase 5 (23.8→25.8) — the watch comes back, reversed, on exactly the same
    // window as the shrink above: the caseback rises under the wordmark as the
    // wordmark settles onto it. Because the switch already happened off screen,
    // it never plays a turn as it arrives.
    if (canvasEl) {
      tl.fromTo(canvasEl,
        { opacity: 0 },
        { opacity: 1, duration: L6_WATCH_DUR, ease: 'none', immediateRender: false },
        L6_T_WATCH
      )
    }

    // Phase 6 (26.6→28.2) — the wordmark goes and the watch turns round to its
    // face on the same window and the same ease, so the letters are dissolving
    // exactly as the caseback swings away. Scrubbed, so the turn tracks the
    // wheel both ways.
    if (l6El) {
      tl.fromTo(l6El,
        { opacity: 1 },
        { opacity: 0, duration: L6_GONE_DUR, ease: 'power2.inOut', immediateRender: false },
        L6_T_GONE
      )
    }
    tl.fromTo(watchBackRef,
      { current: 1 },
      { current: 0, duration: L6_GONE_DUR, ease: 'power2.inOut', immediateRender: false },
      L6_T_GONE
    )

    // Breathing room on the watch face before the section hands off, and it's
    // what pins the timeline length at 29.2.
    tl.to({}, { duration: L6_END_HOLD }, L6_T_GONE + L6_GONE_DUR)

    // The first measurement can land before the wordmark's webfont is swapped
    // in, which would leave the drawing fitted to fallback metrics. One refresh
    // once fonts settle re-runs measureFit through onRefresh.
    let disposed = false
    document.fonts?.ready.then(() => {
      if (!disposed) ScrollTrigger.refresh()
    })

    return () => {
      disposed = true
      ScrollTrigger.getAll().forEach(st => st.kill())
      blobTl.kill()
      leftSplit?.revert()
      rightSplit?.revert()
      leftSplit3?.revert()
      rightSplit3?.revert()
      l4LeftSplit?.revert()
      l4RightSplit?.revert()
    }
  }, { scope: containerRef, dependencies: [done] })

  return (

    

    /* Outer container — gives scroll room for the pin */
    <div ref={containerRef} style={{ minHeight: '1472vh', background: '#111' }}>

      {/* 100 vh pinned panel */}
      <div
        ref={pinnedRef}
        className="w-full text-white"
        style={{ height: '100vh', position: 'relative', overflow: 'hidden', background: '#111' }}
      >

        {/* ── Layer 4 ice frame background — fades in with the blob in screen 4 ── */}
        <div
          data-l4-iceframe
          className="absolute inset-0"
          style={{ zIndex: 0, opacity: 0, pointerEvents: 'none' }}
        >
          <IceFrameBackground height="100%" />
        </div>

        {/* ── Canvas layer — fades out on the final screen, leaving the strokes ── */}
        <div
          data-canvas
          className="absolute inset-0"
          style={{ zIndex: 1 }}
        >
          <div
            className="w-full h-full grid"
            style={{ gridTemplateColumns: '300px 1fr 300px', maxWidth: '2200px', margin: '0 auto' }}
          >
            <div />
            <div className="relative">
              <Canvas
                shadows
                camera={{ position: [0, 1.2, -6.6], fov: 38 }}
                dpr={[1, 2]}
                gl={{
                  toneMapping: THREE.ACESFilmicToneMapping,
                  toneMappingExposure: 1.0,
                  antialias: true,
                }}
                style={{ background: 'transparent', position: 'absolute', inset: 0 }}
              >
                <Suspense fallback={null}>
                  <pointLight position={[2, 2, 1]} intensity={60} color="#ffffff" decay={1} />
                  <rectAreaLight position={[0, 0, 5]} rotation={[0, Math.PI, 0]} width={40} height={40} intensity={20} color="#ffffff" />
                  <rectAreaLight position={[5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} width={20} height={20} intensity={3} color="#ffffff" />
                  <rectAreaLight position={[-5, 0, 0]} rotation={[0, Math.PI / 2, 0]} width={20} height={20} intensity={3} color="#ffffff" />
                  <rectAreaLight position={[0, -5, 0]} rotation={[Math.PI / 2, 0, 0]} width={20} height={20} intensity={1} color="#ffffff" />
                  <pointLight position={[0, 0, -5]} intensity={90} color="#ffffff" decay={1} />
                  <ambientLight intensity={0.02} />
                  <MouseFollowModel mouseRef={mouseRef} backRef={watchBackRef} />
                  <ContactShadows position={[0, -1.8, 0]} opacity={0.7} scale={8} blur={2.5} far={3} />
                </Suspense>
              </Canvas>
            </div>
            <div />
          </div>
        </div>

        {/* ── Layer 1: first-screen UI ── */}
        <div
          className="absolute inset-0"
          style={{ zIndex: 10, pointerEvents: 'none' }}
        >
          <div
            className="max-w-[2200px] mx-auto w-full h-full grid"
            style={{ gridTemplateRows: '1fr auto' }}
          >
            {/* Three-column content row */}
            <div className="grid" style={{ gridTemplateColumns: '300px 1fr 300px' }}>

              {/* Left column */}
              <div className="flex flex-col justify-between px-12 py-14" style={{ pointerEvents: 'auto' }}>
                <div className="space-y-7">
                  <p data-ani data-layer1 className="font-mono text-[12px] tracking-[0.3em] text-white/40 uppercase">
                    ABSOLUTE GRIT
                  </p>
                  <h2 data-ani data-layer1 className="font-mono text-3xl font-bold tracking-wide uppercase leading-[1.1]">
                    SURVIVAL<br />EVOLVED.
                  </h2>
                  <button data-ani data-layer1 className="mt-2 px-7 py-3 border border-white/25 font-mono text-[12px] tracking-[0.25em] uppercase hover:border-white/50 transition-colors">
                    PRE ORDER
                  </button>
                </div>

                <div data-ani data-layer1 className="flex items-start gap-3">
                  <CrosshairIcon size={24} className="text-white/40 mt-0.5 shrink-0" />
                  <span className="font-mono text-[12px] tracking-[0.2em] text-white/40 uppercase leading-relaxed">
                    ADAPTIVE<br />SURVIVAL UI
                  </span>
                </div>
              </div>

              {/* Center — Canvas sits behind */}
              <div />

              {/* Right column */}
              <div className="flex flex-col justify-between items-end px-12 py-14" style={{ pointerEvents: 'auto' }}>
                <div data-ani data-layer1 className="border border-white/20 p-7 w-60">
                  <p className="font-mono text-[12px] tracking-[0.25em] text-white/50 uppercase mb-5">BPM</p>
                  <div className="flex justify-center py-4">
                    <PixelGridIcon size={52} className="text-white/60" />
                  </div>
                  <p className="font-mono text-[12px] tracking-[0.2em] text-white/30 uppercase mt-5">
                    LIFE FUNCTION
                  </p>
                </div>

                <p data-ani data-layer1 className="font-mono text-[12px] tracking-[0.2em] text-white/35 uppercase leading-relaxed text-right">
                  A TACTICAL<br />COMPANION
                </p>
              </div>
            </div>

            {/* Bottom strip */}
            <div className="relative flex items-end justify-end px-8 pb-12 overflow-hidden" style={{ minHeight: '250px' }}>
              <span
                data-layer1
                className="absolute left-1/2 -translate-x-1/2 bottom-[-70px] z-10"
                style={{ fontSize: 'clamp(52px, 9vw, 150px)' }}
              >
                <SplitText
                  text="ORYX"
                  tag="span"
                  className={`${pixelFont.className} text-white leading-none select-none`}
                  splitType="chars"
                  from={{ y: 120, opacity: 0 }}
                  to={{ y: 0, opacity: 1 }}
                  scrub={false}
                  delay={111}
                  duration={1}
                  startDelay={1.4}
                  threshold={0.05}
                  rootMargin="0px"
                  textAlign="center"
                />
              </span>

              <p data-ani data-layer1 className="font-mono text-[11px] tracking-widest text-white/30 uppercase leading-relaxed text-right max-w-[280px] relative z-10 mb-1">
                OUR DIGITAL SIXTH SENSE<br />
                &amp; WORLD&apos;S FIRST AI-DRIVEN<br />
                SURVIVAL TERMINAL. BUILT<br />
                FOR THOSE WHO GO WHERE<br />
                MAPS WON&apos;T.
              </p>
            </div>
          </div>
        </div>

        {/* ── Layer 2: second-screen text ── */}
        <div
          className="absolute inset-0 flex items-center"
          style={{ zIndex: 10, pointerEvents: 'none' }}
        >
          {/* Left: "ISN'T JUST A WATCH." */}
          <div
            className="absolute"
            style={{ left: 'clamp(40px, 6vw, 120px)' }}
          >
            <h2
              data-l2-left
              className={`${condensedFont.className} uppercase text-white`}
              style={{
                fontSize: 'clamp(44px, 6.2vw, 106px)',
                lineHeight: 0.92,
                letterSpacing: '0.02em',
                opacity: 0,
              }}
            >
              ISN&apos;T JUST<br />A WATCH.
            </h2>
          </div>

          {/* Right: "OUR DIGITAL SIXTH SENSE" — sits just right of the watch */}
          <div
            className="absolute"
            style={{
              left: 'clamp(200px, 70%, 2200px)',
              maxWidth: 'clamp(160px, 18vw, 1300px)',
            }}
          >
            <h2
              data-l2-right
              className={`${condensedFont.className} uppercase text-white`}
              style={{
                fontSize: 'clamp(15px, 1.9vw, 38px)',
                lineHeight: 1.0,
                letterSpacing: '0.03em',
                opacity: 0,
              }}
            >
              OURDIGITALSIXTHSENSE.READSYOUR PULSE.TRACKSYOUR TERRAINKNOWSYOUR LIMITS.
            </h2>
          </div>
        </div>

        {/* ── Layer 4 liquid blob — only visible during the WATER PROOF section ── */}
        <div
          data-l4-liquid
          className="absolute inset-0"
          style={{ zIndex: 20, pointerEvents: 'none', opacity: 0 }}
        >
          <LiquidGlass
            config={BLOB_CONFIG}
            progressRef={liquidProgressRef}
          />
        </div>

        {/* ── Layer 4: WATER PROOF — screen 4 top-center ── */}
        <div
          className="absolute inset-0 flex justify-center z-1"
          style={{ zIndex: 0, pointerEvents: 'none', paddingTop: 'clamp(36px, 5vh, 72px)' }}
        >
          {/* wrapper carries the clip+blur so padding gives the blur room to bleed */}
          <div
            data-l4-waterproof
            style={{ padding: '3rem 8rem', willChange: 'filter', opacity: 0 }}
          >
            <h2
              className={`${condensedFont.className} uppercase text-white`}
              style={{
                fontSize: 'clamp(44px, 6.8vw, 160px)',
                lineHeight: 1,
                letterSpacing: '0.08em',
                WebkitTextStroke: '5px white',
              }}
            >
              WATER PROOF
            </h2>
          </div>
        </div>

        {/* ── Layer 4 pointer lines + text ── */}
        <div className="absolute inset-0" style={{ zIndex: 5, pointerEvents: 'none' }}>

          {/* Left text */}
          <div
            className="absolute"
            style={{
              left: 'clamp(24px, 7vw, 120px)',
              top: '20%',
              maxWidth: 'clamp(140px, 16vw, 1260px)',
            }}
          >
            <p
              data-l4-left
              style={{
                fontSize: 'clamp(11px, 0.95vw, 19px)',
                lineHeight: 1.5,
                fontFamily: 'var(--font-lama), system-ui, Arial, sans-serif',
                fontWeight: 700,
                color: '#fff',
                margin: 0,
                opacity: 0,
              }}
            >
              Premium waterproof performance wrapped in a bold design made for every moment.
            </p>
          </div>

          {/* Right text */}
          <div
            className="absolute"
            style={{
              right: 'clamp(24px, 4vw, 80px)',
              bottom: '27%',
              maxWidth: 'clamp(160px, 19vw, 1300px)',
            }}
          >
            <p
              data-l4-right
              style={{
                fontSize: 'clamp(12px, 1.3vw, 22px)',
                lineHeight: 1.35,
                fontFamily: 'var(--font-lama), system-ui, Arial, sans-serif',
                fontWeight: 700,
                color: '#fff',
                margin: 0,
                opacity: 0,
              }}
            >
              Built to survive every splash, storm, and adventure — your time never stops.
            </p>
          </div>

          {/* SVG pointer lines + dots */}
          <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
            {/* Left: dot at watch, line draws toward text */}
            <circle data-l4-dot-left  cx="38%" cy="38%" r="3" fill="white" opacity="0" />
            <line
              data-l4-line-left
              x1="38%" y1="38%"
              x2="20%" y2="26%"
              stroke="white" strokeWidth="1" strokeOpacity="0.65"
              strokeDasharray="800" strokeDashoffset="800"
            />

            {/* Right: dot at watch, line draws toward text */}
            <circle data-l4-dot-right cx="62%" cy="55%" r="3" fill="white" opacity="0" />
            <line
              data-l4-line-right
              x1="62%" y1="55%"
              x2="76%" y2="69%"
              stroke="white" strokeWidth="1" strokeOpacity="0.65"
              strokeDasharray="800" strokeDashoffset="800"
            />
          </svg>
        </div>

        {/* ── Layer 3: third-screen text ── */}
        <div
          className="absolute inset-0 flex items-center"
          style={{ zIndex: 10, pointerEvents: 'none' }}
        >
          <div
            className="absolute"
            style={{ left: 'clamp(40px, 6vw, 120px)' }}
          >
            <h2
              data-l3-left
              className={`${condensedFont.className} uppercase text-white`}
              style={{
                fontSize: 'clamp(44px, 6.2vw, 106px)',
                lineHeight: 0.92,
                letterSpacing: '0.02em',
                opacity: 0,
              }}
            >
              BUILT FOR<br />THE WILD.
            </h2>
          </div>

          <div
            className="absolute"
            style={{
              left: 'clamp(200px, 70%, 2200px)',
              maxWidth: 'clamp(160px, 18vw, 1300px)',
            }}
          >
            <h2
              data-l3-right
              className={`${condensedFont.className} uppercase text-white`}
              style={{
                fontSize: 'clamp(15px, 1.9vw, 38px)',
                lineHeight: 1.0,
                letterSpacing: '0.03em',
                opacity: 0,
              }}
            >
              PRECISION NAVIGATION. REAL-TIME TERRAIN ANALYSIS. WHERE MAPS END WE BEGIN.
            </h2>
          </div>
        </div>

        {/* ── Layer 6: the ORYX wordmark the drawing resolves onto. Fades 0→100
            as the drawing travels to its O. Sits under layer 5 so the strokes
            read on top of the letters, and over the canvas so the wordmark
            lands on the watch's caseback at the very end. ── */}
        <div
          data-l6
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 25, pointerEvents: 'none', opacity: 0 }}
        >
          <h2
            data-oryx-word
            className={wordmarkFont.className}
            style={{
              margin: 0,
              fontSize: ORYX_WORDMARK_SIZE,
              lineHeight: 1,
              letterSpacing: 0,
              whiteSpace: 'nowrap',
              color: ORYX_GRAY,
            }}
          >
            {/* The O is measured at runtime — it carries a zero-size <i> whose
                top edge sits on the text baseline, which is what lets
                measureFit() locate the glyph's ink box exactly. */}
            <span data-oryx-word-o>
              O<i data-oryx-word-baseline style={{ display: 'inline-block', width: 0, height: 0 }} />
            </span>
            RYX
          </h2>
        </div>

        {/* ── Layer 5: outline strokes framing the watch. Last on the stack so
            it sits on top of every earlier screen. Fades 0→100 across the
            final 100vh, in step with the watch's zoom-out. ── */}
        <div
          data-l5
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 30, pointerEvents: 'none', opacity: 0 }}
        >
          <OryxLogo size={L5_LOGO_SIZE} />
        </div>

      </div>
    </div>
  )
}
