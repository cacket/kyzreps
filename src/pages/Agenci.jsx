import { useState, useEffect } from 'react'
import { Users, ExternalLink, Star, Shield, Truck, CreditCard } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

export default function Agenci() {
  const [agents, setAgents] = useState([])
  const [selected, setSelected] = useState(null)
  const { t } = usePrefs()

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(setAgents)
  }, [])

  return (
    <section className="section wrap">
      <div className="section-head">
        <div>
          <span className="eyebrow"><Users size={14} /> {t('agents.eyebrow')}</span>
          <h1>{t('agents.title')}</h1>
          <p style={{color:'var(--muted)'}}>{t('agents.desc')}</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>{t('agents.thAgent')}</th><th>{t('agents.thShip')}</th><th>Promocja</th><th>{t('agents.thFee')}</th><th>{t('agents.thCoupon')}</th><th>{t('agents.thRecommended')}</th><th></th></tr>
          </thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.name} style={{cursor:'pointer'}} onClick={() => setSelected(a)}>
                <td><b>{a.name}</b></td>
                <td>{a.shipping}</td>
                <td>{a.discount ? <span style={{color:'var(--green)',fontWeight:700}}>−{a.discount}% na pierwszą wysyłkę</span> : '—'}</td>
                <td>{a.fee}</td>
                <td>{a.coupon !== '—' ? <span style={{color:'var(--green)',fontWeight:700}}>{a.coupon}</span> : '—'}</td>
                <td>{a.tag ? <span className="tag best">{a.tag}</span> : <span className="tag ok">ok</span>}</td>
                <td>
                  {a.affLink ? (
                    <a href={a.affLink} target="_blank" rel="noopener" className="btn btn-primary btn-sm" onClick={e => e.stopPropagation()}>
                      <ExternalLink size={14} /> {t('agents.register')}
                    </a>
                  ) : a.baseUrl ? (
                    <a href={a.baseUrl} target="_blank" rel="noopener" className="btn btn-ghost btn-sm" onClick={e => e.stopPropagation()}>
                      <ExternalLink size={14} /> {t('agents.website')}
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="panel" style={{marginTop:32}}>
          <h3 style={{fontSize:'1.1rem',marginBottom:6}}>{selected.name}</h3>
          <p style={{color:'var(--muted)',marginBottom:20}}>{t('agents.detailsNote')}</p>
          {selected.discount > 0 && <p style={{color:'var(--green)',fontWeight:700,marginBottom:18}}>−{selected.discount}% na pierwszą wysyłkę dla nowych kont</p>}
          <div className="row-3">
            <div className="panel" style={{textAlign:'center'}}>
              <Truck size={24} style={{color:'var(--green)',marginBottom:8}} />
              <b style={{display:'block',fontSize:'1.2rem',color:'var(--green-bright)'}}>{selected.shipping}</b>
              <span style={{fontSize:'.82rem',color:'var(--muted)'}}>{t('agents.shipPerKg')}</span>
            </div>
            <div className="panel" style={{textAlign:'center'}}>
              <CreditCard size={24} style={{color:'var(--green)',marginBottom:8}} />
              <b style={{display:'block',fontSize:'1.2rem',color:'var(--green-bright)'}}>{selected.fee}</b>
              <span style={{fontSize:'.82rem',color:'var(--muted)'}}>{t('agents.feeLabel')}</span>
            </div>
            <div className="panel" style={{textAlign:'center'}}>
              <Star size={24} style={{color:'var(--green)',marginBottom:8}} />
              <b style={{display:'block',fontSize:'1.2rem',color:'var(--green-bright)'}}>{selected.coupon}</b>
              <span style={{fontSize:'.82rem',color:'var(--muted)'}}>{t('agents.couponLabel')}</span>
            </div>
          </div>
          <div style={{marginTop:20,display:'flex',gap:10,flexWrap:'wrap'}}>
            {selected.affLink ? (
              <a href={selected.affLink} className="btn btn-primary" target="_blank" rel="noopener"><ExternalLink size={16} /> {t('agents.registerBonus')}</a>
            ) : selected.baseUrl ? (
              <a href={selected.baseUrl} className="btn btn-primary" target="_blank" rel="noopener"><ExternalLink size={16} /> {t('agents.openAgent')} {selected.name}</a>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}
