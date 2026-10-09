import { useState } from 'react'
import { usePrefs } from '../context/PrefsContext'
import { AGENTS } from '../utils/agents'
import { I18N } from '../i18n'
import { Check, ChevronRight } from 'lucide-react'

const CURRENCIES = [
  { code: 'PLN', label: 'Złoty', symbol: 'zł', flag: 'pl' },
  { code: 'USD', label: 'Dollar', symbol: '$',  flag: 'us' },
  { code: 'EUR', label: 'Euro',   symbol: '€',  flag: 'eu' },
]

const LANGS = [
  { code: 'pl', label: 'Polski',  flag: 'pl' },
  { code: 'en', label: 'English', flag: 'gb' },
]

export default function Welcome() {
  const { prefs, completeOnboarding } = usePrefs()
  const [agent,    setAgent]    = useState(prefs.agent    || AGENTS[0].name)
  const [currency, setCurrency] = useState(prefs.currency || 'PLN')
  const [lang,     setLang]     = useState(prefs.lang     || 'pl')
  const [step,     setStep]     = useState(0)  

  const t = (key) => I18N[lang]?.[key] ?? I18N.pl[key] ?? key

  const canContinue = !!agent

  return (
    <div className="wlc-overlay">

      <div className="wlc-backdrop" />

      <div className="wlc-card">

        <div className="wlc-head">
          <div className="wlc-logo-ring">
            <img src="/logo.png" alt="KyzReps" className="wlc-logo-img" />
          </div>
          <h1 className="wlc-title">{t('welcome.title')}</h1>
          <p className="wlc-sub">{t('welcome.sub')}</p>
        </div>


        <div className="wlc-steps">
          <div className={`wlc-dot ${step >= 0 ? 'active' : ''}`} />
          <div className="wlc-dot-line" />
          <div className={`wlc-dot ${step >= 1 ? 'active' : ''}`} />
        </div>


        {step === 0 && (
          <div className="wlc-step-body">
            <p className="wlc-section-label">
              <span className="wlc-num">1</span>
              {t('welcome.step1')}
            </p>
            <p className="wlc-hint">{t('welcome.step1hint')}</p>

            <div className="wlc-agents">
              {AGENTS.map(a => (
                <button
                  key={a.name}
                  className={`wlc-agent-btn ${agent === a.name ? 'active' : ''}`}
                  onClick={() => setAgent(a.name)}
                  type="button"
                >
                  <img
                    src={a.logo}
                    alt={a.name}
                    className="wlc-agent-logo"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                  <span className="wlc-agent-name">
                    {a.name}
                    {a.tag && <span className="wlc-tag">{t('welcome.recommended')}</span>}
                  </span>
                  <span className="wlc-agent-ship">
                    {lang === 'en' ? a.shippingEn : a.shippingPl}
                  </span>
                  <span className={`wlc-check-icon ${agent === a.name ? 'visible' : ''}`}>
                    <Check size={15} />
                  </span>
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary btn-lg wlc-cta"
              onClick={() => setStep(1)}
              disabled={!canContinue}
              type="button"
            >
              Dalej <ChevronRight size={17} />
            </button>
          </div>
        )}


        {step === 1 && (
          <div className="wlc-step-body">
            <p className="wlc-section-label">
              <span className="wlc-num">2</span>
              {t('welcome.step2')}
            </p>
            <div className="wlc-row">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  className={`wlc-pick-btn ${currency === c.code ? 'active' : ''}`}
                  onClick={() => setCurrency(c.code)}
                  type="button"
                >
                  <img src={`https://flagcdn.com/w40/${c.flag}.png`} alt={c.code} className="wlc-flag" />
                  <span>{c.symbol} {c.code}</span>
                  {currency === c.code && <Check size={13} className="wlc-check" />}
                </button>
              ))}
            </div>

            <p className="wlc-section-label" style={{marginTop: 24}}>
              <span className="wlc-num">3</span>
              {t('welcome.step3')}
            </p>
            <div className="wlc-row">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  className={`wlc-pick-btn ${lang === l.code ? 'active' : ''}`}
                  onClick={() => setLang(l.code)}
                  type="button"
                >
                  <img src={`https://flagcdn.com/w40/${l.flag}.png`} alt={l.code} className="wlc-flag" />
                  <span>{l.label}</span>
                  {lang === l.code && <Check size={13} className="wlc-check" />}
                </button>
              ))}
            </div>

            <div className="wlc-footer-btns">
              <button className="btn btn-ghost" onClick={() => setStep(0)} type="button">
                ← Wróć
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => completeOnboarding({ agent, currency, lang })}
                type="button"
              >
                {t('welcome.cta')} →
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .wlc-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: wlcIn .25s ease;
        }
        @keyframes wlcIn { from { opacity: 0; } to { opacity: 1; } }

        .wlc-backdrop {
          position: absolute; inset: 0;
          background: rgba(3, 6, 15, .92);
          backdrop-filter: blur(10px);
        }

        .wlc-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 480px;
          background: var(--card);
          border: 1px solid var(--border-hover);
          border-radius: 24px;
          padding: 36px 32px 28px;
          box-shadow:
            0 40px 100px rgba(0,0,0,.75),
            0 0 0 1px rgba(79,195,247,.1),
            inset 0 1px 0 rgba(255,255,255,.04);
          max-height: 92vh; overflow-y: auto;
          scrollbar-width: thin; scrollbar-color: var(--border) transparent;
          animation: wlcUp .35s cubic-bezier(.22,1,.36,1);
        }
        @keyframes wlcUp {
          from { transform: translateY(24px) scale(.98); opacity: 0; }
          to   { transform: translateY(0)    scale(1);   opacity: 1; }
        }


        .wlc-head { text-align: center; margin-bottom: 24px; }
        .wlc-logo-ring {
          width: 80px; height: 80px; margin: 0 auto 16px;
          border-radius: 50%;
          background: conic-gradient(from 0deg, #0d47a1, #4fc3f7, #0d47a1);
          padding: 2px;
          animation: wlcSpin 8s linear infinite;
          box-shadow: 0 0 30px rgba(79,195,247,.3);
        }
        .wlc-logo-ring::before {
          content: '';
          position: absolute;
          inset: 2px; border-radius: 50%;
          background: var(--card);
        }
        @keyframes wlcSpin { to { transform: rotate(360deg); } }
        .wlc-logo-img {
          width: 100%; height: 100%;
          border-radius: 50%; object-fit: cover;
          position: relative; z-index: 1;
          padding: 6px;
        }
        .wlc-title {
          font-family: var(--font-head); font-size: 1.6rem;
          margin: 0 0 6px; letter-spacing: -.01em;
        }
        .wlc-sub { color: var(--muted); font-size: .88rem; margin: 0; }


        .wlc-steps {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; margin-bottom: 28px;
        }
        .wlc-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: var(--border-hover); transition: .3s;
        }
        .wlc-dot.active { background: var(--green); box-shadow: 0 0 10px var(--green); }
        .wlc-dot-line {
          width: 40px; height: 2px;
          background: var(--border); border-radius: 2px;
        }


        .wlc-step-body { display: flex; flex-direction: column; gap: 0; }
        .wlc-section-label {
          display: flex; align-items: center; gap: 10px;
          font-weight: 700; font-size: .9rem; margin-bottom: 8px; color: var(--text);
        }
        .wlc-num {
          width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
          background: var(--green); color: #03060f;
          font-size: .7rem; font-weight: 800;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .wlc-hint {
          color: var(--muted); font-size: .8rem; margin: 0 0 12px; padding-left: 32px;
        }


        .wlc-agents { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .wlc-agent-btn {
          display: flex; align-items: center; gap: 12px;
          background: var(--card-2); border: 1px solid var(--border);
          border-radius: var(--radius-sm); padding: 13px 16px;
          cursor: pointer; transition: .18s; text-align: left; width: 100%;
          color: var(--muted);
        }
        .wlc-agent-btn:hover { border-color: var(--border-hover); color: var(--text); }
        .wlc-agent-btn.active {
          border-color: var(--green); background: rgba(79,195,247,.08);
          color: var(--text); box-shadow: 0 0 0 1px rgba(79,195,247,.15);
        }
        .wlc-agent-logo {
          width: 28px; height: 28px; border-radius: 8px;
          object-fit: contain; flex: none;
        }
        .wlc-agent-name {
          flex: 1; font-weight: 700; font-size: .9rem;
          display: flex; align-items: center; gap: 8px;
        }
        .wlc-agent-ship { font-size: .76rem; color: var(--muted); white-space: nowrap; }
        .wlc-tag {
          font-size: .6rem; font-weight: 800; letter-spacing: .06em;
          text-transform: uppercase; background: var(--green); color: #03060f;
          border-radius: 999px; padding: 2px 7px;
        }
        .wlc-check-icon {
          color: var(--green); flex-shrink: 0;
          opacity: 0; transform: scale(.6); transition: .18s;
        }
        .wlc-check-icon.visible { opacity: 1; transform: scale(1); }


        .wlc-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 0; }
        .wlc-pick-btn {
          display: flex; align-items: center; gap: 8px;
          background: var(--card-2); border: 1px solid var(--border);
          border-radius: var(--radius-sm); padding: 10px 14px;
          cursor: pointer; transition: .18s;
          font-weight: 600; font-size: .85rem; color: var(--muted); flex: 1; min-width: 110px;
        }
        .wlc-pick-btn:hover { border-color: var(--border-hover); color: var(--text); }
        .wlc-pick-btn.active {
          border-color: var(--green); background: rgba(79,195,247,.08);
          color: var(--text); box-shadow: 0 0 0 1px rgba(79,195,247,.15);
        }
        .wlc-check { color: var(--green); margin-left: auto; flex-shrink: 0; }
        .wlc-flag { width: 20px; height: auto; border-radius: 3px; flex-shrink: 0; }


        .wlc-cta { width: 100%; margin-top: 20px; justify-content: center; font-size: .95rem; }
        .wlc-footer-btns {
          display: flex; gap: 10px; margin-top: 24px;
        }
        .wlc-footer-btns .btn-ghost { flex-shrink: 0; }
        .wlc-footer-btns .btn-primary { flex: 1; justify-content: center; }

        @media (max-width: 480px) {
          .wlc-card { padding: 28px 20px 22px; border-radius: 20px; }
          .wlc-title { font-size: 1.35rem; }
          .wlc-pick-btn { min-width: 90px; font-size: .8rem; }
        }
      `}</style>
    </div>
  )
}
