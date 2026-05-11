'use client'

import { useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Press_Start_2P } from 'next/font/google'
import gsap from 'gsap'
import { useLoader } from '@/contexts/LoaderContext'

const pixelFont = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

export default function AppLoader() {
  const overlayRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const firstRun = useRef(true)
  const { setDone } = useLoader()

  useEffect(() => {
    const overlay = overlayRef.current
    const bar = barRef.current
    if (!overlay || !bar) return

    if (firstRun.current) {
      firstRun.current = false
      gsap.timeline()
        .fromTo(bar, { width: '0%' }, { width: '100%', duration: 1.5, ease: 'power1.inOut' })
        .to(overlay, { opacity: 0, duration: 0.5, ease: 'power2.inOut' })
        .set(overlay, { display: 'none' })
        .call(() => setDone(true))
      return
    }

    // Route change — quick flash
    setDone(false)
    gsap.set(overlay, { display: 'flex', opacity: 1 })
    gsap.set(bar, { width: '0%' })
    gsap.timeline()
      .to(bar, { width: '100%', duration: 0.6, ease: 'power2.out' })
      .to(overlay, { opacity: 0, duration: 0.3, ease: 'power2.inOut' })
      .set(overlay, { display: 'none' })
      .call(() => setDone(true))
  }, [pathname, setDone])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-9999 bg-black flex flex-col items-center justify-center gap-6 pointer-events-none"
    >
      <span
        className={`${pixelFont.className} text-white/90`}
        style={{ fontSize: 'clamp(18px, 2.5vw, 32px)', letterSpacing: '0.15em' }}
      >
        ORYX
      </span>
      <div className="w-44 h-px bg-white/10 overflow-hidden">
        <div ref={barRef} className="h-full bg-white/50" style={{ width: '0%' }} />
      </div>
      <span className="font-mono text-[11px] tracking-[0.45em] text-white/30 uppercase">
        INITIALIZING
      </span>
    </div>
  )
}
