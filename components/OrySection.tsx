'use client'

import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { Press_Start_2P, Bebas_Neue } from 'next/font/google'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'
import Ory from './models/Ory'
import { useLoader } from '@/contexts/LoaderContext'
import SplitText from './SplitText/SplitText'
import LiquidGlass, { type LiquidGlassConfig } from './LiquidGlass'
import IceFrameBackground from './IceFrameBackground'


gsap.registerPlugin(ScrollTrigger, GSAPSplitText)
RectAreaLightUniformsLib.init()

const pixelFont = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })
const condensedFont = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap' })

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

type MousePos = { x: number; y: number }

function MouseFollowModel({ mouseRef }: { mouseRef: React.RefObject<MousePos> }) {
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

    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, finalY, 0.08)
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, finalX, 0.08)
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, s4Scale, 0.06))
  })

  return (
    <group ref={groupRef}>
      <Ory scale={1.0} position={[0, 0, 0]}/>
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


    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: pinned,
        scrub: 0.5,
        anticipatePin: 1,
      },
    })

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
        { y: 0, duration: 0.5, ease: 'power2.out' },
        0.42
      )
      tl.fromTo(leftSplit.words,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power1.inOut', stagger: { each: 0.05, from: 'end' } },
        0.42
      )
    }
    if (rightSplit?.words.length) {
      tl.fromTo(rightEl,
        { y: 85 },
        { y: 0, duration: 0.5, ease: 'power2.out' },
        0.42
      )
      tl.fromTo(rightSplit.words,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power1.inOut', stagger: { each: 0.05, from: 'start' } },
        0.42
      )
    }

    // Layer 2 fade out
    if (leftSplit?.words.length) {
      tl.to(leftSplit.words, { opacity: 0, duration: 0.2, stagger: { each: 0.03, from: 'start' } }, 1.05)
      tl.to(leftEl, { y: -30, duration: 0.25, ease: 'power2.in' }, 1.05)
    }
    if (rightSplit?.words.length) {
      tl.to(rightSplit.words, { opacity: 0, duration: 0.2, stagger: { each: 0.03, from: 'end' } }, 1.05)
      tl.to(rightEl, { y: 30, duration: 0.25, ease: 'power2.in' }, 1.05)
    }

    // Layer 3 fade in — synced with 3D Screen 3 (p: 0.67→1.0 = scrollY 201vh, GSAP ≈ 3.45)
    if (leftSplit3?.words.length) {
      tl.fromTo(leftEl3, { y: -85 }, { y: 0, duration: 0.5, ease: 'power2.out' }, 3.45)
      tl.fromTo(leftSplit3.words, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.inOut', stagger: { each: 0.05, from: 'end' } }, 3.45)
    }
    if (rightSplit3?.words.length) {
      tl.fromTo(rightEl3, { y: 85 }, { y: 0, duration: 0.5, ease: 'power2.out' }, 3.45)
      tl.fromTo(rightSplit3.words, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.inOut', stagger: { each: 0.05, from: 'start' } }, 3.45)
    }

    // Layer 3 fade out — before waterproof at 5.45 (3D Screen 3 ends at GSAP ≈ 5.14)
    if (leftSplit3?.words.length) {
      tl.to(leftSplit3.words, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 4.9)
      tl.to(leftEl3, { y: -30, duration: 0.3, ease: 'power2.in' }, 4.9)
    }
    if (rightSplit3?.words.length) {
      tl.to(rightSplit3.words, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 4.9)
      tl.to(rightEl3, { y: 30, duration: 0.3, ease: 'power2.in' }, 4.9)
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
        { opacity: 1, duration: 0.6, ease: 'power2.out' },
        7.0
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

    return () => {
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
    <div ref={containerRef} style={{ minHeight: '600vh', background: '#111' }}>

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

        {/* ── Canvas layer (always visible) ── */}
        <div
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
                  <MouseFollowModel mouseRef={mouseRef} />
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
                  <p data-ani data-layer1 className="font-mono text-[14px] tracking-[0.3em] text-white/40 uppercase">
                    ABSOLUTE GRIT
                  </p>
                  <h2 data-ani data-layer1 className="font-mono text-5xl font-bold tracking-wide uppercase leading-[1.1]">
                    SURVIVAL<br />EVOLVED.
                  </h2>
                  <button data-ani data-layer1 className="mt-2 px-7 py-3 border border-white/25 font-mono text-[14px] tracking-[0.25em] uppercase hover:border-white/50 transition-colors">
                    PRE ORDER
                  </button>
                </div>

                <div data-ani data-layer1 className="flex items-start gap-3">
                  <CrosshairIcon size={24} className="text-white/40 mt-0.5 shrink-0" />
                  <span className="font-mono text-[14px] tracking-[0.2em] text-white/40 uppercase leading-relaxed">
                    ADAPTIVE<br />SURVIVAL UI
                  </span>
                </div>
              </div>

              {/* Center — Canvas sits behind */}
              <div />

              {/* Right column */}
              <div className="flex flex-col justify-between items-end px-12 py-14" style={{ pointerEvents: 'auto' }}>
                <div data-ani data-layer1 className="border border-white/20 p-7 w-60">
                  <p className="font-mono text-[14px] tracking-[0.25em] text-white/50 uppercase mb-5">BPM</p>
                  <div className="flex justify-center py-4">
                    <PixelGridIcon size={52} className="text-white/60" />
                  </div>
                  <p className="font-mono text-[14px] tracking-[0.2em] text-white/30 uppercase mt-5">
                    LIFE FUNCTION
                  </p>
                </div>

                <p data-ani data-layer1 className="font-mono text-[14px] tracking-[0.2em] text-white/35 uppercase leading-relaxed text-right">
                  A TACTICAL<br />COMPANION
                </p>
              </div>
            </div>

            {/* Bottom strip */}
            <div className="relative flex items-end justify-end px-8 pb-12 overflow-hidden" style={{ minHeight: '250px' }}>
              <span
                data-layer1
                className="absolute left-1/2 -translate-x-1/2 bottom-[-70px] z-10"
                style={{ fontSize: 'clamp(72px, 13vw, 220px)' }}
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

              <p data-ani data-layer1 className="font-mono text-[13px] tracking-widest text-white/30 uppercase leading-relaxed text-right max-w-[280px] relative z-10 mb-1">
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
                fontSize: 'clamp(72px, 10vw, 172px)',
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
                fontSize: 'clamp(22px, 2.8vw, 58px)',
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
                fontSize: 'clamp(72px, 11vw, 260px)',
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
                fontSize: 'clamp(12px, 1.15vw, 24px)',
                lineHeight: 1.5,
                fontFamily: 'system-ui, Arial, sans-serif',
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
                fontSize: 'clamp(14px, 1.6vw, 28px)',
                lineHeight: 1.35,
                fontFamily: 'system-ui, Arial, sans-serif',
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
                fontSize: 'clamp(72px, 10vw, 172px)',
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
                fontSize: 'clamp(22px, 2.8vw, 58px)',
                lineHeight: 1.0,
                letterSpacing: '0.03em',
                opacity: 0,
              }}
            >
              PRECISION NAVIGATION. REAL-TIME TERRAIN ANALYSIS. WHERE MAPS END WE BEGIN.
            </h2>
          </div>
        </div>

      </div>
    </div>
  )
}
