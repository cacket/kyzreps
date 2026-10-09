import { useState, useMemo } from 'react'
import { Link as LinkIcon, ExternalLink, Crown, Check, Package } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'
import { AGENTS } from '../utils/agents'

const SHIPPING_RATES = {
  OSSbuy:    { perKg: 48, discountPercent: 50, promoThreshold: 0, coupon: 'Kyzreps', benefits: ['bonus_powitalny', 'znizka_qc', 'dostep_agenta'] },
  KakoBuy:   { perKg: 50, promoPerKg: 35, promoThreshold: 0, coupon: 'kyzreps', benefits: ['bonus_powitalny', 'znizka_qc', 'dostep_agenta'] },
}

const WEIGHTS = [1, 2, 3, 5, 8, 10, 15, 20]
const PRIMARY_AGENT = 'OSSbuy'

const BENEFIT_LABELS = {
  bonus_powitalny: 'Bonus powitalny dla nowych kont',
  znizka_qc: 'Zniżka QC w cenie',
  dostep_agenta: 'Dostęp do wsparcia agenta',
}

const BENEFIT_LABELS_EN = {
  bonus_powitalny: 'Welcome bonus for new accounts',
  znizka_qc: 'QC discount included',
  dostep_agenta: 'Agent support access',
}

function getAgentLogo(name) {
  const agent = AGENTS.find(a => a.name === name)
  return agent?.logo || ''
}

function getAgentLink(name) {
  const agent = AGENTS.find(a => a.name === name)
  return agent?.affLink || '#'
}

export default function PorownanieWysylki() {
  const [weight, setWeight] = useState(10)
  const { t, lang } = usePrefs()

  const ranking = useMemo(() => {
    return Object.entries(SHIPPING_RATES)
      .map(([name, rates]) => {
        const regularPrice = rates.perKg * weight
        const promoPerKg = rates.discountPercent ? rates.perKg * (1 - rates.discountPercent / 100) : rates.promoPerKg
        const promoPrice = promoPerKg * weight
        const savings = regularPrice - promoPrice
        return { name, regularPrice, promoPrice, savings, rates }
      })


      .sort((a, b) => a.name === PRIMARY_AGENT ? -1 : b.name === PRIMARY_AGENT ? 1 : a.promoPrice - b.promoPrice)
  }, [weight])

  const best = ranking[0]

  return (
    <section className="section wrap" style={{maxWidth: 900}}>
      <span className="eyebrow"><Package size={14} /> {t('shipping.eyebrow')}</span>
      <h1 style={{marginBottom:6}}>{t('shipping.title')} <span style={{color:'var(--green)'}}>{t('shipping.titleHighlight')}</span></h1>
      <p style={{color:'var(--muted)',marginBottom:32,maxWidth:600}}>
        {t('shipping.desc')}
      </p>


      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:20,marginBottom:32,alignItems:'start'}} className="shipping-hero">

        <div className="panel" style={{marginBottom:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Package size={18} style={{color:'var(--green)'}} />
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:'.95rem'}}>{t('shipping.weightLabel')}</div>
              <div style={{fontSize:'.78rem',color:'var(--muted)'}}>{t('shipping.weightDesc')}</div>
            </div>
            <div style={{marginLeft:'auto',fontSize:'1.8rem',fontWeight:800,color:'var(--green)'}}>{weight} kg</div>
          </div>


          <input type="range" min={1} max={20} value={weight} onChange={e => setWeight(Number(e.target.value))}
                 style={{width:'100%',accentColor:'var(--green)',marginBottom:12}} />


          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {WEIGHTS.map(w => (
              <button key={w} onClick={() => setWeight(w)}
                      style={{padding:'6px 14px',borderRadius:20,border:'1px solid '+(w===weight?'var(--green)':'var(--border)'),
                              background:w===weight?'var(--green)':'transparent',color:w===weight?'#000':'var(--text)',
                              fontWeight:600,fontSize:'.82rem',cursor:'pointer',transition:'all .15s'}}>
                {w} kg
              </button>
            ))}
          </div>
        </div>


        {best && (
          <div className="panel" style={{marginBottom:0,borderColor:'var(--green)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,right:0,background:'var(--green)',color:'#000',padding:'4px 14px',borderRadius:'0 0 0 12px',fontSize:'.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em'}}>
              {t('shipping.bestOffer')}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,marginTop:8}}>
              <img src={getAgentLogo(best.name)} alt={best.name} style={{width:32,height:32,borderRadius:6,objectFit:'contain'}} />
              <span style={{fontWeight:800,fontSize:'1.1rem'}}>{best.name}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div style={{background:'var(--surface)',borderRadius:'var(--radius)',padding:'12px 14px'}}>
                  <div style={{fontSize:'.7rem',color:'var(--muted)',textTransform:'uppercase',marginBottom:4}}>{t('shipping.forWeight').replace('{w}', weight)}</div>
                  <div style={{fontSize:'1.4rem',fontWeight:800,color:'var(--green)'}}>{best.promoPrice.toFixed(2)} zł</div>
                  {best.rates.discountPercent && <div style={{fontSize:'.72rem',fontWeight:700,color:'var(--green)',marginTop:4}}>−{best.rates.discountPercent}% dla nowych kont</div>}
                </div>
              <div style={{background:'var(--surface)',borderRadius:'var(--radius)',padding:'12px 14px'}}>
                <div style={{fontSize:'.7rem',color:'var(--muted)',textTransform:'uppercase',marginBottom:4}}>{t('shipping.savings')}</div>
                <div style={{fontSize:'1.4rem',fontWeight:800,color:'#ef4444'}}>-{best.savings.toFixed(2)} zł</div>
              </div>
            </div>
          </div>
        )}
      </div>


      <h2 style={{fontSize:'1.1rem',marginBottom:16,textTransform:'uppercase',letterSpacing:'.04em'}}>{t('shipping.ranking')}</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',gap:16}} className="ranking-grid">
        {ranking.map((item, i) => {
          const badge = i === 0 ? '#1' : i === 1 ? '#2' : i === 2 ? '#3' : null
          return (
            <div key={item.name} className="panel" style={{
              borderColor: i === 0 ? 'var(--green)' : 'var(--border)',
              position:'relative',
            }}>

              {badge && (
                <div style={{position:'absolute',top:12,right:12,background:i===0?'var(--green)':'var(--surface)',color:i===0?'#000':'var(--muted)',width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.72rem',fontWeight:800}}>
                  {badge}
                </div>
              )}


              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <img src={getAgentLogo(item.name)} alt={item.name} style={{width:36,height:36,borderRadius:8,objectFit:'contain'}} />
                <div>
                  <div style={{fontWeight:700}}>{item.name}</div>
                  <div style={{fontSize:'.72rem',color:i===0?'var(--green)':'var(--muted)',textTransform:'uppercase',fontWeight:600}}>
                    {i===0 ? t('shipping.partner') : i===1 ? t('shipping.bestPrice') : ''}
                  </div>
                </div>
              </div>


              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                <div>
                  <div style={{fontSize:'.68rem',color:'var(--muted)',textTransform:'uppercase',marginBottom:2}}>{t('shipping.regular')}</div>
                  <div style={{fontSize:'.95rem',fontWeight:700,textDecoration:'line-through',opacity:.5}}>{item.regularPrice.toFixed(2)} zł</div>
                </div>
                <div>
                <div style={{fontSize:'.68rem',color:'var(--muted)',textTransform:'uppercase',marginBottom:2}}>{t('shipping.promo')}</div>
                <div style={{fontSize:'1.1rem',fontWeight:800,color:'var(--green)'}}>{item.promoPrice.toFixed(2)} zł</div>
                {item.rates.discountPercent && <div style={{fontSize:'.72rem',color:'var(--green)',marginTop:3}}>−{item.rates.discountPercent}%</div>}
                </div>
              </div>


              <div style={{fontSize:'.82rem',color:'var(--green)',marginBottom:14,fontWeight:600}}>
                ✓ {t('shipping.youSave').replace('{n}', item.savings.toFixed(2))}
              </div>


              <div style={{marginBottom:16}}>
                <div style={{fontSize:'.72rem',textTransform:'uppercase',color:'var(--muted)',marginBottom:8,fontWeight:600}}>{t('shipping.youGet')}</div>
                {item.rates.benefits.map(b => (
                  <div key={b} style={{display:'flex',alignItems:'center',gap:6,fontSize:'.8rem',color:'var(--muted)',marginBottom:4}}>
                    <Check size={14} style={{color:'var(--green)',flexShrink:0}} />
                    {lang === 'en' ? BENEFIT_LABELS_EN[b] : BENEFIT_LABELS[b]}
                  </div>
                ))}
              </div>


              <a href={getAgentLink(item.name)} target="_blank" rel="noopener"
                 style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px 0',borderRadius:'var(--radius)',background:i===0?'var(--green)':'var(--surface)',color:i===0?'#000':'var(--text)',fontWeight:700,fontSize:'.88rem',textDecoration:'none',transition:'opacity .15s'}}
                 onMouseEnter={e => e.currentTarget.style.opacity='.85'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                {t('shipping.register')} <ExternalLink size={14} />
              </a>
            </div>
          )
        })}
      </div>

      </section>
    )
  }
