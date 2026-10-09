import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { ChevronDown, SlidersHorizontal, Search, Grid, ShoppingBag, Package, Footprints, Shirt, Layers, Circle, Backpack, Minus, Watch, Cpu, HelpCircle, X, Tag } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

const CATEGORY_KEYS = [
  'cat.all', 'Buty', 'Spodenki', 'Spodnie', 'Koszulki', 'Longsleeve',
  'Bluzy', 'Kurtki', 'Nakrycie głowy', 'Torby i plecaki', 'Pasy',
  'Akcesoria', 'Elektronika', 'Inne',
]

const CAT_ICONS = {
  'cat.all':          <Grid size={14} />,
  'Buty':             <Footprints size={14} />,
  'Spodenki':         <Package size={14} />,
  'Spodnie':          <Layers size={14} />,
  'Koszulki':         <Shirt size={14} />,
  'Longsleeve':       <Shirt size={14} />,
  'Bluzy':            <ShoppingBag size={14} />,
  'Kurtki':           <ShoppingBag size={14} />,
  'Nakrycie głowy':   <Circle size={14} />,
  'Torby i plecaki':  <Backpack size={14} />,
  'Pasy':             <Minus size={14} />,
  'Akcesoria':        <Watch size={14} />,
  'Elektronika':      <Cpu size={14} />,
  'Inne':             <HelpCircle size={14} />,
}

const CAT_I18N = {
  'cat.all':          { pl: 'Wszystkie',        en: 'All' },
  'Buty':             { pl: 'Buty',             en: 'Shoes' },
  'Spodenki':         { pl: 'Spodenki',         en: 'Shorts' },
  'Spodnie':          { pl: 'Spodnie',          en: 'Pants' },
  'Koszulki':         { pl: 'Koszulki',         en: 'T-Shirts' },
  'Longsleeve':       { pl: 'Longsleeve',       en: 'Longsleeve' },
  'Bluzy':            { pl: 'Bluzy',            en: 'Hoodies' },
  'Kurtki':           { pl: 'Kurtki',           en: 'Jackets' },
  'Nakrycie głowy':   { pl: 'Nakrycie głowy',   en: 'Headwear' },
  'Torby i plecaki':  { pl: 'Torby i plecaki',  en: 'Bags' },
  'Pasy':             { pl: 'Pasy',             en: 'Belts' },
  'Akcesoria':        { pl: 'Akcesoria',        en: 'Accessories' },
  'Elektronika':      { pl: 'Elektronika',      en: 'Electronics' },
  'Inne':             { pl: 'Inne',             en: 'Other' },
}

const listView = {
  products: [], page: 1, total: 0, done: false,
  search: '', cat: 'cat.all', gender: 'all', min: '', max: '', brand: '', sort: '', scrollY: 0,
}

export default function Products() {
  const [params] = useSearchParams()
  const requestedCat = params.get('cat')
  const requestedGender = params.get('gender')
  const initialCat = CATEGORY_KEYS.includes(requestedCat) ? requestedCat : listView.cat
  const initialGender = ['all', 'women', 'men', 'unisex'].includes(requestedGender) ? requestedGender : (listView.gender || 'men')
  const [products, setProducts]       = useState(listView.products)
  const [total, setTotal]             = useState(listView.total)
  const [page, setPage]               = useState(listView.page)
  const [search, setSearch]           = useState(listView.search || params.get('q') || '')
  const [searchInput, setSearchInput] = useState(listView.search || params.get('q') || '')
  const [cat, setCat]                 = useState(initialCat)
  const [gender, setGender]           = useState(initialGender)
  const [min, setMin]                 = useState(listView.min)
  const [minInput, setMinInput]       = useState(listView.min)
  const [max, setMax]                 = useState(listView.max)
  const [maxInput, setMaxInput]       = useState(listView.max)
  const [brand, setBrand]             = useState(listView.brand || '')
  const [sort, setSort]               = useState(listView.sort || '')
  const [brandList, setBrandList]     = useState([])
  const [showSort, setShowSort]       = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading]         = useState(listView.products.length === 0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [done, setDone]               = useState(listView.done)
  const sentinelRef = useRef(null)
  const firstRun    = useRef(true)
  const loadingMoreRef = useRef(false)
  const pageRequestsRef = useRef(new Set())
  const filterGenerationRef = useRef(0)
  const { t, prefs } = usePrefs()
  const isEn = prefs.lang === 'en'
  const catLabel = (c) => CAT_I18N[c]?.[isEn ? 'en' : 'pl'] ?? c


  const filterCount = (cat !== 'cat.all' ? 1 : 0) + (gender !== 'all' ? 1 : 0) + (brand ? 1 : 0) + (min ? 1 : 0) + (max ? 1 : 0)

  const buildUrl = useCallback((p, q, c, mn, mx, br, so, ge) => {
    const pr = [`page=${p}`, 'limit=24']
    if (q)  pr.push(`q=${encodeURIComponent(q)}`)
    if (c !== 'cat.all') pr.push(`cat=${encodeURIComponent(c)}`)
    if (mn) pr.push(`min=${encodeURIComponent(mn)}`)
    if (mx) pr.push(`max=${encodeURIComponent(mx)}`)
    if (br) pr.push(`brand=${encodeURIComponent(br)}`)
    if (so) pr.push(`sort=${encodeURIComponent(so)}`)
    if (ge && ge !== 'all') pr.push(`gender=${encodeURIComponent(ge)}`)
    return `/api/products?${pr.join('&')}`
  }, [])

  const loadPage = useCallback((p, q, c, mn, mx, reset, br, so, ge) => {
    const requestKey = [p, q, c, mn, mx, br, so, ge].map(v => String(v || '')).join('|')




    if (reset) {
      for (const key of pageRequestsRef.current) {
        if (key !== requestKey) pageRequestsRef.current.delete(key)
      }
    }
    if (pageRequestsRef.current.has(requestKey)) return Promise.resolve()
    pageRequestsRef.current.add(requestKey)


    if (!reset && (loadingMoreRef.current || done)) {
      pageRequestsRef.current.delete(requestKey)
      return Promise.resolve()
    }
    if (reset) {
      loadingMoreRef.current = false
      setLoading(true)
      filterGenerationRef.current += 1
    } else {
      loadingMoreRef.current = true
      setLoadingMore(true)
    }
    const generation = filterGenerationRef.current
    return fetch(buildUrl(p, q, c, mn, mx, br, so, ge))
      .then(r => {
        if (!r.ok) {

          if (r.status === 429) {
            setDone(true)
            listView.done = true
          }
          throw new Error(`HTTP ${r.status}`)
        }
        return r.json()
      })
      .then(d => {


        if (generation !== filterGenerationRef.current) return
        const items = d.items || []
        setProducts(prev => {
          const next = reset ? items : [...prev, ...items]
          listView.products = next
          return next
        })
        setTotal(d.total)
        setPage(p)
        listView.page = p
        listView.total = d.total
        const reachedEnd = items.length === 0 || (reset ? items.length : products.length + items.length) >= d.total
        setDone(reachedEnd)
        listView.done = reachedEnd
      })
      .catch(() => {
        if (generation === filterGenerationRef.current) pageRequestsRef.current.delete(requestKey)
      })
      .finally(() => {
        if (generation !== filterGenerationRef.current) return
        if (!reset) loadingMoreRef.current = false
        setLoading(false)
        setLoadingMore(false)
      })
  }, [products, buildUrl, done])

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false


      if (products.length === 0 || requestedCat || requestedGender || params.get('q')) {
        loadPage(1, search, cat, min, max, true, brand, sort, gender)
      }
      return
    }
    loadPage(1, search, cat, min, max, true, brand, sort, gender)

  }, [search, cat, gender, min, max, brand, sort])



  useEffect(() => {
    const el = sentinelRef.current
    if (!el || done || loading || loadingMore) return
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadPage(page + 1, search, cat, min, max, false, brand, sort, gender)
    }, { rootMargin: '700px' })
    io.observe(el)
    return () => io.disconnect()
  }, [page, search, cat, gender, min, max, brand, sort, done, loading, loadingMore, loadPage])




  useEffect(() => {
    const onScroll = () => {
      if (done || loading || loadingMoreRef.current) return
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 900
      if (nearBottom) loadPage(page + 1, search, cat, min, max, false, brand, sort, gender)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [page, search, cat, gender, min, max, brand, sort, done, loading, loadPage])

  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(d => setBrandList(d.brands || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => { listView.scrollY = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { listView.scrollY = window.scrollY; window.removeEventListener('scroll', onScroll) }
  }, [])

  useEffect(() => {
    if (listView.scrollY <= 0) return
    const r = requestAnimationFrame(() => window.scrollTo({ top: listView.scrollY, behavior: 'auto' }))
    const tm = setTimeout(() => window.scrollTo({ top: listView.scrollY, behavior: 'auto' }), 300)
    return () => { cancelAnimationFrame(r); clearTimeout(tm) }

  }, [])

  const applyFilters = (e) => {
    e?.preventDefault()
    setSearch(searchInput)
    setMin(minInput)
    setMax(maxInput)
    setPage(1)
    listView.search = searchInput
    listView.min = minInput
    listView.max = maxInput
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const handleCat = (c, e) => {
    e?.preventDefault()
    e?.stopPropagation()
    setCat(c)
    setPage(1)
    listView.cat = c
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const handleGender = (value, e) => {
    e?.preventDefault()
    e?.stopPropagation()
    setGender(value)
    setPage(1)
    listView.gender = value
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const handleBrand = (e) => {
    setBrand(e.target.value)
    setPage(1)
    listView.brand = e.target.value
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const handleSort = (val) => {
    setSort(val)
    setPage(1)
    listView.sort = val
    setShowSort(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const clearFilters = () => {
    setCat('cat.all'); setGender('all'); setBrand(''); setMin(''); setMax('')
    setMinInput(''); setMaxInput('')
    listView.cat = 'cat.all'; listView.gender = 'all'; listView.brand = ''; listView.min = ''; listView.max = ''
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  if (loading && products.length === 0) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 24,
      }}>
        <img src="/logo.png" alt="KyzReps" style={{
          width: 90, height: 90, borderRadius: 22,
          animation: 'splashSpin 1.2s linear infinite',
          boxShadow: '0 0 40px rgba(14,76,166,0.5)',
        }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>KyzReps</p>
          <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>Ładowanie produktów...</p>
        </div>
        <div style={{
          width: 200, height: 3, background: 'var(--border)',
          borderRadius: 999, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: '40%',
            background: 'linear-gradient(90deg, #0E4CA6, #4fc3f7)',
            borderRadius: 999,
            animation: 'splashBar 1.2s ease-in-out infinite alternate',
          }} />
        </div>
        <style>{`
          @keyframes splashSpin { to { transform: rotate(360deg); } }
          @keyframes splashBar { from { transform: translateX(-100%); } to { transform: translateX(350%); } }
        `}</style>
      </div>
    )
  }

  return (
    <section className="section wrap" style={{ paddingTop: 20 }}>


      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>


        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyFilters(e) }}
            placeholder={isEn ? 'Search…' : 'Szukaj...'}
            autoComplete="off"
            style={{
              width: '100%', background: 'var(--bg-2)', border: 'none',
              color: 'var(--text)', borderRadius: 12,
              padding: '12px 14px 12px 38px', outline: 'none', fontSize: '.9rem',
            }}
          />
        </div>


        <div style={{ position: 'relative', flex: 'none' }}>
          <button className="sort-btn" onClick={() => setShowSort(v => !v)}>
            <span>
              {sort === 'price_asc'  ? (isEn ? 'Cheapest' : 'Od najtańszych')
               : sort === 'price_desc' ? (isEn ? 'Most expensive' : 'Od najdroższych')
               : (isEn ? 'Newest' : 'Najnowsze')}
            </span>
            <ChevronDown size={15} style={{ flex: 'none', transform: showSort ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
          {showSort && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6,
              minWidth: 180, background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden', zIndex: 20, boxShadow: '0 8px 28px rgba(0,0,0,.35)',
            }}>
              {[
                { val: '',           label: isEn ? 'Newest' : 'Najnowsze' },
                { val: 'price_asc',  label: isEn ? 'Cheapest first' : 'Od najtańszych' },
                { val: 'price_desc', label: isEn ? 'Most expensive' : 'Od najdroższych' },
              ].map(o => (
                <button key={o.val} onClick={() => handleSort(o.val)} className="sort-dropdown-item"
                  style={{ background: sort === o.val ? 'var(--green-glow)' : 'transparent' }}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>


        <button onClick={() => setShowFilters(v => !v)} className="filtry-btn">
          <SlidersHorizontal size={15} />
          <span>{isEn ? 'Filters' : 'Filtry'}</span>
          {filterCount > 0 && <span className="filtry-badge">{filterCount}</span>}
        </button>
      </div>


      {showFilters && (
        <div style={{
          marginBottom: 18, background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 20,
        }}>


          <div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 10, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>
              {isEn ? 'Gender' : 'Płeć'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label={isEn ? 'Gender' : 'Płeć'}>
              {[
                ['all', isEn ? 'All' : 'Wszystkie'],
                ['women', isEn ? 'Women' : 'Kobiety'],
                ['men', isEn ? 'Men' : 'Mężczyźni'],
                ['unisex', 'Unisex'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => handleGender(value)}
                  style={{
                    padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontSize: '.82rem', fontWeight: 700,
                    border: `1px solid ${gender === value ? 'var(--green)' : 'var(--border)'}`,
                    background: gender === value ? 'var(--green)' : 'var(--bg-2)',
                    color: gender === value ? '#03060f' : 'var(--muted)',
                    transition: 'all .15s',
                  }}
                >{label}</button>
              ))}
            </div>
          </div>


          <div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 10, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>
              {isEn ? 'Category' : 'Kategoria'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORY_KEYS.map(c => (
                <button
                  key={c}
                  onClick={() => handleCat(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px',
                    background: cat === c ? 'var(--green)' : 'var(--bg-2)',
                    color: cat === c ? '#03060f' : 'var(--muted)',
                    border: `1px solid ${cat === c ? 'var(--green)' : 'var(--border)'}`,
                    borderRadius: 999, cursor: 'pointer', fontSize: '.82rem', fontWeight: 600,
                    transition: 'all .15s',
                  }}
                >
                  {CAT_ICONS[c]}
                  {catLabel(c)}
                </button>
              ))}
            </div>
          </div>


          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

            <div style={{ flex: '1 1 160px', minWidth: 140 }}>
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                <Tag size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                {isEn ? 'Brand' : 'Marka'}
              </div>
              <select value={brand} onChange={handleBrand} className="filter-select">
                <option value="">{isEn ? 'All brands' : 'Wszystkie'}</option>
                {brandList.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>


            <div style={{ flex: '1 1 100px', minWidth: 100 }}>
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                {isEn ? 'Price from' : 'Cena od'}
              </div>
              <input
                type="number" min="0" value={minInput}
                onChange={e => setMinInput(e.target.value)}
                placeholder="0"
                className="filter-select"
                style={{ width: '100%' }}
              />
            </div>


            <div style={{ flex: '1 1 100px', minWidth: 100 }}>
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                {isEn ? 'Price to' : 'Cena do'}
              </div>
              <input
                type="number" min="0" value={maxInput}
                onChange={e => setMaxInput(e.target.value)}
                placeholder="∞"
                className="filter-select"
                style={{ width: '100%' }}
              />
            </div>
          </div>


          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {filterCount > 0 && (
              <button onClick={clearFilters} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <X size={14} /> {isEn ? 'Clear filters' : 'Wyczyść filtry'}
              </button>
            )}
            <button onClick={applyFilters} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={14} /> {isEn ? 'Apply' : 'Zastosuj'}
            </button>
          </div>
        </div>
      )}


      {filterCount > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {gender !== 'all' && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--green-glow)', border: '1px solid var(--green)',
              color: 'var(--green)', borderRadius: 999, padding: '4px 10px', fontSize: '.8rem', fontWeight: 600,
            }}>
              {gender === 'women' ? (isEn ? 'Women' : 'Kobiety') : gender === 'unisex' ? 'Unisex' : (isEn ? 'Men' : 'Mężczyźni')}
              <button onClick={e => handleGender('all', e)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                <X size={12} />
              </button>
            </span>
          )}
          {cat !== 'cat.all' && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--green-glow)', border: '1px solid var(--green)',
              color: 'var(--green)', borderRadius: 999, padding: '4px 10px', fontSize: '.8rem', fontWeight: 600,
            }}>
              {CAT_ICONS[cat]} {catLabel(cat)}
              <button onClick={e => handleCat('cat.all', e)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                <X size={12} />
              </button>
            </span>
          )}
          {brand && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--green-glow)', border: '1px solid var(--green)',
              color: 'var(--green)', borderRadius: 999, padding: '4px 10px', fontSize: '.8rem', fontWeight: 600,
            }}>
              <Tag size={12} /> {brand}
              <button onClick={() => { setBrand(''); listView.brand = '' }} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                <X size={12} />
              </button>
            </span>
          )}
          {(min || max) && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--green-glow)', border: '1px solid var(--green)',
              color: 'var(--green)', borderRadius: 999, padding: '4px 10px', fontSize: '.8rem', fontWeight: 600,
            }}>
              {min || '0'} – {max || '∞'} zł
              <button onClick={() => { setMin(''); setMax(''); setMinInput(''); setMaxInput(''); listView.min = ''; listView.max = '' }}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}


      <div className="grid-products">
        {products.map((p, i) => (
          <ProductCard
            key={`${p.id}-${i}`}
            product={p}
            style={{ transitionDelay: `${(i % 8) * 15}ms` }}
            priority={i < 10}
          />
        ))}
      </div>

      {products.length === 0 && !loading && (
        <p className="empty-note">{t('products.empty')}</p>
      )}

      <div ref={sentinelRef} style={{ height: 10 }} />
      {loadingMore && <p className="empty-note" style={{ padding: '18px 0' }}>{t('products.loadingMore')}</p>}
      {done && products.length > 0 && <p className="empty-note" style={{ padding: '18px 0' }}></p>}
    </section>
  )
}
