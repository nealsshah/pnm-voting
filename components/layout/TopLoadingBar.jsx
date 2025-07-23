'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function TopLoadingBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Show bar whenever pathname changes
    setVisible(true)
    const timeout = setTimeout(() => setVisible(false), 500) // keep bar for 500ms

    return () => clearTimeout(timeout)
  }, [pathname])

  return (
    <div
      className={`pointer-events-none fixed top-0 left-0 z-[9999] h-1 w-full transform-gpu transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'
        }`}
    >
      <div className="h-full w-full animate-loading-bar bg-blue-600" />
    </div>
  )
}