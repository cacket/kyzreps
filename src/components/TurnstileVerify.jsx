import { useState, useRef, useEffect } from 'react'
import { Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

export default function TurnstileVerify({ onVerified }) {
  const [status, setStatus] = useState('widget')  
  const [errorMsg, setErrorMsg] = useState('')
  const widgetRef = useRef(null)
  const widgetIdRef = useRef(null)
  const renderedRef = useRef(false)
  const { t } = usePrefs()

  useEffect(() => {
    const renderWidget = () => {
      if (renderedRef.current || !window.turnstile || !widgetRef.current) return
      renderedRef.current = true
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: TURNSTILE_SITEKEY,
        callback: handleVerify,
        'error-callback': () => setStatus('error'),
        theme: 'dark',
        appearance: 'always',
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) { clearInterval(interval); renderWidget() }
      }, 200)
      return () => {
        clearInterval(interval)
        if (widgetIdRef.current !== null && window.turnstile?.remove) window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
        renderedRef.current = false
      }
    }

    return () => {
      if (widgetIdRef.current !== null && window.turnstile?.remove) window.turnstile.remove(widgetIdRef.current)
      widgetIdRef.current = null
      renderedRef.current = false
    }
  }, [])

  const handleVerify = async (token) => {
    setStatus('verifying')
    try {
      const res = await fetch('/api/turnstile/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('done')
        setTimeout(() => onVerified(), 800)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Verification failed')
        if (widgetIdRef.current) window.turnstile.reset(widgetIdRef.current)
      }
    } catch {
      setStatus('error')
      setErrorMsg('Server connection error')
      if (widgetIdRef.current) window.turnstile.reset(widgetIdRef.current)
    }
  }

  return (
    <div className="ts-overlay">
      <div className="ts-card">
        <div className="ts-head">
          <img src="/logo.png" alt="KyzReps" className="ts-logo" />
          <h1 className="ts-title">KyzReps</h1>
          <p className="ts-sub">Weryfikacja antybot</p>
        </div>

        <div className="ts-widget-wrap">
          {status === 'widget' && <div ref={widgetRef} className="ts-widget" />}
          {status === 'verifying' && (
            <div className="ts-status">
              <Loader2 size={28} className="spin" /> <span>Weryfikacja…</span>
            </div>
          )}
          {status === 'done' && (
            <div className="ts-status ts-ok">
              <CheckCircle size={28} /> <span>Zweryfikowano!</span>
            </div>
          )}
          {status === 'error' && (
            <div className="ts-status ts-err">
              <AlertCircle size={28} /> <span>{errorMsg || 'Błąd weryfikacji'}</span>
            </div>
          )}
        </div>

        <p className="ts-foot" />
      </div>

      <style>{`
        .ts-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: #050805;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .ts-card {
          width: 100%; max-width: 420px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 40px 36px 28px;
          text-align: center;
          box-shadow: 0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(79,195,247,.08);
        }
        .ts-head { margin-bottom: 28px; }
        .ts-logo { width: 56px; height: 56px; border-radius: 14px; margin: 0 auto 14px; object-fit: cover; }
        .ts-title { font-family: var(--font-head); font-size: 1.6rem; margin: 0 0 6px; }
        .ts-sub { color: var(--muted); font-size: .9rem; margin: 0; }
        .ts-widget-wrap { min-height: 70px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        .ts-widget { display: inline-block; }
        .ts-status { display: flex; align-items: center; gap: 10px; font-size: .95rem; font-weight: 600; color: var(--text); }
        .ts-ok { color: var(--green-bright); }
        .ts-err { color: #f44; }
        .ts-foot { color: var(--muted); font-size: .76rem; margin: 0; }
        @keyframes spin { to { transform: rotate(360deg) } }
        .spin { animation: spin .7s linear infinite; }
        @media (max-width: 500px) {
          .ts-card { padding: 28px 20px 20px; }
        }
      `}</style>
    </div>
  )
}
