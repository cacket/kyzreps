import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

export default function JakZamawiac() {
  const { t } = usePrefs()
  return (
    <section className="section wrap" style={{maxWidth:780}}>
      <span className="eyebrow"><BookOpen size={14} /> {t('howto.eyebrow')}</span>
      <h1 style={{marginBottom:10}}>{t('howto.title')}</h1>
      <p style={{color:'var(--muted)',marginBottom:32}}>{t('howto.desc')}</p>

      <div className="steps">
        <div className="step">
          <h3>{t('howto.step1')}</h3>
          <p>{t('howto.step1Desc')} <Link to="/agenci" style={{color:'var(--green)'}}>{t('howto.step1Link')}</Link>.</p>
        </div>
        <div className="step">
          <h3>{t('howto.step2')}</h3>
          <p>{t('howto.step2Desc')}</p>
        </div>
        <div className="step">
          <h3>{t('howto.step3')}</h3>
          <p>{t('howto.step3Desc')} <Link to="/produkty" style={{color:'var(--green)'}}>{t('howto.step3Link')}</Link> {t('howto.step3Desc2')}</p>
        </div>
        <div className="step">
          <h3>{t('howto.step4')}</h3>
          <p>{t('howto.step4Desc')}</p>
        </div>
        <div className="step">
          <h3>{t('howto.step5')}</h3>
          <p>{t('howto.step5Desc')} <Link to="/qc" style={{color:'var(--green)'}}>{t('howto.step5Link')}</Link>.</p>
        </div>
        <div className="step">
          <h3>{t('howto.step6')}</h3>
          <p>{t('howto.step6Desc')} <Link to="/porownanie-wysylki" style={{color:'var(--green)'}}>{t('howto.step6Link')}</Link> {t('howto.step6Desc2')}</p>
        </div>
        <div className="step">
          <h3>{t('howto.step7')}</h3>
          <p>{t('howto.step7Desc')} <Link to="/tracking" style={{color:'var(--green)'}}>{t('howto.step7Link')}</Link>.</p>
        </div>
        <div className="step">
          <h3>{t('howto.step8')}</h3>
          <p>{t('howto.step8Desc')}</p>
        </div>
      </div>

      <div className="cta-banner" style={{marginTop:40}}>
        <h2>{t('howto.ctaTitle')}</h2>
        <p>{t('howto.ctaDesc')}</p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginTop:8}}>
          <Link to="/produkty" className="btn btn-primary"><ArrowRight size={16} /> {t('howto.ctaBrowse')}</Link>
          <Link to="/porownanie-wysylki" className="btn btn-ghost">{t('howto.ctaCalc')}</Link>
        </div>
      </div>
    </section>
  )
}
