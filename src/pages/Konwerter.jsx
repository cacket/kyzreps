import { useState, useMemo } from 'react'
import { toast } from '../components/Toast'
import { usePrefs } from '../context/PrefsContext'
import { Link as LinkIcon, ExternalLink, Copy, Loader2, AlertCircle } from 'lucide-react'
import { AGENTS } from '../utils/agents'

function detectPlatform(url) {
  try {
    const u = new URL(url)
    const h = u.hostname.toLowerCase()
    if (h.includes('weidian')) return 'weidian'
    if (h.includes('1688')) return '1688'
    if (h.includes('taobao')) return 'taobao'
    if (h.includes('tmall')) return 'tmall'
    if (h.includes('hoobuy')) return 'hoobuy'
    if (h.includes('kakobuy')) return 'kakobuy'
    if (h.includes('cnshopper')) return 'cnshopper'
    if (h.includes('usfans')) return 'usfans'
    if (h.includes('litbuy')) return 'litbuy'
    if (h.includes('ossbuy') || h.includes('oosbuy') || h.includes('oopbuy')) return 'OSSbuy'
    if (h.includes('gtbuy')) return 'gtbuy'
    if (h.includes('pandabuy')) return 'pandabuy'
    if (h.includes('superbuy')) return 'superbuy'
    return h.split('.')[0]
  } catch { return null }
}

function extractId(url) {
  try {
    const u = new URL(url)
    if (/weidian/i.test(u.hostname)) return u.searchParams.get('itemID') || null
    if (/1688/i.test(u.hostname)) { const m = u.pathname.match(/offer\/(\d+)/); return m ? m[1] : null }
    if (/taobao/i.test(u.hostname)) return u.searchParams.get('id') || null
    if (/hoobuy/i.test(u.hostname)) { const m = u.pathname.match(/\/(\d+)$/); return m ? m[1] : null }
    if (/kakobuy|cnshopper|usfans|litbuy|oosbuy|ossbuy|oopbuy|gtbuy|pandabuy|superbuy/i.test(u.hostname)) {
      const inner = u.searchParams.get('url')
      if (inner) return extractId(inner)
    }
    return null
  } catch { return null }
}

export default function Konwerter() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const { t, agent: prefAgent } = usePrefs()

  const platform = useMemo(() => detectPlatform(url), [url])
  const itemId = useMemo(() => extractId(url), [url])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()
      if (json.success && json.agents?.length) {
        setResult(json)
      } else {
        setResult({ success: false, message: json.error || t('conv.errorNoDesc') })
      }
    } catch {
      setResult({ success: false, message: t('conv.errorConn') })
    }
    setLoading(false)
  }


  const mergedAgents = (() => {
    const uuMap = new Map()
    if (result?.agents) {
      result.agents.forEach(a => {
        const key = a.name.toLowerCase().replace(/[^a-z]/g, '')
        uuMap.set(key, a)
        if (key === 'oosbuy') uuMap.set('ossbuy', a)
        if (key === 'ossbuy') uuMap.set('oosbuy', a)
      })
    }
    return AGENTS.map(a => {
      const key = a.name.toLowerCase().replace(/[^a-z]/g, '')
      const fromUu = uuMap.get(key)
      return fromUu
        ? { name: a.name, logo: fromUu.logo || a.logo, link: fromUu.link }
        : { name: a.name, logo: a.logo, link: '' }
    }).filter(a => a.link)
  })()

  const myAgent = mergedAgents.find(a => a.name.toLowerCase() === (prefAgent || 'ossbuy').toLowerCase())
    || mergedAgents.find(a => a.name.toLowerCase() === 'ossbuy')
  const otherAgents = mergedAgents.filter(a => a !== myAgent) || []

  const EXAMPLES = [
    { label: 'Weidian', url: 'https://weidian.com/item.html?itemID=4480232741' },
    { label: '1688', url: 'https://detail.1688.com/offer/726426573925.html' },
    { label: 'Taobao', url: 'https://item.taobao.com/item.htm?id=654321098765' },
    { label: 'Hoobuy', url: 'https://hoobuy.com/product/1/763932772408' },
  ]

  return (
    <section className="section wrap" style={{maxWidth: 820}}>
      <span className="eyebrow"><LinkIcon size={14} /> {t('conv.eyebrow')}</span>
      <h1 style={{marginBottom:10}}>{t('conv.title')} <span style={{color:'var(--green)'}}>{t('conv.titleHighlight')}</span></h1>
      <p style={{color:'var(--muted)',marginBottom:32,maxWidth:600}}>
        {t('conv.desc')}
      </p>


      <div className="panel" style={{marginBottom:20}}>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="conv-url">{t('conv.label')}</label>
            <input type="url" id="conv-url" required value={url} onChange={e => setUrl(e.target.value)}
                   placeholder="https://weidian.com/item.html?itemID=..." autoComplete="off" />
          </div>
          {platform && (
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:10,fontSize:'.85rem',color:'var(--muted)'}}>
              <span>{t('conv.detected')}:</span>
              <span style={{background:'var(--green-bg, #ffffff22)',color:'var(--green)',padding:'3px 10px',borderRadius:20,fontWeight:700,fontSize:'.78rem',textTransform:'uppercase'}}>{platform}</span>
              {itemId && <span>{t('conv.id')}: <b style={{color:'var(--text)'}}>{itemId}</b></span>}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{marginTop:16,width:'100%'}}>
            {loading ? <><Loader2 size={18} className="spin" /> {t('conv.loading')}</> : <>{t('conv.btn')}</>}
          </button>
        </form>
      </div>


      {loading && (
        <div className="panel" style={{textAlign:'center',padding:40}}>
          <Loader2 size={32} className="spin" style={{color:'var(--green)'}} />
          <p style={{color:'var(--muted)',marginTop:12}}>{t('conv.apiLoading')}</p>
        </div>
      )}


      {result && !result.success && !loading && (
        <div className="panel" style={{borderColor:'#ef444440'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,color:'#ef4444',fontWeight:600}}>
            <AlertCircle size={18} /> {t('conv.errorTitle')}
          </div>
          <p style={{color:'var(--muted)',marginTop:8,fontSize:'.88rem'}}>{result.message}</p>
        </div>
      )}


      {result?.success && !loading && (
        <>


          {myAgent && (
            <div className="panel" style={{marginBottom:16,borderColor:'#ffffff40'}}>
              <div style={{fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',color:'var(--green)',marginBottom:12}}>
                {t('conv.yourAgent')}: {myAgent.name}
              </div>
              <div style={{fontSize:'.82rem',color:'var(--muted)',wordBreak:'break-all',marginBottom:14}}>
                {myAgent.link}
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <a href={myAgent.link} target="_blank" rel="noopener"
                   className="btn btn-sm" style={{background:'var(--green)',color:'#000',fontWeight:600}}>
                  <ExternalLink size={14} /> {t('conv.openAgent')} {myAgent.name}
                </a>
                <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(myAgent.link); toast(t('conv.copied')) }}>
                  <Copy size={14} /> {t('conv.copy')}
                </button>
              </div>
            </div>
          )}


          {otherAgents.length > 0 && (
            <div className="panel">
              {otherAgents.map((a, i) => {
                const agentData = AGENTS.find(ag => ag.name.toLowerCase() === a.name.toLowerCase())
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom: i < otherAgents.length - 1 ? '1px solid var(--border)' : 'none'}}>
                    <div style={{flex:'0 0 auto',width:32,height:32,borderRadius:6,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                      {a.logo ? <img src={a.logo} alt={a.name} style={{width:20,height:20,objectFit:'contain'}} /> : <span style={{fontSize:'.7rem',fontWeight:700}}>{a.name[0]}</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:'.88rem'}}>{a.name}</div>
                      <div style={{fontSize:'.78rem',color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.link}</div>
                    </div>
                    <div style={{display:'flex',gap:6,flexShrink:0}}>
                      <button className="btn btn-ghost btn-icon" title={t('conv.copy')}
                              onClick={() => { navigator.clipboard.writeText(a.link); toast(t('conv.copied')) }}>
                        <Copy size={15} />
                      </button>
                      <a href={a.link} target="_blank" rel="noopener" className="btn btn-ghost btn-icon" title={t('conv.openAgent')}>
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}


      {!result && !loading && (
        <div className="panel" style={{marginTop:8}}>
          <h3 style={{fontSize:'1rem',marginBottom:14}}>{t('conv.examplesTitle')}</h3>
          <div style={{display:'flex',flexDirection:'column',gap:8}} className="conv-examples">
            {EXAMPLES.map((e, i) => (
              <button key={i} className="btn btn-ghost btn-sm" style={{justifyContent:'flex-start',textAlign:'left',width:'100%'}}
                      onClick={() => setUrl(e.url)}>
                <LinkIcon size={14} style={{color:'var(--green)',flexShrink:0}} />
                <span style={{fontWeight:700,minWidth:80}}>{e.label}</span>
                <span style={{opacity:.6,fontSize:'.82rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.url}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin .7s linear infinite}`}</style>
    </section>
  )
}
