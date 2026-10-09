import { Link } from 'react-router-dom'
import { usePrefs } from '../context/PrefsContext'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  const { t } = usePrefs()

  return (
    <section className="section" style={{textAlign:'center',padding:'80px 20px 60px'}}>
      <div style={{fontSize:'7rem',fontWeight:800,color:'var(--green)',lineHeight:1,marginBottom:8}}>404</div>
      <h1 style={{fontSize:'1.6rem',margin:'0 0 12px'}}>{t('404.title')}</h1>
      <p style={{color:'var(--muted)',fontSize:'.95rem',margin:'0 0 40px',maxWidth:440,marginInline:'auto'}}>{t('404.desc')}</p>

      <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
        <Link to="/" style={{display:'inline-flex',alignItems:'center',gap:8,background:'var(--green)',color:'#000',padding:'10px 22px',borderRadius:'var(--radius)',fontWeight:600,textDecoration:'none',fontSize:'.9rem'}}>
          <Home size={16} /> {t('404.home')}
        </Link>
        <Link to="/produkty" style={{display:'inline-flex',alignItems:'center',gap:8,background:'var(--card)',border:'1px solid var(--border)',padding:'10px 22px',borderRadius:'var(--radius)',fontWeight:600,textDecoration:'none',fontSize:'.9rem'}}>
          <Search size={16} /> {t('404.products')}
        </Link>
      </div>
    </section>
  )
}
