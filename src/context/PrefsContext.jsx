import { createContext, useContext, useEffect, useState } from 'react'
import { I18N } from '../i18n'

const PrefsContext = createContext(null)

const COOKIE = 'cf-prefs'
const DEFAULTS = { agent: 'OSSbuy', lang: 'pl', currency: 'PLN' }
const RATES = { PLN: 1, USD: 1 / 4.18, EUR: 1 / 4.55 }
const SYMBOLS = { PLN: 'zł', USD: '$', EUR: '€' }

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

function setCookie(name, value, days = 365) {
  const d = new Date(Date.now() + days * 864e5)
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`
}

export function PrefsProvider({ children }) {
  const raw = getCookie(COOKIE)
  const [configured, setConfigured] = useState(() => !!raw)
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = JSON.parse(raw || '{}')
      if (!stored.agent || stored.agent === 'KakoBuy') stored.agent = DEFAULTS.agent
      return { ...DEFAULTS, ...stored }
    }
    catch { return DEFAULTS }
  })

  useEffect(() => {
    setCookie(COOKIE, JSON.stringify(prefs))
    document.documentElement.lang = prefs.lang
  }, [prefs])

  const set = (patch) => setPrefs(p => ({ ...p, ...patch }))

  const completeOnboarding = (values = {}) => {
    setPrefs(p => ({ ...p, ...values }))
    setConfigured(true)
  }

  const t = (key) => I18N[prefs.lang]?.[key] ?? I18N.pl[key] ?? key

  const formatPrice = (plnValue) => {
    const v = plnValue * RATES[prefs.currency]
    if (prefs.currency === 'PLN') return v.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' zł'
    return SYMBOLS[prefs.currency] + v.toLocaleString('en-US', { minimumFractionDigits: 2 })
  }

  return (
    <PrefsContext.Provider value={{ prefs, set, t, formatPrice, configured, onboarded: configured, completeOnboarding }}>
      {children}
    </PrefsContext.Provider>
  )
}

export function usePrefs() {
  return useContext(PrefsContext)
}
