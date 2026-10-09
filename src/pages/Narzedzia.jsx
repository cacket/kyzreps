import { Link } from 'react-router-dom'
import { Link2, SearchCheck, Navigation, ChevronRight, BarChart3 } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

export default function Narzedzia() {
  const { t } = usePrefs()
  return (
    <section className="section wrap">
      <div className="section-head">
        <div>
          <span className="eyebrow">{t('toolsPage.eyebrow')}</span>
          <h1>{t('toolsPage.title')}</h1>
          <p style={{color:'var(--muted)'}}>{t('toolsPage.desc')}</p>
        </div>
      </div>
      <div className="tools-grid">
        <Link to="/konwerter" className="tool-card">
          <Link2 size={28} style={{color:'var(--green)',filter:'drop-shadow(0 0 10px var(--green-glow))'}} />
          <h3>{t('toolsPage.converterTitle')}</h3>
          <p>{t('toolsPage.converterDesc')}</p>
          <span className="go">{t('toolsPage.converterGo')} <ChevronRight size={14} /></span>
        </Link>
        <Link to="/qc" className="tool-card">
          <SearchCheck size={28} style={{color:'var(--green)',filter:'drop-shadow(0 0 10px var(--green-glow))'}} />
          <h3>QC Finder</h3>
          <p>{t('toolsPage.qcDesc')}</p>
          <span className="go">{t('toolsPage.qcGo')} <ChevronRight size={14} /></span>
        </Link>
        <Link to="/tracking" className="tool-card">
          <Navigation size={28} style={{color:'var(--green)',filter:'drop-shadow(0 0 10px var(--green-glow))'}} />
          <h3>{t('toolsPage.trackTitle')}</h3>
          <p>{t('toolsPage.trackDesc')}</p>
          <span className="go">{t('toolsPage.trackGo')} <ChevronRight size={14} /></span>
        </Link>
        <Link to="/porownanie-wysylki" className="tool-card">
          <BarChart3 size={28} style={{color:'var(--green)',filter:'drop-shadow(0 0 10px var(--green-glow))'}} />
          <h3>{t('shipping.title')} <span style={{color:'var(--green)'}}>{t('shipping.titleHighlight')}</span></h3>
          <p>{t('shipping.desc')}</p>
          <span className="go">{t('shipping.register')} <ChevronRight size={14} /></span>
        </Link>
      </div>
    </section>
  )
}
