import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useFav } from '../context/FavContext'
import { usePrefs } from '../context/PrefsContext'
import { Menu, X, Heart, Home, Package, Sparkles, Wrench, Megaphone, BookOpen, Shield } from 'lucide-react'

const NAV = [
  { to: '/', label: 'nav.home', icon: Home },
  { to: '/produkty', label: 'nav.products', icon: Package },
  { to: '/outfity', label: 'nav.outfits', icon: Sparkles },
  { to: '/narzedzia', label: 'nav.tools', icon: Wrench },
  { to: '/news', label: 'nav.news', icon: Megaphone },
  { to: '/jak-zamowiac', label: 'nav.howto', icon: BookOpen },
]

const Flag = ({ code }) => (
  <img src={`https://flagcdn.com/w40/${code}.png`} alt={code} loading="lazy" />
)

export default function Header() {
  const [open, setOpen] = useState(false)
  const [announce, setAnnounce] = useState(true)
  const { favs } = useFav()
  const { prefs, set, t } = usePrefs()

  const nextLang = prefs.lang === 'pl' ? 'en' : 'pl'
  const flagCode = prefs.lang === 'pl' ? 'gb' : 'pl'

  return (
    <>
      {announce && (
        <div className="announce" style={{background: 'linear-gradient(90deg, #0a1e3d, #0d2a52 50%, #0a1e3d)', borderBottom: '1px solid #1e3d70'}}>
          {t('announce.text')} <b style={{color:'#4fc3f7'}}>−50%</b> {t('announce.shipping')} &nbsp;
          <a href="https://www.ossbuy.com/register?inviteCode=Kyzreps" target="_blank" rel="noopener" style={{color:'#81d4fa', fontWeight:700}}>{t('announce.cta')} →</a>
          <button className="announce-close" onClick={() => setAnnounce(false)}>✕</button>
        </div>
      )}
      <header className="site-header">
        <div className="wrap nav">
          <NavLink className="brand" to="/">
            <img src="/logo.png" alt="KyzReps" /> KyzReps
          </NavLink>
          <nav className="nav-links">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
                <Icon size={15} /> {t(label)}
              </NavLink>
            ))}
          </nav>
          <div className="nav-actions">
            <button
              className="btn btn-ghost btn-sm lang-flag"
              onClick={() => set({ lang: nextLang })}
              title={prefs.lang === 'pl' ? 'Switch to English' : 'Przełącz na polski'}
            >
              <Flag code={flagCode} />
              <span className="lang-code">{prefs.lang === 'pl' ? 'EN' : 'PL'}</span>
            </button>
            <NavLink to="/ulubione" className="btn btn-ghost btn-sm">
              <Heart size={16} />
              <span className="fav-label">{t('nav.favorites')}</span>
              <span className="fav-count">{Object.keys(favs).length}</span>
            </NavLink>
            <NavLink to="/admin" className="btn btn-ghost btn-sm" title={t('nav.admin')}>
              <Shield size={16} />
            </NavLink>
            <button className="hamburger" onClick={() => setOpen(!open)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <nav className={`mobile-nav ${open ? 'open' : ''}`}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon size={15} /> {t(label)}
            </NavLink>
          ))}
          <NavLink to="/ulubione" onClick={() => setOpen(false)}>
            <Heart size={15} /> {t('nav.favorites')}
          </NavLink>
          <NavLink to="/admin" onClick={() => setOpen(false)}>
            <Shield size={15} /> {t('nav.admin')}
          </NavLink>
          <button className="btn btn-ghost btn-sm lang-flag" style={{ margin: '6px 14px' }} onClick={() => set({ lang: nextLang })}>
            <Flag code={flagCode} />
            <span className="lang-code">{prefs.lang === 'pl' ? 'English' : 'Polski'}</span>
          </button>
        </nav>
      </header>
    </>
  )
}
