import { useState, useEffect, useCallback } from 'react'

let _show = null

export function toast(msg) {
  if (_show) _show(msg)
}

export default function Toast() {
  const [msg, setMsg] = useState('')
  const [vis, setVis] = useState(false)
  const timer = useCallback((m) => {
    setMsg(m)
    setVis(true)
    clearTimeout(window._toastTimer)
    window._toastTimer = setTimeout(() => setVis(false), 1800)
  }, [])

  useEffect(() => { _show = timer }, [timer])

  return <div className={`toast ${vis ? 'show' : ''}`}>{msg}</div>
}
