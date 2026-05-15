'use client'

import { CSSProperties, ReactNode } from 'react'

type Props = {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  height?: string | number
}

export default function IceFrameBackground({
  children,
  className,
  style,
  height = '100vh',
}: Props) {
  return (
    <div
      className={className}
      style={{
        height,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <style>{`
        @keyframes iceShimmer {
          0%, 100% { filter: brightness(0.95) saturate(1.1); opacity: 0.92; }
          50%      { filter: brightness(1.25) saturate(1.25); opacity: 1; }
        }
      `}</style>

      <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: 'none' }}>
        {/* Left */}
        <div className="absolute" style={{
          top: 0, left: 0, bottom: 0, width: '2px',
          background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.7) 100%)',
          boxShadow: '0 0 32px 16px rgba(255,255,255,0.9), 10px 0 160px 80px rgba(255,255,255,0.45)',
          animation: 'iceShimmer 2.4s ease-in-out infinite',
        }} />

        {/* Right */}
        <div className="absolute" style={{
          top: 0, right: 0, bottom: 0, width: '2px',
          background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.92) 50%, rgba(255,255,255,0.78) 100%)',
          boxShadow: '0 0 38px 18px rgba(255,255,255,1), -10px 0 180px 70px rgba(255,255,255,0.55)',
          animation: 'iceShimmer 2.7s ease-in-out infinite 0.35s',
        }} />

        {/* Bottom */}
        <div className="absolute" style={{
          bottom: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.85) 100%)',
          boxShadow: '0 0 32px 16px rgba(255,255,255,0.95), 0 -10px 170px 60px rgba(255,255,255,0.48)',
          animation: 'iceShimmer 2.2s ease-in-out infinite 0.15s',
        }} />

        {/* Top */}
        <div className="absolute" style={{
          top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.85) 100%)',
          boxShadow: '0 0 30px 14px rgba(255,255,255,0.95), 0 10px 150px 55px rgba(255,255,255,0.40)',
          animation: 'iceShimmer 2.5s ease-in-out infinite 0.6s',
        }} />
      </div>

      {children}
    </div>
  )
}
