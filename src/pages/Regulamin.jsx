import { Link } from 'react-router-dom'
import { usePrefs } from '../context/PrefsContext'
import { ArrowLeft } from 'lucide-react'

export default function Regulamin() {
  const { t } = usePrefs()

  return (
    <section className="section wrap" style={{maxWidth: 780}}>
      <Link to="/" style={{display:'inline-flex',alignItems:'center',gap:6,color:'var(--green)',fontSize:'.88rem',marginBottom:24,textDecoration:'none'}}>
        <ArrowLeft size={16} /> {t('bc.home')}
      </Link>

      <h1 style={{marginBottom:8}}>{t('legal.title')}</h1>
      <p style={{color:'var(--muted)',fontSize:'.82rem',marginBottom:32}}>{t('legal.updated')}</p>

      <div className="legal-content">
        <div className="legal-disclaimer">
          <p>{t('legal.disclaimer1')}</p>
          <p>{t('legal.disclaimer2')}</p>
        </div>

        <div className="legal-section">
          <h3>{t('legal.s1title')}</h3>
          <p>{t('legal.s1')}</p>
        </div>

        <div className="legal-section">
          <h3>{t('legal.s2title')}</h3>
          <p>{t('legal.s2a')}</p>
          <p>{t('legal.s2b')}</p>
          <ul>
            <li>{t('legal.s2li1')}</li>
            <li>{t('legal.s2li2')}</li>
            <li>{t('legal.s2li3')}</li>
          </ul>
        </div>

        <div className="legal-section">
          <h3>{t('legal.s3title')}</h3>
          <p>{t('legal.s3a')}</p>
          <p>{t('legal.s3b')}</p>
        </div>

        <div className="legal-section">
          <h3>{t('legal.s4title')}</h3>
          <p>{t('legal.s4')}</p>
        </div>

        <div className="legal-section">
          <h3>{t('legal.s5title')}</h3>
          <p>{t('legal.s5')}</p>
        </div>

        <div className="legal-section">
          <h3>{t('legal.s6title')}</h3>
          <p>{t('legal.s6')}</p>
        </div>

        <div className="legal-section">
          <h3>{t('legal.s7title')}</h3>
          <p>{t('legal.s7')}</p>
        </div>

        <div className="legal-section">
          <h3>{t('legal.s8title')}</h3>
          <p>{t('legal.s8')}</p>
        </div>

        <div className="legal-section">
          <h3>{t('legal.s9title')}</h3>
          <p>{t('legal.s9')} <a href="https://discord.com/invite/sTaRgQXAPy" target="_blank" rel="noopener" style={{color:'var(--green)'}}>Discord</a> {t('legal.s9end')}</p>
        </div>
      </div>

      <style>{`
        .legal-disclaimer {
          background: var(--card); border: 1px solid var(--border-hover); border-radius: var(--radius);
          padding: 20px; margin-bottom: 28px;
          color: var(--muted); font-size: .88rem; line-height: 1.7;
        }
        .legal-disclaimer p { margin: 0 0 10px; }
        .legal-disclaimer p:last-child { margin-bottom: 0; }
        .legal-section { margin-bottom: 24px; }
        .legal-section h3 { font-size: 1rem; margin: 0 0 8px; color: var(--text); }
        .legal-section p { color: var(--muted); font-size: .88rem; line-height: 1.7; margin: 0 0 8px; }
        .legal-section ul { color: var(--muted); font-size: .88rem; line-height: 1.7; margin: 8px 0 0; padding-left: 20px; }
        .legal-section li { margin-bottom: 4px; }
      `}</style>
    </section>
  )
}
