import { Link } from 'react-router-dom'
import { usePrefs } from '../context/PrefsContext'
import { ArrowUp } from 'lucide-react'

export default function Footer() {
  const { t } = usePrefs()
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Link className="brand" to="/">
            <img src="/logo.png" alt="KyzReps" /> KyzReps
          </Link>
          <p>{t('footer.desc')}</p>
        </div>
        <div className="footer-col">
          <h4>{t('footer.catalog')}</h4>
          <Link to="/produkty">{t('nav.products')}</Link>
          <Link to="/outfity">{t('nav.outfits')}</Link>
          <Link to="/news">{t('nav.news')}</Link>
        </div>
        <div className="footer-col">
          <h4>{t('footer.tools')}</h4>
          <Link to="/kalkulator">{t('footer.shipCalc')}</Link>
          <Link to="/tracking">{t('footer.tracking')}</Link>
          <Link to="/konwerter">{t('footer.converter')}</Link>
          <Link to="/qc">QC Finder</Link>
        </div>
        <div className="footer-col">
          <h4>{t('footer.more')}</h4>
          <Link to="/agenci">{t('nav.agents')}</Link>
          <Link to="/jak-zamowiac">{t('nav.howto')}</Link>
          <Link to="/ulubione">{t('footer.favs')}</Link>
          <Link to="/regulamin">{t('footer.legal')}</Link>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} KyzReps. {t('footer.rights')}</span>
        <span style={{display:'flex',alignItems:'center',gap:6}}>
          {t('footer.built')} <ArrowUp size={14} style={{color:'var(--green)'}} /> {t('footer.for')}
        </span>
      </div>
    </footer>
  )
}
