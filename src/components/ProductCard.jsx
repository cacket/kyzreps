import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useFav } from '../context/FavContext'
import { usePrefs } from '../context/PrefsContext'
import { toast } from './Toast'
import { ArrowUpRight, Heart } from 'lucide-react'
import { toWeserv } from '../utils/img'
import { requestImage, releaseImage, reportImageError } from '../utils/imgLoader'
import { agentItemUrl } from '../utils/agents'

export function pln(v) {
  return v.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' zł'
}

const PLACEHOLDER = `data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='80' height='80'><rect width='24' height='24' fill='%23060c1a'/><path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' stroke='%234fc3f7' stroke-width='1' fill='none' stroke-linecap='round' stroke-linejoin='round'/><line x1='3' y1='6' x2='21' y2='6' stroke='%234fc3f7' stroke-width='1'/><path d='M16 10a4 4 0 01-8 0' stroke='%234fc3f7' stroke-width='1' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>`

const resolveCache = new Map()
const resolveInFlight = new Map()
let resolveBlockedUntil = 0
function resolveRemoteImageLegacy(rawUrl) {
  const key = String(rawUrl || '')
  if (!key) return Promise.resolve(null)
  if (Date.now() < resolveBlockedUntil) return Promise.resolve(null)
  if (resolveCache.has(key)) return Promise.resolve(resolveCache.get(key))
  if (resolveInFlight.has(key)) return resolveInFlight.get(key)
  const pending = fetch(`/api/image/resolve?url=${encodeURIComponent(key)}`)
    .then(r => {
      if (r.status === 429) {
        resolveBlockedUntil = Date.now() + 30000
        return null
      }
      return r.ok ? r.json() : null
    })
    .then(d => {
      if (d?.image) {
        resolveCache.set(key, d.image)
        if (resolveCache.size > 256) resolveCache.delete(resolveCache.keys().next().value)
      }
      return d
    })
    .catch(() => null)
    .finally(() => resolveInFlight.delete(key))
  resolveInFlight.set(key, pending)
  return pending
}

const resolveQueue = []
let resolveActive = 0
const RESOLVE_MAX = 3
function pumpResolvers() {
  while (resolveActive < RESOLVE_MAX && resolveQueue.length) {
    const job = resolveQueue.shift()
    resolveActive++
    fetch(`/api/image/resolve?url=${encodeURIComponent(job.key)}`)
      .then(r => {
        if (r.status === 429) {
          resolveBlockedUntil = Date.now() + 30000
          return null
        }
        return r.ok ? r.json() : null
      })
      .then(d => {
        if (d?.image) {
          resolveCache.set(job.key, d.image)
          if (resolveCache.size > 256) resolveCache.delete(resolveCache.keys().next().value)
        }
        job.resolve(d)
      })
      .catch(() => job.resolve(null))
      .finally(() => {
        resolveActive--
        resolveInFlight.delete(job.key)
        pumpResolvers()
      })
  }
}

function resolveRemoteImage(rawUrl) {
  const key = String(rawUrl || '')
  if (!key || Date.now() < resolveBlockedUntil) return Promise.resolve(null)
  if (resolveCache.has(key)) return Promise.resolve(resolveCache.get(key))
  if (resolveInFlight.has(key)) return resolveInFlight.get(key)
  const pending = new Promise(resolve => resolveQueue.push({ key, resolve }))
  resolveInFlight.set(key, pending)
  pumpResolvers()
  return pending
}

export default function ProductCard({ product: p, style, priority = false }) {
  const { has, toggle } = useFav()
  const { formatPrice, t } = usePrefs()
  const [src, setSrc] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const step = useRef(0)
  const released = useRef(false)
  const resolveTried = useRef(false)
  const img = p.img || null

  useEffect(() => {
    setSrc(null)
    setLoaded(false)
    step.current = 0
    released.current = false
    resolveTried.current = false
    if (!img) {
      if (!p.rawUrl) return
      let cancelled = false
      resolveRemoteImage(p.rawUrl).then(d => {
        if (cancelled) return
        if (d?.image) {
          setSrc(/file\.uufinds\.com|uufinds\.com/i.test(d.image)
            ? d.image
            : `/api/img?url=${encodeURIComponent(d.image)}`)
          setLoaded(false)
        } else {
          setSrc(PLACEHOLDER)
          setLoaded(true)
        }
      })
      return () => { cancelled = true }
    }
    const isGeili = /geilicdn\.com/i.test(img)
    const isBlockedPreviewHost = /^https?:\/\/(?:www\.)?postimg\.cc(?:\/|$)/i.test(img)
    const localProxy = `/api/img?url=${encodeURIComponent(img)}`

    if (isBlockedPreviewHost && !p.rawUrl) {
      let cancelled = false
      resolveTried.current = true
      resolveRemoteImage(p.rawUrl).then(d => {
        if (cancelled) return
        if (d?.image) {
          setSrc(`/api/img?url=${encodeURIComponent(d.image)}`)
          setLoaded(false)
        } else {
          setSrc(localProxy)
        }
      })
      return () => { cancelled = true }
    }

    const sources = [...new Set([
      isBlockedPreviewHost || /file\.uufinds\.com|uufinds\.com/i.test(img)
        ? img
        : (isGeili ? img : toWeserv(img, 400)),
      isGeili || !isBlockedPreviewHost ? localProxy : null,
      isGeili ? toWeserv(img, 400) : (isBlockedPreviewHost ? null : img),
    ].filter(Boolean))]
    const getSrc = () => sources[0]
    step.current = 0
    step.sources = sources
    const cancel = requestImage(getSrc, setSrc)
    return () => {
      cancel()
      doRelease()
    }
  }, [img])

  function doRelease() {
    if (!released.current) { releaseImage(); released.current = true }
  }

  function handleLoad() {
    setLoaded(true)
    doRelease()
  }

  function handleErr() {
    reportImageError()
    if (!resolveTried.current && /^https?:\/\/(?:www\.)?postimg\.cc(?:\/|$)/i.test(img) && p.rawUrl) {
      resolveTried.current = true
      resolveRemoteImage(p.rawUrl)
        .then(d => {
          if (d?.image) {
            setSrc(/file\.uufinds\.com|uufinds\.com/i.test(d.image)
              ? d.image
              : `/api/img?url=${encodeURIComponent(d.image)}`)
            setLoaded(false)
          } else {
            setSrc(PLACEHOLDER)
            setLoaded(true)
          }
        })
        .catch(() => { setSrc(PLACEHOLDER); setLoaded(true) })
      doRelease()
      return
    }
    const next = (step.sources || []).slice(step.current + 1).find(Boolean)
    if (next) {
      step.current += 1
      setSrc(next)
    } else {
      setSrc(PLACEHOLDER)
      setLoaded(true)
    }
    doRelease()
  }

  const handleFav = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggle(p.id)
    toast(has(p.id) ? t('prod.favRemoved') : t('prod.favAdded'))
  }

  const displaySrc = src || PLACEHOLDER
  const ossbuyUrl = p.rawUrl
    ? agentItemUrl('OSSbuy', p.rawUrl, p.title)
    : (p.buyUrl && !/kakobuy/i.test(p.buyUrl)
      ? p.buyUrl
      : agentItemUrl('OSSbuy', null, p.title))

  return (
    <article className="card" style={style}>
      <Link to={`/produkt/${p.id}`} className="card-main-link">
        <div className="card-img">
          {!loaded && <div className="skeleton" style={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: 'var(--radius-sm)' }} />}
          <img
            src={displaySrc}
            alt={p.title}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            referrerPolicy="no-referrer"
            decoding="async"
            onLoad={handleLoad}
            onError={handleErr}
            style={{ position: 'relative', zIndex: 1, opacity: loaded ? 1 : 0, transition: 'opacity .3s' }}
          />
          <button className={`fav-btn ${has(p.id) ? 'active' : ''}`} onClick={handleFav} aria-label={t('prod.favAdd')}>
            <Heart size={16} fill={has(p.id) ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="card-body">
          <div className="card-title-row">
            <h3 className="card-title">{p.title}</h3>
            <span className="price">{formatPrice(p.price)}</span>
          </div>
          <div className="card-meta">
            <span className="chip">{p.cat}</span>
          </div>
        </div>
      </Link>
      <a
        href={ossbuyUrl || 'https://www.ossbuy.com/register?inviteCode=Kyzreps'}
        target="_blank"
        rel="noopener noreferrer"
        className="card-agent-link"
        aria-label={`Otwórz ${p.title} w OSSbuy`}
      >
        <span>OSSbuy</span><ArrowUpRight size={14} />
      </a>
    </article>
  )
}
