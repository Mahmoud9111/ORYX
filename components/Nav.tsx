'use client'

import { useRef, useState, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

gsap.registerPlugin(useGSAP)

const LINKS = ['THE GEAR', 'BACKTRACK', 'SURVIVAL MODE'] as const

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

export default function Nav() {
  const navRef    = useRef<HTMLElement>(null)
  const iconRef   = useRef<HTMLDivElement>(null)
  const linksRef  = useRef<HTMLDivElement>(null)
  const ctaRef    = useRef<HTMLAnchorElement>(null)

  const [hovered, setHovered]   = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const mobileMenuRef           = useRef<HTMLDivElement>(null)

  // Entrance animation
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(navRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75 })
      .fromTo(iconRef.current, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4 }, '-=0.3')
      .fromTo(
        linksRef.current ? Array.from(linksRef.current.children) : [],
        { y: -10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.09 },
        '-=0.25'
      )
      .fromTo(ctaRef.current, { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 0.4 }, '-=0.2')
  }, [])

  // Mobile menu animation
  useEffect(() => {
    if (!mobileMenuRef.current) return
    if (menuOpen) {
      gsap.fromTo(mobileMenuRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.4, ease: 'power3.out' }
      )
      gsap.fromTo(
        Array.from(mobileMenuRef.current.querySelectorAll('a')),
        { x: -16, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, stagger: 0.07, ease: 'power2.out', delay: 0.1 }
      )
    } else {
      gsap.to(mobileMenuRef.current, { height: 0, opacity: 0, duration: 0.25, ease: 'power3.in' })
    }
  }, [menuOpen])

  const onCtaEnter = () => gsap.to(ctaRef.current, { scale: 1.05, duration: 0.2, ease: 'power2.out' })
  const onCtaLeave = () => gsap.to(ctaRef.current, { scale: 1,    duration: 0.2, ease: 'power2.in'  })

  return (
    <header className="w-full fixed top-0 left-0 right-0 z-50 text-white">
      {/* ── Nav bar ── */}
      <nav
        ref={navRef}
        className="relative max-w-4xl mx-auto w-full flex items-center gap-6 px-6 md:px-10 py-4 rounded-4xl bg-neutral-900 mt-5"
        style={{ opacity: 0 }}
      >
        {/* Left: pixel-grid icon */}
        <div ref={iconRef} style={{ opacity: 0 }}>
          <PixelGridIcon size={22} className="text-white/80 shrink-0" />
        </div>

        {/* Center: links */}
        <div ref={linksRef} className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
          {LINKS.map(label => (
            <a
              key={label}
              href="#"
              onMouseEnter={() => setHovered(label)}
              onMouseLeave={() => setHovered(null)}
              className="relative font-mono text-[10px] tracking-[0.18em] uppercase transition-colors duration-200 whitespace-nowrap"
              style={{ color: hovered === label ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}
            >
              {label}
              <span
                className="absolute -bottom-px left-0 h-px bg-orange-400 transition-all duration-300 origin-left"
                style={{ width: hovered === label ? '100%' : '0%' }}
              />
            </a>
          ))}
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 md:hidden" />

        {/* Right: PRE ORDER + mobile hamburger */}
        <div className="flex items-center gap-4 ml-auto">
          {/* PRE ORDER — glowing orange button */}
          <a
            ref={ctaRef}
            href="#"
            onMouseEnter={onCtaEnter}
            onMouseLeave={onCtaLeave}
            className="hidden md:inline-block font-mono text-[10px] tracking-[0.18em] uppercase
                       text-orange-100 px-5 py-2
                       bg-orange-500/25 border border-orange-400/50
                       transition-colors duration-200 hover:bg-orange-500/40"
            style={{
              opacity: 0,
              boxShadow: '0 0 18px 3px rgba(251,146,60,0.35), inset 0 0 10px 0px rgba(251,146,60,0.15)',
            }}
          >
            PRE ORDER
          </a>

          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden flex flex-col justify-center gap-[5px] w-6 h-6"
            aria-label="Toggle menu"
          >
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="block h-px bg-white/60 transition-all duration-300"
                style={{
                  width: i === 1 ? (menuOpen ? '0%' : '100%') : '100%',
                  transform: menuOpen
                    ? i === 0 ? 'translateY(6px) rotate(45deg)'
                    : i === 2 ? 'translateY(-6px) rotate(-45deg)'
                    : 'none'
                    : 'none',
                }}
              />
            ))}
          </button>
        </div>
      </nav>



      {/* Mobile dropdown */}
      <div
        ref={mobileMenuRef}
        className="md:hidden overflow-hidden border-b border-white/10"
        style={{ height: 0, opacity: 0 }}
      >
        <div className="flex flex-col gap-1 px-6 py-4">
          {LINKS.map(label => (
            <a
              key={label}
              href="#"
              className="font-mono text-[10px] tracking-[0.2em] text-white/45 hover:text-white/80 uppercase py-2 transition-colors"
            >
              {label}
            </a>
          ))}
          <a
            href="#"
            className="mt-3 font-mono text-[10px] tracking-[0.18em] text-orange-100 px-5 py-2.5
                       bg-orange-500/25 border border-orange-400/50 uppercase text-center"
            style={{ boxShadow: '0 0 16px 2px rgba(251,146,60,0.3)' }}
          >
            PRE ORDER
          </a>
        </div>
      </div>
    </header>
  )
}
