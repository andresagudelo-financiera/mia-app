'use client'
import { useEffect, useState } from 'react'

export default function TestPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return (
    <div style={{ padding: '100px', backgroundColor: 'green', color: 'white', fontSize: '30px' }}>
      TEST COMPONENT: {mounted ? 'MOUNTED' : 'NOT MOUNTED'}
    </div>
  )
}
