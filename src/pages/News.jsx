import { useState, useEffect } from 'react'
import { Newspaper, Tag, Zap, Package, BookOpen, ExternalLink, Gift, Users } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

const ICONS = {
  'Nowa funkcja': Zap,
  'Update': Package,
  'Produkty': Tag,
  'Promocja': Gift,
  'Poradnik': BookOpen,
  'New feature': Zap,
  'Promo': Gift,
}

export default function News() {
  const [news, setNews] = useState([])
  const { t } = usePrefs()
  const primaryNews = (items) => (Array.isArray(items) ? items : []).map(item => {
    if ((item?.agent && /kakobuy/i.test(item.agent)) || /kakobuy/i.test(item?.agentLink || '')) {
      return {
        ...item,
        title: String(item.title || '').replace(/KakoBuy/gi, 'OSSbuy'),
        desc: String(item.desc || '').replace(/KakoBuy/gi, 'OSSbuy'),
        agent: 'OSSbuy',
        agentLink: 'https://www.ossbuy.com/register?inviteCode=Kyzreps',
      }
    }
    return item
  })

  useEffect(() => {
    fetch('/api/news').then(r => r.json()).then(d => {
      if (!d || d.length === 0) {
        setNews([{ id: 'n1', title: t('news.fallbackTitle'), date: '2025-06-10',
          desc: t('news.fallbackDesc'), tag: t('news.fallbackTag'), agent: 'OSSbuy', agentLink: 'https://www.ossbuy.com/register?inviteCode=Kyzreps' }])
      } else {
        setNews(primaryNews(d))
      }
    }).catch(() => {
      setNews([{ id: 'n1', title: t('news.fallbackTitle'), date: '2025-06-10',
        desc: t('news.fallbackDesc'), tag: t('news.fallbackTag'), agent: 'OSSbuy', agentLink: 'https://www.ossbuy.com/register?inviteCode=Kyzreps' }])
    })
  }, [])

  return (
    <section className="section wrap">
      <div className="section-head">
        <div>
          <span className="eyebrow"><Newspaper size={14} /> {t('news.eyebrow')}</span>
          <h1>{t('news.title')}</h1>
          <p style={{color:'var(--muted)'}}>{t('news.desc')}</p>
        </div>
      </div>

      <div className="news-promo-banner">
        <div className="promo-left">
          <span className="eyebrow"><Users size={14} /> {t('news.partner')}</span>
          <h2><Gift size={20} style={{verticalAlign:'middle',marginRight:6}} /> {t('news.promoTitle')}</h2>
          <p>{t('news.promoDesc')}</p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:12}}>
            <a href="https://www.ossbuy.com/register?inviteCode=Kyzreps" target="_blank" rel="noopener" className="btn btn-primary">
              <ExternalLink size={16} /> {t('news.promoCta')}
            </a>
          </div>
        </div>
        <div className="promo-right">
          <div className="promo-stat"><b>−50%</b><span>{t('news.shippingOff')}</span></div>
          <div className="promo-stat"><b>3500</b><span>{t('news.yuanBonus')}</span></div>
        </div>
      </div>

      <div style={{display:'grid',gap:20}}>
        {news.map((n) => {
          const Icon = ICONS[n.tag] || Tag
          return (
            <article key={n.id} className="panel">
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <span className="chip"><Icon size={12} style={{marginRight:4,verticalAlign:'middle'}} /> {n.tag}</span>
                <span style={{fontSize:'.74rem',color:'var(--green)',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase'}}>
                  {new Date(n.date).toLocaleDateString('pl-PL', {day:'numeric',month:'long',year:'numeric'})}
                </span>
              </div>
              <h3 style={{marginBottom:8}}>{n.title}</h3>
              <p style={{color:'var(--muted)',marginBottom:n.agent ? 14 : 0}}>{n.desc}</p>
              {n.agent && n.agentLink && (
                <a href={n.agentLink} target="_blank" rel="noopener" className="btn btn-primary btn-sm" style={{marginTop:4}}>
                  <ExternalLink size={14} /> {t('news.claimBonus')} {n.agent}
                </a>
              )}
            </article>
          )
        })}
      </div>

      <style>{`
        .news-promo-banner {
          border-radius:var(--radius); 
          border:2px solid #0E4CA6;
          background:linear-gradient(135deg, #0a1e3d 0%, #0E4CA6 55%, #1565c0 100%);
          padding:36px; margin-bottom:32px;
          display:grid; grid-template-columns:1fr auto; gap:32px; align-items:center;
          box-shadow: 0 8px 28px rgba(14, 76, 166, 0.3), 0 0 30px rgba(14, 76, 166, 0.2);
        }
        .promo-left h2 { font-size:1.3rem; margin-bottom:8px; }
        .promo-left p { color:var(--muted); font-size:.9rem; margin:0; }
        .promo-right { display:flex; gap:20px; }
        .promo-stat { text-align:center; }
        .promo-stat b { display:block; font-family:var(--font-head); font-size:2rem; color:#81d4fa; }
        .promo-stat span { font-size:.78rem; color:var(--muted); }
        @media(max-width:640px) { .news-promo-banner { grid-template-columns:1fr; padding:24px; } .promo-right { justify-content:center; } }
      `}</style>
    </section>
  )
}
