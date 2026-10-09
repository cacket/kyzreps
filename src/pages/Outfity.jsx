import { useEffect, useState } from 'react'
import {
  Check,
  ExternalLink,
  Heart,
  Link2,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

const FALLBACK_OUTFITS = []

const EMPTY_FORM = { title: '', desc: '', img: '', cat: 'Streetwear', rating: '8', pins: [] }
const OUTFIT_CATEGORIES = ['Streetwear', 'Minimal', 'Outdoor', 'Techwear', 'Vintage', 'Inne']

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="600" height="750" fill="#060c1a"/><text x="50%" y="50%" fill="#4fc3f7" font-family="sans-serif" font-size="28" text-anchor="middle" dominant-baseline="middle">KYZ REPS</text></svg>',
)

const makePin = (x = 50, y = 50) => ({
  id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  x,
  y,
  title: '',
  url: '',
  buyUrl: '',
  price: null,
  currency: 'PLN',
  source: '',
})

function imageSource(url) {
  if (!url) return PLACEHOLDER
  if (/postimg\.cc|iili\.io/i.test(url)) return `/api/img?url=${encodeURIComponent(url)}`
  if (/^https?:\/\/i\.imgur\.com\/[^/?#]+\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(url)) return url
  if (/^https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(url)) return url
  return `/api/img?url=${encodeURIComponent(url)}`
}

function formatPrice(price, currency = 'PLN') {
  const value = Number(price)
  if (!Number.isFinite(value) || value < 0) return ''
  const symbol = String(currency).toUpperCase() === 'CNY' ? '¥' : 'zł'
  return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
}

function pinHref(pin) {
  const href = pin?.buyUrl || pin?.url || ''
  return /^https?:\/\//i.test(String(href)) ? href : ''
}

export default function Outfity() {
  const [outfits, setOutfits] = useState(FALLBACK_OUTFITS)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM, pins: [] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pinMode, setPinMode] = useState(false)
  const [activePinId, setActivePinId] = useState(null)
  const [lookupPinId, setLookupPinId] = useState(null)
  const [likedOutfits, setLikedOutfits] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('kyz_outfit_likes') || '[]')
      return Array.isArray(saved) ? [...new Set(saved.map(String))].slice(-2000) : []
    } catch {
      return []
    }
  })
  const [likingId, setLikingId] = useState(null)
  const { t, prefs } = usePrefs()
  const isEn = prefs.lang === 'en'

  useEffect(() => {
    localStorage.setItem('kyz_outfit_likes', JSON.stringify(likedOutfits))
  }, [likedOutfits])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/outfits', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/auth/user', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([items, me]) => {
      if (cancelled) return
      if (Array.isArray(items)) setOutfits(items)
      setUser(me)
      setAuthLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const login = () => { window.location.href = '/api/auth/discord' }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    setUser(null)
    setShowForm(false)
  }

  const openForm = () => {
    setError('')
    setForm({ ...EMPTY_FORM, pins: [] })
    setPinMode(false)
    setActivePinId(null)
    setShowForm(true)
  }

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const setPinField = (id, field, value) => {
    setForm(prev => ({
      ...prev,
      pins: (prev.pins || []).map(pin => {
        if (pin.id !== id) return pin
        if (field === 'url') return { ...pin, url: value, buyUrl: '', price: null, currency: 'PLN', source: '' }
        return { ...pin, [field]: value }
      }),
    }))
  }

  const handleImageClick = (event) => {
    if (!pinMode || !form.img) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Number.isFinite(event.clientX) ? Math.max(1, Math.min(99, ((event.clientX - rect.left) / rect.width) * 100)) : 50
    const y = Number.isFinite(event.clientY) ? Math.max(1, Math.min(99, ((event.clientY - rect.top) / rect.height) * 100)) : 50
    const pin = makePin(Math.round(x * 10) / 10, Math.round(y * 10) / 10)
    setForm(prev => ({ ...prev, pins: [...(prev.pins || []), pin] }))
    setActivePinId(pin.id)
    setPinMode(false)
  }

  const removePin = (id) => {
    setForm(prev => ({ ...prev, pins: (prev.pins || []).filter(pin => pin.id !== id) }))
    setActivePinId(prev => prev === id ? null : prev)
  }

  const lookupPrice = async (id) => {
    const pin = (form.pins || []).find(item => item.id === id)
    if (!pin?.url) {
      setError(isEn ? 'Add a product link to the pin first.' : 'Najpierw dodaj link produktu do pinezki.')
      setActivePinId(id)
      return
    }
    setError('')
    setLookupPinId(id)
    try {
      const response = await fetch('/api/outfit-item/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pin.url, title: pin.title }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) throw new Error(data.error || (isEn ? 'Price not found.' : 'Nie znaleziono ceny.'))
      setForm(prev => ({
        ...prev,
        pins: (prev.pins || []).map(item => item.id === id ? {
          ...item,
          title: data.title || item.title,
          price: data.price ?? item.price,
          currency: data.currency || item.currency || 'PLN',
          buyUrl: data.buyUrl || item.buyUrl,
          source: data.source || 'catalog',
        } : item),
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLookupPinId(null)
    }
  }

  const saveOutfit = async (event) => {
    event.preventDefault()
    setError('')
    const pins = (form.pins || []).filter(pin => pin.title || pin.url)
    if (pins.some(pin => !/^https?:\/\//i.test(String(pin.url || '')))) {
      setError(isEn ? 'Every pin needs a valid http(s) product link.' : 'Każda pinezka musi mieć poprawny link http(s) do produktu.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/outfits', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, pins, rating: Number(form.rating) || 8 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || (isEn ? 'Discord login required.' : 'Musisz zalogować się przez Discord.'))
      if (data.outfit) setOutfits(prev => [data.outfit, ...prev])
      setForm({ ...EMPTY_FORM, pins: [] })
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleLike = async (outfitId) => {
    if (likingId) return
    const wasLiked = likedOutfits.includes(String(outfitId))
    const liked = !wasLiked
    setLikingId(outfitId)
    setLikedOutfits(prev => liked ? [...new Set([...prev, String(outfitId)])] : prev.filter(id => id !== String(outfitId)))
    setOutfits(prev => prev.map(item => item.id === outfitId ? { ...item, likes: Math.max(0, Number(item.likes || 0) + (liked ? 1 : -1)) } : item))
    try {
      const response = await fetch(`/api/outfits/${encodeURIComponent(outfitId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Like failed')
      setOutfits(prev => prev.map(item => item.id === outfitId ? { ...item, likes: Number(data.likes) || 0 } : item))
    } catch {
      setLikedOutfits(prev => wasLiked ? [...new Set([...prev, String(outfitId)])] : prev.filter(id => id !== String(outfitId)))
      setOutfits(prev => prev.map(item => item.id === outfitId ? { ...item, likes: Math.max(0, Number(item.likes || 0) + (liked ? -1 : 1)) } : item))
    } finally {
      setLikingId(null)
    }
  }

  const formPins = form.pins || []

  return (
    <section className="section wrap">
      <div className="section-head" style={{ alignItems: 'flex-start', gap: 18 }}>
        <div>
          <span className="eyebrow">{t('outfits.eyebrow')}</span>
          <h1>{t('outfits.title')}</h1>
          <p style={{ color: 'var(--muted)' }}>{t('outfits.desc')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!authLoading && user && (
            <span style={{ color: 'var(--muted)', fontSize: '.84rem' }}>
              {isEn ? 'Logged in as' : 'Zalogowano jako'} <strong style={{ color: 'var(--text)' }}>{user.username}</strong>
            </span>
          )}
          {!authLoading && !user && (
            <button className="btn btn-primary" type="button" onClick={login}>
              <LogIn size={15} /> {t('outfits.loginDiscord')}
            </button>
          )}
          {!authLoading && user && (
            <>
              <button className="btn btn-primary" type="button" onClick={openForm}>
                <Plus size={15} /> {t('outfits.add')}
              </button>
              <button className="btn btn-ghost" type="button" onClick={logout} title={t('outfits.logout')}>
                <LogOut size={15} /> {t('outfits.logout')}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, color: '#ff9c9c', background: 'rgba(255,80,80,.1)', border: '1px solid rgba(255,100,100,.3)' }}>
          {error}
        </div>
      )}

      {showForm && user && (
        <form onSubmit={saveOutfit} className="outfit-form">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{t('outfits.formTitle')}</h2>
              <p className="outfit-form-subtitle">{t('outfits.pinsHint')}</p>
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowForm(false)} aria-label={isEn ? 'Close' : 'Zamknij'}><X size={15} /></button>
          </div>
          <input className="outfit-input" value={form.title} onChange={e => setField('title', e.target.value)} placeholder={t('outfits.titleLabel')} required />
          <textarea className="outfit-input" value={form.desc} onChange={e => setField('desc', e.target.value)} placeholder={t('outfits.descLabel')} required rows={3} style={{ resize: 'vertical' }} />
          <input className="outfit-input" type="url" value={form.img} onChange={e => setField('img', e.target.value)} placeholder={t('outfits.imgLabel')} />

          <div className="outfit-pin-section">
            <div className="outfit-pin-heading">
              <div><strong>{t('outfits.pinsTitle')}</strong><span>{formPins.length}/30</span></div>
              <button className={`btn ${pinMode ? 'btn-primary' : 'btn-ghost'} btn-sm`} type="button" disabled={!form.img} onClick={() => setPinMode(value => !value)}>
                <MapPin size={15} /> {pinMode ? t('outfits.pinChoose') : t('outfits.pinAdd')}
              </button>
            </div>
            <div className="outfit-pin-workspace">
              <div className={`outfit-pin-editor ${pinMode ? 'pin-mode' : ''}`} onClick={handleImageClick} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter') handleImageClick(event) }}>
                <img src={imageSource(form.img)} alt={isEn ? 'Outfit preview' : 'Podgląd outfitu'} referrerPolicy="no-referrer" decoding="async" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = PLACEHOLDER }} />
                {!form.img && <div className="outfit-pin-empty">{isEn ? 'Paste an image URL above' : 'Wklej wyżej URL zdjęcia'}</div>}
                {formPins.map((pin, index) => (
                  <button
                    type="button"
                    key={pin.id}
                    className={`outfit-pin-dot ${activePinId === pin.id ? 'active' : ''}`}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    onClick={event => { event.stopPropagation(); setActivePinId(pin.id) }}
                    title={pin.title || `${t('outfits.pinTitle')} ${index + 1}`}
                  >{index + 1}</button>
                ))}
              </div>
              <div className="outfit-pin-panel">
                {!formPins.length && <div className="outfit-pin-panel-empty"><MapPin size={19} />{t('outfits.pinEmpty')}</div>}
                {formPins.map((pin, index) => (
                  <div className={`outfit-pin-card ${activePinId === pin.id ? 'active' : ''}`} key={pin.id} onClick={() => setActivePinId(pin.id)}>
                    <div className="outfit-pin-card-head">
                      <span className="outfit-pin-number">{index + 1}</span>
                      <strong>{pin.title || `${t('outfits.pinTitle')} ${index + 1}`}</strong>
                      <button type="button" className="icon-btn danger" onClick={event => { event.stopPropagation(); removePin(pin.id) }} aria-label={t('outfits.pinRemove')}><Trash2 size={15} /></button>
                    </div>
                    <input className="outfit-input" value={pin.title} onChange={event => setPinField(pin.id, 'title', event.target.value)} placeholder={t('outfits.pinTitle')} />
                    <div className="outfit-pin-url-row">
                      <Link2 size={15} />
                      <input className="outfit-input" type="url" value={pin.url} onChange={event => setPinField(pin.id, 'url', event.target.value)} onBlur={() => { if (pin.url && pin.price == null) lookupPrice(pin.id) }} placeholder={t('outfits.pinUrl')} />
                    </div>
                    <div className="outfit-pin-price-row">
                      <div className="outfit-price-value">{pin.price != null ? formatPrice(pin.price, pin.currency) : t('outfits.pinUnknownPrice')}</div>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={event => { event.stopPropagation(); lookupPrice(pin.id) }} disabled={!pin.url || lookupPinId === pin.id}>
                        {lookupPinId === pin.id ? <Loader2 size={14} className="spin" /> : <Search size={14} />} {lookupPinId === pin.id ? t('outfits.pinChecking') : t('outfits.pinLookup')}
                      </button>
                    </div>
                    {pin.source && <small className="outfit-pin-source"><Check size={12} /> {pin.source === 'catalog' ? t('outfits.pinCatalog') : 'QCItems'}</small>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select className="filter-select" value={form.cat} onChange={e => setField('cat', e.target.value)} aria-label={t('outfits.categoryLabel')}>
              {OUTFIT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input className="outfit-input outfit-rating-input" type="number" min="1" max="10" value={form.rating} onChange={e => setField('rating', e.target.value)} placeholder={t('outfits.ratingLabel')} aria-label={t('outfits.ratingLabel')} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>{t('outfits.cancel')}</button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} {t('outfits.save')}
            </button>
          </div>
        </form>
      )}

      <div className="outfits-grid">
        {outfits.map((outfit, index) => {
          const pins = Array.isArray(outfit.pins) ? outfit.pins : []
          const total = pins.reduce((sum, pin) => sum + (Number.isFinite(Number(pin.price)) ? Number(pin.price) : 0), 0)
          return (
            <article key={outfit.id} className="card outfit-card" style={{ cursor: 'default' }}>
              <div className="card-img outfit-card-image">
                <img src={imageSource(outfit.img)} alt={outfit.title} referrerPolicy="no-referrer" loading={index < 3 ? 'eager' : 'lazy'} fetchPriority={index < 3 ? 'high' : 'auto'} decoding="async" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = PLACEHOLDER }} />
                {pins.map((pin, pinIndex) => {
                  const href = pinHref(pin)
                  const content = <><MapPin size={14} /><span>{pinIndex + 1}</span></>
                  return href
                    ? <a className="outfit-pin-public" key={pin.id || pinIndex} href={href} target="_blank" rel="noreferrer" style={{ left: `${pin.x}%`, top: `${pin.y}%` }} title={`${pin.title || `Item ${pinIndex + 1}`} ${formatPrice(pin.price, pin.currency)}`}>{content}</a>
                    : <span className="outfit-pin-public disabled" key={pin.id || pinIndex} style={{ left: `${pin.x}%`, top: `${pin.y}%` }} title={pin.title}>{content}</span>
                })}
              </div>
              <div className="card-body">
                <span className="chip">{outfit.cat}</span>
                <h3>{outfit.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: '.84rem' }}>{outfit.desc}</p>
                <div className="outfit-card-actions">
                  <span className={`rating ${outfit.rating >= 9 ? 'hi' : ''}`}>{outfit.rating}/10</span>
                  <button
                    type="button"
                    className={`outfit-like-btn ${likedOutfits.includes(String(outfit.id)) ? 'active' : ''}`}
                    onClick={() => toggleLike(outfit.id)}
                    disabled={likingId === outfit.id}
                    aria-pressed={likedOutfits.includes(String(outfit.id))}
                    aria-label={isEn ? 'Like outfit' : 'Polub outfit'}
                  >
                    <Heart size={15} fill={likedOutfits.includes(String(outfit.id)) ? 'currentColor' : 'none'} />
                    <span>{Number(outfit.likes) || 0}</span>
                  </button>
                </div>
                {pins.length > 0 && (
                  <div className="outfit-items">
                    <div className="outfit-items-heading"><span>{t('outfits.pinTotal')}</span>{total > 0 && <strong>{formatPrice(total, pins.find(pin => pin.price != null)?.currency || 'PLN')}</strong>}</div>
                    {pins.map((pin, pinIndex) => {
                      const href = pinHref(pin)
                      const item = <><span className="outfit-item-index">{pinIndex + 1}</span><span className="outfit-item-name">{pin.title || (isEn ? 'Product' : 'Produkt')}</span>{pin.price != null && <strong>{formatPrice(pin.price, pin.currency)}</strong>}<ExternalLink size={13} /></>
                      return href ? <a key={pin.id || pinIndex} className="outfit-item-link" href={href} target="_blank" rel="noreferrer">{item}</a> : <div key={pin.id || pinIndex} className="outfit-item-link disabled">{item}</div>
                    })}
                  </div>
                )}
                {outfit.author && <small style={{ display: 'block', marginTop: 8, color: 'var(--muted)' }}>{isEn ? 'By' : 'Autor'}: {outfit.author}</small>}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
