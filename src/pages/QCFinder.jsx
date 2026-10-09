import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchCode, CheckCircle, AlertCircle, ExternalLink, Loader2, ImageIcon } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

export default function QCFinder() {
  const [searchParams] = useSearchParams()
  const prefilledUrl = searchParams.get('url') || ''
  const [url, setUrl] = useState(prefilledUrl)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 12
  const { t } = usePrefs()


  useEffect(() => { setPage(1) }, [result])

  useEffect(() => {
    if (prefilledUrl) {
      setUrl(prefilledUrl)
      setLoading(true)
      setResult({ status: 'loading' })
      fetch(`/api/qc-photos?url=${encodeURIComponent(prefilledUrl.trim())}`)
        .then(r => r.json())
        .then(json => {
          if (json.success) {
            setResult({ status: 'ok', photos: json.photos || [], totalPhotos: json.totalPhotos || 0, info: json.info || null })
          } else {
            setResult({ status: 'error', msg: json.message || t('qc.noDataDesc') })
          }
        })
        .catch(() => setResult({ status: 'error', msg: t('qc.errorConn') }))
        .finally(() => setLoading(false))
    }
  }, [])

  const check = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setResult({ status: 'loading' })

    try {
      const res = await fetch(`/api/qc-photos?url=${encodeURIComponent(url.trim())}`)
      const json = await res.json()

      if (json.success) {
        setResult({
          status: 'ok',
          photos: json.photos || [],
          totalPhotos: json.totalPhotos || 0,
          info: json.info || null,
        })
      } else {
        setResult({ status: 'error', msg: json.message || t('qc.noDataDesc') })
      }
    } catch {
      setResult({ status: 'error', msg: t('qc.errorConn') })
    }
    setLoading(false)
  }

  return (
    <section className="section wrap" style={{maxWidth: 780}}>
      <span className="eyebrow"><SearchCode size={14} /> {t('qc.eyebrow')}</span>
      <h1 style={{marginBottom:10}}>{t('qc.title')}</h1>
      <p style={{color:'var(--muted)',marginBottom:32}}>
        {t('qc.desc')}
      </p>

      <div className="panel">
        <form onSubmit={check}>
          <div className="field">
            <label>{t('qc.label')}</label>
            <input type="url" required value={url} onChange={e => setUrl(e.target.value)}
                   placeholder="https://detail.1688.com/offer/726426573925.html" autoComplete="off" />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{width:'100%'}}>
            {loading ? <><Loader2 size={18} className="spin" /> {t('qc.checking')}</> : <><SearchCode size={18} /> {t('qc.btn')}</>}
          </button>
        </form>

        {result?.status === 'loading' && (
          <div style={{textAlign:'center',padding:40}}>
            <Loader2 size={32} className="spin" style={{color:'var(--green)'}} />
            <p style={{color:'var(--muted)',marginTop:12}}>{t('qc.loadingApi')}</p>
          </div>
        )}

        {result?.status === 'ok' && (
          <div style={{marginTop:20}}>

            {result.info && (
              <div style={{display:'flex',gap:14,marginBottom:20,alignItems:'center',padding:14,background:'var(--surface)',borderRadius:'var(--radius)'}}>
                {result.info.image && (
                  <img src={result.info.image} alt="" style={{width:60,height:60,objectFit:'cover',borderRadius:8,flexShrink:0}} />
                )}
                <div style={{minWidth:0}}>
                  <div style={{fontSize:'.82rem',color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{result.info.title}</div>
                  {result.info.price > 0 && <div style={{fontSize:'.88rem',fontWeight:700,color:'var(--green)'}}>{result.info.price} ¥</div>}
                </div>
              </div>
            )}

            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <CheckCircle size={18} style={{color:'var(--green)'}} />
              <span style={{fontWeight:700}}>
                {result.photos.length > 0
                  ? t('qc.foundTitle').replace('{qty}', result.photos.length)
                  : t('qc.noPhotos')}
              </span>
            </div>

            {result.photos.length > 0 ? (
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',gap:10}} className="qc-photos-grid">
                  {result.photos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((photo, i) => (
                    <a key={(page - 1) * PAGE_SIZE + i} href={photo.url} target="_blank" rel="noopener"
                       style={{display:'block',borderRadius:'var(--radius-sm)',overflow:'hidden',border:'1px solid var(--border)',aspectRatio:'1',background:'var(--surface)',position:'relative'}}>
                      <img src={photo.url} alt={`QC ${(page - 1) * PAGE_SIZE + i + 1}`} loading="lazy" referrerPolicy="no-referrer"
                           style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                      {photo.agent && (
                        <span style={{position:'absolute',bottom:4,left:4,fontSize:'.65rem',fontWeight:700,background:'#000b',color:'#fff',padding:'2px 6px',borderRadius:4,textTransform:'uppercase'}}>
                          {photo.agent}
                        </span>
                      )}
                    </a>
                  ))}
                </div>

                {result.photos.length > PAGE_SIZE && (
                  <div style={{display:'flex',gap:8,justifyContent:'center',alignItems:'center',marginTop:18,flexWrap:'wrap'}}>
                    <button className="btn btn-primary btn-sm" disabled={page <= 1}
                            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                      ← {t('lang.pl') === 'Polski' ? 'Poprzednia' : 'Prev'}
                    </button>
                    <span style={{fontSize:'.85rem',color:'var(--muted)'}}>
                      {page} / {Math.ceil(result.photos.length / PAGE_SIZE)}
                    </span>
                    <button className="btn btn-primary btn-sm" disabled={page >= Math.ceil(result.photos.length / PAGE_SIZE)}
                            onClick={() => { setPage(p => Math.min(Math.ceil(result.photos.length / PAGE_SIZE), p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                      {t('lang.pl') === 'Polski' ? 'Następna' : 'Next'} →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p style={{color:'var(--muted)',fontSize:'.88rem',padding:20,background:'var(--surface)',borderRadius:'var(--radius)',textAlign:'center'}}>
                {t('qc.noPhotosDesc')}
              </p>
            )}
          </div>
        )}

        {result?.status === 'error' && (
          <div style={{marginTop:20,padding:16,background:'var(--surface)',border:'1px solid #ef444440',borderRadius:'var(--radius)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,color:'#ef4444',fontWeight:600}}>
              <AlertCircle size={18} /> {t('qc.noData')}
            </div>
            <p style={{color:'var(--muted)',marginTop:8,fontSize:'.88rem'}}>{result.msg}</p>
          </div>
        )}
      </div>

      <div className="panel" style={{marginTop:24}}>
        <h3 style={{fontSize:'1rem',marginBottom:14}}>{t('qc.whatTitle')}</h3>
        <div className="steps">
          <div className="step"><h3>{t('qc.step1Title')}</h3><p>{t('qc.step1Desc')}</p></div>
          <div className="step"><h3>{t('qc.step2Title')}</h3><p>{t('qc.step2Desc')}</p></div>
          <div className="step"><h3>{t('qc.step3Title')}</h3><p>{t('qc.step3Desc')}</p></div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin .7s linear infinite}`}</style>
    </section>
  )
}
