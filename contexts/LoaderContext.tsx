'use client'

import { createContext, useContext, useState } from 'react'

type LoaderCtx = { done: boolean; setDone: (v: boolean) => void }

const LoaderContext = createContext<LoaderCtx>({ done: false, setDone: () => {} })

export function LoaderProvider({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false)
  return <LoaderContext.Provider value={{ done, setDone }}>{children}</LoaderContext.Provider>
}

export const useLoader = () => useContext(LoaderContext)
