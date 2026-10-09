import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useFav } from '../context/FavContext'
import { usePrefs } from '../context/PrefsContext'
import { toast } from '../components/Toast'
import { AGENTS, agentItemUrl } from '../utils/agents'
import { Heart, Loader2, ShoppingCart, ChevronRight, Eye, Store, ChevronLeft, X, SearchCheck } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { toWeserv, placeholderSvg } from '../utils/img'

function imageProxy(url) {
  if (!url) return ''
  const raw = String(url).trim()



  if (/^https?:\/\/(?:file\.)?uufinds\.com/i.test(raw)) return raw
  if (/postimg\.cc|iili\.io/i.test(raw)) return raw
  return `/api/img?url=${encodeURIComponent(raw)}`
}


function ProductGallery({ product, photos, variants, active, setActive, loading }) {
  const fallbackImg = product.img
    ? product.img
    : placeholderSvg(product.title, 800)

  const allPhotos = photos.length > 0 ? photos : [fallbackImg]
  const currentRaw = allPhotos[active] || fallbackImg
  const current = /^https?:/i.test(currentRaw) ? imageProxy(currentRaw) : currentRaw

  const tryFallback = (event, raw) => {
    if (event.currentTarget.dataset.fallback) {
      event.currentTarget.src = '/image-placeholder.svg'
      return
    }
    event.currentTarget.dataset.fallback = '1'
    event.currentTarget.src = /postimg\.cc|iili\.io/i.test(raw)
      ? imageProxy(raw)
      : toWeserv(raw, 800)
  }

  return (
    <>

      <div className="gallery-main" style={{cursor:'default'}}>
        {loading && <div className="skeleton" style={{position:'absolute',inset:0,zIndex:0,borderRadius:'var(--radius)'}} />}
        <img src={current} alt={product.title} referrerPolicy="no-referrer" decoding="async"
          onError={e => tryFallback(e, currentRaw)}
        />
      </div>


      {allPhotos.length > 1 && (
        <div className="gallery-thumbs">
          {allPhotos.map((ph, i) => (
            <button
              key={i}
              className={`gallery-thumb ${i === active ? 'active' : ''}`}
              onClick={() => setActive(i)}
            >
              <img src={/^https?:/i.test(ph) ? imageProxy(ph) : ph} alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async"
                onError={e => tryFallback(e, ph)}
              />
            </button>
          ))}
        </div>
      )}
    </>
  )
}

export default function Product() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [uuAgents, setUuAgents] = useState([])
  const [photos, setPhotos] = useState([])
  const [variants, setVariants] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedColorImg, setSelectedColorImg] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const { has, toggle, getColor, getColorImg } = useFav()
  const { prefs, t, formatPrice } = usePrefs()

  const rawUrl = product?.rawUrl || null

  useEffect(() => {
    setUuAgents([])
    setPhotos([])
    setVariants([])
    setGalleryLoading(false)
    setActivePhotoIdx(0)
    setSelectedColor(null)
    setSelectedColorImg(null)
    setSelectedSize(null)
    fetch(`/api/products/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        if (!p) return setProduct(null)
        setProduct(p)
        fetch(`/api/products/similar/${p.id}`)
          .then(r => r.json())
          .then(d => setRelated((d.items || []).slice(0, 6)))
        if (p.rawUrl) {
          fetch(`/api/uu-agents?url=${encodeURIComponent(p.rawUrl)}`)
            .then(r => r.json())
            .then(d => {
              if (d.success && Array.isArray(d.agents) && d.agents.length) setUuAgents(d.agents)
            })
            .catch(() => {})
          setGalleryLoading(true)
          fetch(`/api/product-gallery?url=${encodeURIComponent(p.rawUrl)}`)
            .then(r => r.json())
            .then(d => {
              if (d.success && (d.photos?.length || d.variants?.length)) {
                setPhotos(d.photos || [])
                setVariants(d.variants || [])
                setActivePhotoIdx(0)
              }
            })
            .catch(() => {})
            .finally(() => setGalleryLoading(false))
        }
      })
  }, [id])

  if (!product) {
    return (
      <main className="wrap" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <div className="skeleton" style={{ width: '100%', height: 280, borderRadius: 'var(--radius)' }} aria-label="Ładowanie produktu" />
      </main>
    )
  }

  const fallbackImg = product?.img
    ? imageProxy(product.img)
    : product ? placeholderSvg(product.title, 800) : ''

  const allPhotos = photos.length > 0 ? photos : [fallbackImg]
  const current = allPhotos[activePhotoIdx] || fallbackImg

  const normalize = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '')


  const uuMap = new Map()
  if (uuAgents.length > 0) {
    uuAgents.forEach(a => {
      const key = normalize(a.name)
      uuMap.set(key, { name: a.name, logo: a.logo, buyUrl: a.link })
      if (key === 'oosbuy') uuMap.set('ossbuy', { name: a.name, logo: a.logo, buyUrl: a.link })
      if (key === 'ossbuy') uuMap.set('oosbuy', { name: a.name, logo: a.logo, buyUrl: a.link })
    })
  }

  const agentLinks = AGENTS
    .map(a => {
      const key = normalize(a.name)
      const fromUu = uuMap.get(key)
      if (fromUu?.buyUrl) return { name: a.name, logo: fromUu.logo || a.logo || '', buyUrl: fromUu.buyUrl }
      if (rawUrl) {
        const fallback = agentItemUrl(a.name, rawUrl, product.title)
        if (fallback && !fallback.includes('allapp.link')) return { name: a.name, logo: a.logo || '', buyUrl: fallback }
      }
      if (!rawUrl && product.buyUrl && key === 'kakobuy') {
        return { name: a.name, logo: a.logo || '', buyUrl: product.buyUrl }
      }
      if (!rawUrl && product.title) {
        const searchLink = agentItemUrl(a.name, null, product.title)
        if (searchLink) return { name: a.name, logo: a.logo || '', buyUrl: searchLink }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => (normalize(a.name) === normalize(prefs.agent) ? -1 : 0) - (normalize(b.name) === normalize(prefs.agent) ? -1 : 0))

  const preferredAgent = AGENTS.find(a => normalize(a.name) === normalize(prefs.agent)) || AGENTS[0]
  const primary = agentLinks[0] || { name: preferredAgent.name, logo: preferredAgent.logo || '', buyUrl: preferredAgent.affLink }
  const primaryBuyUrl = primary.buyUrl || preferredAgent.affLink

  const toggleFav = (color = null, colorImg = null) => {
    toggle(product.id, color, colorImg)
    toast(has(product.id) ? t('prod.favRemoved') : t('prod.favAdded'))
  }

  const handleColorSelect = (val) => {
    setSelectedColor(val.name)
    setSelectedColorImg(val.img || null)
    if (val.img) {
      const idx = allPhotos.findIndex(p => p === val.img)
      if (idx >= 0) setActivePhotoIdx(idx)
      else setPhotos(prev => [...prev, val.img])
    }
  }

  return (
    <section className="section wrap" style={{maxWidth: 960}}>
      <nav className="breadcrumbs">
        <Link to="/">{t('bc.home')}</Link>
        <ChevronRight size={14} />
        <Link to="/produkty">{t('nav.products')}</Link>
        <ChevronRight size={14} />
        <span>{product.cat}</span>
      </nav>

      <div className="prod-hero">
        <div className="prod-gallery-col">
          <ProductGallery
            product={product}
            photos={photos}
            variants={variants}
            active={activePhotoIdx}
            setActive={setActivePhotoIdx}
            loading={galleryLoading}
          />
        </div>

        <div className="prod-info">
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <span className="chip">{product.cat}</span>
            {product.brand && <span className="prod-brand">{product.brand}</span>}
          </div>

          <h1 className="prod-title">{product.title}</h1>

          <div className="prod-prices">
            <span className="price-main">{formatPrice(product.price)}</span>
            <span className="price-usd">${(product.price / 4.18).toFixed(2)} USD</span>
          </div>

          <div className="prod-meta-grid">
            <div className="prod-meta-item">
              <Store size={16} />
              <div>
                <span className="meta-label">{t('prod.seller')}</span>
                <span className="meta-value">{product.platform}</span>
              </div>
            </div>
            <div className="prod-meta-item">
              <Eye size={16} />
              <div>
                <span className="meta-label">{t('prod.views')}</span>
                <span className="meta-value">{Math.floor(Math.random() * 50) + 5}</span>
              </div>
            </div>
          </div>

          <div className="prod-actions">
            <a href={primaryBuyUrl} target="_blank" rel="noopener" className="btn btn-primary btn-lg prod-buy-btn">
              <ShoppingCart size={18} />
              {rawUrl ? `${t('prod.buyAgent')} ${primary?.name}` : `${t('prod.findAgent')} ${primary?.name}`}
            </a>
            <a
              href={`/qc?url=${encodeURIComponent(primaryBuyUrl)}`}
              className="btn btn-ghost btn-lg"
            >
              <SearchCheck size={18} /> {t('prod.checkQc')}
            </a>
            <button className="btn btn-ghost btn-lg" onClick={() => toggleFav(selectedColor, selectedColorImg)}>
              <Heart size={18} fill={has(product.id) ? 'currentColor' : 'none'} />
              {has(product.id) ? t('prod.favIn') : t('prod.favAdd')}
            </button>
          </div>

          {variants.length > 0 && (
            <div className="prod-variants">
              {variants.map((variant, variantIndex) => {
                const label = String(variant.name || '').toLowerCase()
                const isColor = /color|colour|kolor|颜色|颜色分类/.test(label)
                const isSize = /size|rozmiar|尺码/.test(label)
                const values = (variant.values || []).filter(value => value?.name || value?.img)
                if (!values.length) return null
                return (
                  <div className="prod-variant-group" key={variant.name || variantIndex}>
                    <span className="prod-variant-label">{isColor ? (prefs.lang === 'en' ? 'Color' : 'Kolor') : isSize ? (prefs.lang === 'en' ? 'Size' : 'Rozmiar') : variant.name}</span>
                    <div className={isColor ? 'prod-color-options' : 'prod-size-options'}>
                      {values.map((value, valueIndex) => {
                        const active = isColor ? selectedColor === value.name : isSize ? selectedSize === value.name : false
                        return (
                          <button
                            type="button"
                            key={value.id || valueIndex}
                            className={`${isColor ? 'prod-color-option' : 'prod-size-option'} ${active ? 'active' : ''}`}
                            title={value.name}
                            onClick={() => isColor ? handleColorSelect(value) : isSize ? setSelectedSize(value.name) : undefined}
                          >
                            {isColor && value.img ? <img src={imageProxy(value.img)} alt={value.name} loading="lazy" decoding="async" /> : value.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {product.description && (
            <div className="prod-desc">
              <p>{product.description}</p>
            </div>
          )}

          <div className="prod-agents-list">
            <h3>{t('prod.agents')}</h3>
            <div className="agents-grid">
              {agentLinks.map(link => {
                const isPref = link.name.toLowerCase().replace(/[^a-z]/g, '') === prefs.agent.toLowerCase().replace(/[^a-z]/g, '')
                return (
                  <a
                    key={link.name}
                    href={link.buyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`agent-buy-link ${isPref ? 'preferred' : ''}`}
                  >
                    {link.logo && <img src={link.logo} alt="" style={{width:20,height:20,borderRadius:5,objectFit:'cover'}} />}
                    <span className="agent-buy-name">{link.name}{isPref ? ' ★' : ''}</span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div style={{marginTop:48}}>
          <h2 style={{fontSize:'1.3rem',marginBottom:20}}>{t('prod.similar')}</h2>
          <div className="grid-products">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      <style>{`
        .breadcrumbs { display:flex; align-items:center; gap:8px; font-size:.85rem; color:var(--muted); margin-bottom:24px; flex-wrap:wrap; }
        .breadcrumbs a { color:var(--green); transition:.15s; }
        .breadcrumbs a:hover { color:var(--green-bright); }
        .breadcrumbs span { color:var(--text); }
        .prod-hero { display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:start; }


        .prod-gallery-col { display:flex; flex-direction:column; gap:10px; position:sticky; top:80px; }
        .gallery-main { position:relative; border-radius:var(--radius); overflow:hidden; border:1px solid var(--border); background:var(--card-2); cursor:default; aspect-ratio:1; }
        .gallery-main img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .3s; }
        .gallery-main:hover img { transform:scale(1.03); }
        .gallery-thumbs { display:flex; gap:8px; flex-wrap:wrap; }
        .gallery-thumb { width:62px; height:62px; border-radius:8px; overflow:hidden; border:2px solid var(--border); cursor:pointer; transition:.15s; padding:0; background:var(--card-2); flex-shrink:0; }
        .gallery-thumb img { width:100%; height:100%; object-fit:cover; }
        .gallery-thumb.active { border-color:var(--green); box-shadow:0 0 0 2px rgba(79,195,247,.3); }
        .gallery-thumb:hover { border-color:var(--border-hover); }

        .fav-btn-prod { width:40px; height:40px; border-radius:50%; background:var(--card); border:1px solid var(--border-hover); color:var(--muted); display:grid; place-items:center; cursor:pointer; transition:.18s; }
        .fav-btn-prod:hover { color:var(--green-bright); border-color:var(--green); transform:scale(1.1); }
        .fav-btn-prod.active { color:var(--green-bright); background:rgba(79,195,247,.18); border-color:var(--green); }
        .prod-title { font-size:1.6rem; margin:0 0 14px; line-height:1.2; }
        .prod-prices { display:flex; align-items:baseline; gap:12px; margin-bottom:20px; }
        .price-main { font-family:var(--font-head); font-weight:800; font-size:1.8rem; color:var(--green-bright); }
        .price-usd { font-size:1rem; color:var(--muted); font-weight:500; }
        .prod-brand { font-size:.74rem; color:var(--muted); border:1px solid var(--border); border-radius:6px; padding:2px 8px; }
        .prod-meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px; }
        .prod-meta-item { display:flex; align-items:center; gap:10px; background:var(--card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:12px 16px; color:var(--green); }
        .prod-meta-item div { display:flex; flex-direction:column; }
        .meta-label { font-size:.72rem; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; }
        .meta-value { font-size:.95rem; font-weight:600; color:var(--text); }
        .prod-actions { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:24px; }
        .prod-buy-btn { flex:1; min-width:200px; }
        .prod-variants { display:grid; gap:18px; margin:4px 0 24px; padding:16px; background:rgba(255,255,255,.025); border:1px solid var(--border); border-radius:12px; }
        .prod-variant-group { display:grid; gap:9px; }
        .prod-variant-label { color:var(--muted); font-size:.7rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
        .prod-color-options, .prod-size-options { display:flex; flex-wrap:wrap; gap:8px; }
        .prod-color-option, .prod-size-option { border:1px solid var(--border); background:var(--card-2); color:var(--muted); cursor:pointer; transition:.15s; }
        .prod-color-option { width:46px; height:46px; padding:0; overflow:hidden; border-radius:8px; }
        .prod-color-option img { width:100%; height:100%; object-fit:cover; display:block; }
        .prod-size-option { min-width:106px; min-height:36px; padding:8px 12px; border-radius:8px; font-size:.78rem; font-weight:600; }
        .prod-color-option:hover, .prod-color-option.active, .prod-size-option:hover, .prod-size-option.active { border-color:var(--green); color:var(--text); box-shadow:0 0 0 2px var(--green-glow); }
        .prod-desc { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:18px; margin-bottom:24px; }
        .prod-desc p { color:var(--muted); font-size:.9rem; line-height:1.6; margin:0; }
        .prod-agents-list h3 { font-size:.95rem; margin-bottom:12px; color:var(--text); }
        .agents-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:8px; }
        .agent-buy-link { display:flex; align-items:center; gap:8px; background:var(--card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px 14px; font-size:.85rem; font-weight:600; color:var(--muted); transition:.18s; text-decoration:none; }
        .agent-buy-link:hover { border-color:var(--green); color:var(--green-bright); transform:translateY(-2px); }
        .agent-buy-link.preferred { border-color:var(--green); background:rgba(79,195,247,.08); color:var(--green-bright); box-shadow:0 0 0 1px var(--green-glow); }
        .agent-buy-name { flex:1; }
        @media (max-width:768px) {
          .prod-hero { grid-template-columns:1fr; }
          .prod-gallery-col { position:static; }
          .gallery-thumb { width:52px; height:52px; }
        }
      `}</style>
    </section>
  )
}
