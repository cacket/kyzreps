import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { usePrefs } from '../context/PrefsContext'
import { AGENTS } from '../utils/agents'
import {
  Search, ArrowDown, Truck, Link2, Package, SearchCheck, ChevronRight, Star, Gift,
  Zap, Shield, Clock, BarChart3, Navigation, BadgeCheck, Camera, RotateCw,
} from 'lucide-react'


function useReveal() {
  useEffect(() => {

    const heroEls = document.querySelectorAll('.home-hero .reveal')
    heroEls.forEach((el, i) => {
      setTimeout(() => el.classList.add('revealed'), 80 + i * 100)
    })


    const els = document.querySelectorAll('.reveal:not(.home-hero .reveal)')
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed') }),
      { threshold: 0.1 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  })
}


function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Home() {
  const [pool, setPool]       = useState([])
  const [displayed, setDisplayed] = useState([])
  const [total, setTotal]     = useState(0)
  const [search, setSearch]   = useState('')
  const [countdown, setCountdown] = useState(60)
  const nav = useNavigate()
  const { t, prefs } = usePrefs()
  const productsRef = useRef(null)
  useReveal()


  const pick = useCallback((items) => {
    setDisplayed(shuffle(items).slice(0, 12))
    setCountdown(60)
  }, [])

  useEffect(() => {
    let active = true
    const load = () => {
      fetch('/api/products?latest=120')
        .then(r => r.json())
        .then(d => {
          if (!active) return
          const items = d.items || []
          setPool(items)
          setTotal(d.total || 0)
          pick(items)
        })
        .catch(() => {})
    }
    load()
    const iv = setInterval(load, 60000)
    return () => { active = false; clearInterval(iv) }
  }, [pick])


  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown(60)
      setPool(prev => { pick(prev); return prev })
    }, 60000)
    const cd = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => { clearInterval(iv); clearInterval(cd) }
  }, [pick])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) nav(`/produkty?q=${encodeURIComponent(search.trim())}`)
    else nav('/produkty')
  }

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const preferred = AGENTS.find(a => a.name === 'OSSbuy') || AGENTS[0]

  return (
    <>

      <section className="home-hero">

        <div className="hero-blob blob-1" />
        <div className="hero-blob blob-2" />
        <div className="hero-blob blob-3" />


        <div className="hero-agent-bg" aria-hidden="true">
          {AGENTS.map((a, i) => (
            <img
              key={a.name}
              src={a.logo}
              alt=""
              className={`hero-agent-logo hero-agent-logo-${i}`}
              onError={e => { e.target.style.display = 'none' }}
            />
          ))}
        </div>

        <div className="home-hero-inner wrap">

          <div className="hero-logo-wrap reveal">
            <div className="hero-logo-ring">
              <img src="/logo.png" alt="KyzReps" className="hero-logo-img" />
            </div>
          </div>


          <div className="hero-text reveal" style={{animationDelay:'.1s'}}>
            <span className="hero-eyebrow">
              <BadgeCheck size={13} /> {total > 0 ? `${total} produktów w bazie` : 'Katalog Rep'}
            </span>
            <h1 className="hero-h1">
              {t('hero.title1')} <span className="hero-accent">{t('hero.title2')}</span><br />
              {t('hero.title3')}
            </h1>
            <p className="hero-desc">{t('hero.sub')}</p>
          </div>


          <form className="hero-search reveal" onSubmit={handleSearch} style={{animationDelay:'.2s'}}>
            <Search size={18} className="hero-search-icon" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('hero.searchPh')}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary">{t('hero.searchBtn')}</button>
          </form>


          <div className="hero-btns reveal" style={{animationDelay:'.3s'}}>
            <Link to="/produkty" className="btn btn-primary btn-lg">
              <Package size={17} /> {t('hero.browse')}
            </Link>
            <a href={preferred.affLink} target="_blank" rel="noopener" className="btn btn-ghost btn-lg">
              <Gift size={17} /> Zarejestruj w OSSbuy
            </a>
          </div>


          <div className="hero-chips reveal" style={{animationDelay:'.4s'}}>
            <Link to="/konwerter" className="hero-chip"><Link2 size={14} /> Konwerter</Link>
            <Link to="/qc" className="hero-chip"><SearchCheck size={14} /> QC Finder</Link>
            <Link to="/porownanie-wysylki" className="hero-chip"><BarChart3 size={14} /> Kalkulator</Link>
            <Link to="/tracking" className="hero-chip"><Navigation size={14} /> Tracking</Link>
            <Link to="/jak-zamowiac" className="hero-chip"><Shield size={14} /> Jak zamawiać</Link>
          </div>

          <div className="hero-proof reveal" style={{animationDelay:'.45s'}}>
            <span><Camera size={15} /> Zdjęcia produktów</span>
            <span><RotateCw size={15} /> Baza aktualizowana na bieżąco</span>
            <span><Shield size={15} /> Przydatne narzędzia w jednym miejscu</span>
          </div>


          <button className="hero-scroll-btn" onClick={scrollToProducts} aria-label="Scroll down">
            <ArrowDown size={20} />
          </button>
        </div>
      </section>


      <section className="section wrap" ref={productsRef}>
        <div className="section-head reveal">
          <div>
            <span className="eyebrow"><Star size={14} /> Losowe produkty</span>
            <h2>Odkryj coś nowego</h2>
            <p style={{color:'var(--muted)',fontSize:'.9rem',marginTop:4}}>
              Odświeżane co minutę
            </p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16}}>

            <div className="countdown-ring" title={`Odświeżenie za ${countdown}s`}>
              <svg viewBox="0 0 36 36" className="countdown-svg">
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15" fill="none"
                  stroke="var(--green)" strokeWidth="2.5"
                  strokeDasharray={`${(countdown / 60) * 94.25} 94.25`}
                  strokeLinecap="round"
                  style={{transformOrigin:'center',transform:'rotate(-90deg)',transition:'stroke-dasharray .9s linear'}}
                />
              </svg>
              <span className="countdown-num">{countdown}</span>
            </div>
            <Link to="/produkty" className="btn btn-ghost">
              Wszystkie <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        <div className="grid-products">
          {displayed.map((p, i) => (
            <ProductCard
              key={`${p.id}-${Math.floor(Date.now() / 60000)}`}
              product={p}
              style={{ transitionDelay: `${(i % 8) * 45}ms` }}
              priority={i < 4}
            />
          ))}
          {displayed.length === 0 && (
            <div style={{gridColumn:'1/-1',textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>
              <Clock size={40} style={{marginBottom:12,opacity:.4}} />
              <p>Ładowanie produktów...</p>
            </div>
          )}
        </div>
      </section>


      <section className="section wrap">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow"><Zap size={14} /> Narzędzia</span>
            <h2>{t('tools.title')}</h2>
          </div>
        </div>
        <div className="tools-grid">
          {[
            { to: '/konwerter', Icon: Link2, title: t('tool.converter'), desc: t('tools.converter.desc'), go: t('tools.converter.go') },
            { to: '/qc',        Icon: SearchCheck, title: t('tool.qc'),       desc: t('tools.qc.desc'),       go: t('tools.qc.go') },
            { to: '/porownanie-wysylki', Icon: BarChart3, title: 'Kalkulator wysyłki', desc: 'Porównaj koszty wysyłki między agentami.', go: 'Sprawdź ranking' },
            { to: '/tracking',  Icon: Navigation, title: t('tool.tracking'),   desc: t('tools.track.desc'),    go: t('tools.track.go') },
          ].map(({ to, Icon, title, desc, go }) => (
            <Link to={to} key={to} className="tool-card reveal">
              <Icon size={28} style={{color:'var(--green)',filter:'drop-shadow(0 0 10px var(--green-glow))'}} />
              <h3>{title}</h3>
              <p>{desc}</p>
              <span className="go">{go} <ChevronRight size={14} /></span>
            </Link>
          ))}
        </div>
      </section>


      <section className="section wrap" style={{paddingTop:0}}>
        <div className="cta-banner reveal" style={{display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left',gap:24,padding:'28px 40px'}}>
          <div>
            <h2 style={{fontSize:'1.3rem',marginBottom:4}}>{t('cta.title')}</h2>
            <p style={{color:'var(--muted)',margin:0}}>{t('cta.sub')}</p>
          </div>
          <Link to="/jak-zamowiac" className="btn btn-primary btn-lg" style={{whiteSpace:'nowrap'}}>
            {t('cta.btn')}
          </Link>
        </div>
      </section>
    </>
  )
}
