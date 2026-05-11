'use client'

import dynamic from 'next/dynamic'
import Nav from '../components/Nav'

const OrySection = dynamic(() => import('../components/OrySection'), { ssr: false })

export default function Home() {
  return (
    <main className="bg-black flex flex-col">
      <Nav />
      <OrySection />
    </main>
  )
}
