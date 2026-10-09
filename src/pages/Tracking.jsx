import { useState } from 'react'
import { Package, ExternalLink, Search } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

const TRACKERS = [
  { name: '17Track', url: 'https://www.17track.net/en/track#nums=' },
  { name: 'Parcelsapp', url: 'https://parcelsapp.com/en/tracking/' },
  { name: 'AfterShip', url: 'https://track.aftership.com/' },
]

export default function Tracking() {
  const [num, setNum] = useState('')
  const { t } = usePrefs()

  const track = (e) => {
    e.preventDefault()
    if (num.trim()) window.open(`https://www.17track.net/en/track#nums=${encodeURIComponent(num.trim())}`, '_blank')
  }

  return (
    <section className="section wrap" style={{maxWidth: 720}}>
      <span className="eyebrow"><Package size={14} /> {t('track.eyebrow')}</span>
      <h1 style={{marginBottom:10}}>{t('track.title')}</h1>
      <p style={{color:'var(--muted)',marginBottom:32}}>{t('track.desc')}</p>

      <div className="panel">
        <form onSubmit={track}>
          <div className="field">
            <label><Search size={14} style={{marginRight:6,verticalAlign:'middle'}} /> {t('track.label')}</label>
            <input type="text" required value={num} onChange={e => setNum(e.target.value)}
                   placeholder={t('track.placeholder')} autoComplete="off" />
            <small>{t('track.hint')}</small>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%'}}>
            <Package size={18} /> {t('track.btn')}
          </button>
        </form>
      </div>

      <div className="panel" style={{marginTop:24}}>
        <h3 style={{fontSize:'1rem',marginBottom:14}}>{t('track.popularTitle')}</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
          {TRACKERS.map((tr, i) => (
            <a key={i} href={tr.url} target="_blank" rel="noopener" className="btn btn-ghost btn-sm" style={{justifyContent:'center'}}>
              <ExternalLink size={14} /> {tr.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
