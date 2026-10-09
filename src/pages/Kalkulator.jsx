import { useState, useEffect } from 'react'
import { Calculator, Weight, Truck, Shield, CheckCircle } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

const RATES = {
  economy:  { perKg: 12, base: 8  },
  standard: { perKg: 18, base: 12 },
  fast:     { perKg: 32, base: 18 },
  express:  { perKg: 58, base: 30 },
}

const METHOD_KEYS = ['economy', 'standard', 'fast', 'express']
const METHOD_I18N = {
  economy:  { pl: 'Ekonomiczna (30-45 dni)', en: 'Economy (30-45 days)' },
  standard: { pl: 'Standardowa (15-25 dni)', en: 'Standard (15-25 days)' },
  fast:     { pl: 'Szybka (7-12 dni)', en: 'Fast (7-12 days)' },
  express:  { pl: 'Ekspresowa (3-7 dni)', en: 'Express (3-7 days)' },
}

export default function Kalkulator() {
  const [agents, setAgents] = useState([])
  const [agent, setAgent] = useState('')
  const [weight, setWeight] = useState(2)
  const [method, setMethod] = useState('standard')
  const [insurance, setInsurance] = useState(0)
  const [promoEnabled, setPromoEnabled] = useState(true)
  const [result, setResult] = useState(null)
  const { t } = usePrefs()

  const isPl = t('lang.pl') === 'Polski'
  const methodLabel = (k) => METHOD_I18N[k]?.[isPl ? 'pl' : 'en'] || k

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(d => {
      setAgents(d)
      if (d.length) {
        setAgent(d[0].name)
        setPromoEnabled(d[0].name === 'OSSbuy' && Number(d[0].discount) > 0)
      }
    })
  }, [])

  const calculate = (e) => {
    e.preventDefault()
    const r = RATES[method]
    const selected = agents.find(item => item.name === agent)
    const discountPercent = promoEnabled ? Number(selected?.discount) || 0 : 0
    const shippingBeforeDiscount = (r.perKg * weight) + r.base
    const discount = shippingBeforeDiscount * discountPercent / 100
    const cost = shippingBeforeDiscount - discount + insurance
    setResult({ agent, weight, method, insurance, cost, rate: r.perKg, base: r.base, discount, discountPercent })
  }

  return (
    <section className="section wrap" style={{maxWidth: 780}}>
      <span className="eyebrow"><Calculator size={14} /> {t('calc.eyebrow')}</span>
      <h1 style={{marginBottom:10}}>{t('calc.title')}</h1>
      <p style={{color:'var(--muted)',marginBottom:32}}>{t('calc.desc')}</p>

      <div className="panel">
        <form onSubmit={calculate}>
          <div className="row-2">
            <div className="field">
              <label><Truck size={14} style={{marginRight:6,verticalAlign:'middle'}} /> {t('calc.agent')}</label>
              <select value={agent} onChange={e => { setAgent(e.target.value); setPromoEnabled(e.target.value === 'OSSbuy') }}>
                {agents.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label><Weight size={14} style={{marginRight:6,verticalAlign:'middle'}} /> {t('calc.weight')}</label>
              <input type="number" min="0.1" step="0.1" value={weight} onChange={e => setWeight(parseFloat(e.target.value) || 0)} required />
            </div>
          </div>
          <div className="row-2">
            <div className="field">
              <label><Truck size={14} style={{marginRight:6,verticalAlign:'middle'}} /> {t('calc.method')}</label>
              <select value={method} onChange={e => setMethod(e.target.value)}>
                {METHOD_KEYS.map(k => <option key={k} value={k}>{methodLabel(k)}</option>)}
              </select>
            </div>
            <div className="field">
              <label><Shield size={14} style={{marginRight:6,verticalAlign:'middle'}} /> {t('calc.insurance')}</label>
              <input type="number" min="0" step="1" value={insurance} onChange={e => setInsurance(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          {agents.find(item => item.name === agent)?.discount > 0 && (
            <label style={{display:'flex',alignItems:'center',gap:8,margin:'4px 0 14px',color:'var(--green)',fontWeight:700,fontSize:'.86rem'}}>
              <input type="checkbox" checked={promoEnabled} onChange={e => setPromoEnabled(e.target.checked)} />
              Uwzględnij −{agents.find(item => item.name === agent).discount}% na pierwszą wysyłkę
            </label>
          )}
          <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',marginTop:4}}>
            <Calculator size={18} /> {t('calc.btn')}
          </button>
        </form>

        {result && (
          <div className="result-box ok">
            <h4><CheckCircle size={18} style={{marginRight:6,verticalAlign:'middle'}} /> {t('calc.resultTitle')}</h4>
            <div className="kv"><span>{t('calc.resultAgent')}</span><b>{result.agent}</b></div>
            <div className="kv"><span>{t('calc.resultWeight')}</span><b>{result.weight} kg</b></div>
            <div className="kv"><span>{t('calc.resultMethod')}</span><b>{methodLabel(result.method)}</b></div>
            <div className="kv"><span>{t('calc.resultRate')}</span><b>{result.rate} zł</b></div>
            <div className="kv"><span>{t('calc.resultBase')}</span><b>{result.base} zł</b></div>
            {result.discount > 0 && <div className="kv"><span>Rabat OSSbuy −{result.discountPercent}%</span><b style={{color:'var(--green)'}}>−{result.discount.toFixed(2)} zł</b></div>}
            {result.insurance > 0 && <div className="kv"><span>{t('calc.resultInsurance')}</span><b>{result.insurance.toFixed(2)} zł</b></div>}
            <div className="kv" style={{borderTop:'2px solid var(--green)',paddingTop:14,marginTop:8}}>
              <span style={{fontSize:'1.1rem',fontWeight:700}}>{t('calc.resultTotal')}</span>
              <b style={{fontSize:'1.4rem',color:'var(--green-bright)'}}>{result.cost.toFixed(2)} zł</b>
            </div>
          </div>
        )}
      </div>

      <div className="panel" style={{marginTop:24}}>
        <h3 style={{fontSize:'1rem',marginBottom:10}}>{t('calc.ratesTitle')}</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('calc.ratesAgent')}</th><th>{t('calc.ratesRate')}</th><th>{t('calc.ratesFee')}</th><th>{t('calc.ratesCoupon')}</th></tr></thead>
            <tbody>
              {agents.slice(0, 6).map(a => (
                <tr key={a.name}>
                  <td><b>{a.name}</b></td>
                  <td>{a.shipping}</td>
                  <td>{a.fee}</td>
                  <td>{a.coupon !== '—' ? <span style={{color:'var(--green)',fontWeight:700}}>{a.coupon}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
