import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useFav } from '../context/FavContext'
import { usePrefs } from '../context/PrefsContext'
import { Heart, ArrowRight } from 'lucide-react'
import ProductCard from '../components/ProductCard'

export default function Favorites() {
  const { favs } = useFav()
  const [products, setProducts] = useState([])
  const { t } = usePrefs()

  useEffect(() => {
    const ids = Object.keys(favs)
    if (ids.length === 0) { setProducts([]); return }
    fetch('/api/products?limit=999')
      .then(r => r.json())
      .then(d => setProducts(d.items.filter(p => ids.includes(String(p.id)))))
  }, [favs])

  return (
    <section className="section wrap">
      <div className="section-head">
        <div>
          <span className="eyebrow"><Heart size={14} /> {t('fav.eyebrow')}</span>
          <h1>{t('fav.title')}</h1>
          <p style={{color:'var(--muted)'}}>{t('fav.desc')}</p>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="grid-products">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <p className="empty-note">
          <Heart size={20} style={{marginBottom:8,display:'block',marginInline:'auto'}} />
          {t('fav.empty')}
        </p>
      )}

      <div className="center-link">
        <Link to="/produkty" className="btn btn-ghost btn-lg" style={{marginTop:30}}><ArrowRight size={16} /> {t('fav.browse')}</Link>
      </div>
    </section>
  )
}
