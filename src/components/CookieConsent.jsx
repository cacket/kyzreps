import { useState, useEffect } from 'react'
import { Shield, X } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

export default function CookieConsent() {
  const [show, setShow] = useState(false)
  const { t } = usePrefs()

  useEffect(() => {
    const consent = localStorage.getItem('cr_cookie_consent')
    if (!consent) setShow(true)
  }, [])

  const accept = () => {
    localStorage.setItem('cr_cookie_consent', 'accepted')
    setShow(false)
  }

  const decline = () => {
    localStorage.setItem('cr_cookie_consent', 'declined')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="cookie-banner">
      <div className="cookie-content">
        <Shield size={22} style={{color:'var(--green)',flexShrink:0}} />
        <div>
          <b>{t('cookie.title')}</b>
          <p>{t('cookie.desc')}</p>
        </div>
      </div>
      <div className="cookie-actions">
        <button className="btn btn-primary btn-sm" onClick={accept}>{t('cookie.accept')}</button>
        <button className="btn btn-ghost btn-sm" onClick={decline}>{t('cookie.decline')}</button>
      </div>
      <button className="cookie-close" onClick={decline}><X size={16} /></button>
      <style>{`
        .cookie-banner {
          position:fixed; bottom:0; left:0; right:0; z-index:100;
          background:rgba(10,15,10,.96); border-top:1px solid var(--border-hover);
          backdrop-filter:blur(12px); padding:16px 24px;
          display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap;
          animation:slideUp .3s ease-out;
        }
        @keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
        .cookie-content { display:flex; align-items:center; gap:14px; flex:1; min-width:300px; }
        .cookie-content b { display:block; font-size:.95rem; margin-bottom:2px; color:var(--text); }
        .cookie-content p { margin:0; font-size:.82rem; color:var(--muted); line-height:1.4; }
        .cookie-actions { display:flex; gap:8px; flex-shrink:0; }
        .cookie-close { position:absolute; top:12px; right:12px; background:none; border:none; color:var(--muted); cursor:pointer; padding:4px; }
        .cookie-close:hover { color:var(--text); }
      `}</style>
    </div>
  )
}
