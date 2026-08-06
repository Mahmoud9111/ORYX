'use client'

import dynamic from 'next/dynamic'
import Nav from '../components/Nav'
import OryxLogo from '../components/OryxLogo'
const OrySection = dynamic(() => import('../components/OrySection'), { ssr: false })

export default function Home() {
  return (
    <main className="bg-black flex flex-col">
      <Nav />
      <OrySection />
      <section className="w-full h-screen flex items-center justify-center bg-[#111]">
        <OryxLogo size={460} />
      </section>
    </main>
  )
}
