import { useState } from 'react'
import { usePrefs } from '../context/PrefsContext'
import { AGENTS } from '../utils/agents'
import { Settings, X, Store, Globe, Coins } from 'lucide-react'

export default function FloatingPrefs() {
  const { prefs, set, t } = usePrefs()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="prefs-fab" onClick={() => setOpen(!open)} title={t('prefs.title')} aria-label={t('prefs.title')}>
        {open ? <X size={20} /> : <Settings size={20} />}
      </button>
      <div className={`prefs-panel ${open ? 'open' : ''}`}>
        <h4><Settings size={15} /> {t('prefs.title')}</h4>

        <label>
          <span><Store size={13} /> {t('prefs.agent')}</span>
          <select value={prefs.agent} onChange={e => set({ agent: e.target.value })}>
            {AGENTS.map(a => <option key={a.name} value={a.name}>{a.name}{a.coupon ? ` (${a.coupon})` : ''}</option>)}
          </select>
          <small>{t('prefs.agentHint')}</small>
        </label>

        <label>
          <span><Globe size={13} /> {t('prefs.lang')}</span>
          <div style={{display:'flex',gap:8}}>
            <button type="button" className={`lang-pick ${prefs.lang === 'pl' ? 'active' : ''}`} onClick={() => set({ lang: 'pl' })}>
              <img src="https://flagcdn.com/w40/pl.png" alt="PL" />
              {t('lang.pl')}
            </button>
            <button type="button" className={`lang-pick ${prefs.lang === 'en' ? 'active' : ''}`} onClick={() => set({ lang: 'en' })}>
              <img src="https://flagcdn.com/w40/gb.png" alt="EN" />
              {t('lang.en')}
            </button>
          </div>
        </label>

        <label>
          <span><Coins size={13} /> {t('prefs.currency')}</span>
          <select value={prefs.currency} onChange={e => set({ currency: e.target.value })}>
            <option value="PLN">PLN — zł</option>
            <option value="USD">USD — $</option>
            <option value="EUR">EUR — €</option>
          </select>
        </label>

        <button className="btn btn-primary btn-sm" style={{width:'100%'}} onClick={() => setOpen(false)}>
          {t('prefs.save')}
        </button>
      </div>
    </>
  )
}
