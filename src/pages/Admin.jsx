import { useState, useEffect } from 'react'
import { toast } from '../components/Toast'
import { usePrefs } from '../context/PrefsContext'
import {
  Shield, LogIn, LogOut, Package, Link2, Image as ImageIcon,
  Layers, Heart, RefreshCw, KeyRound, Save, Loader2, Database,
  Newspaper, Plus, Trash2, Shirt
} from 'lucide-react'

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('cf_admin_session') === '1' ? 'cookie' : '')
  const [username, setUsername] = useState(sessionStorage.getItem('cf_admin_user') || '')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [pwForm, setPwForm] = useState({ current: '', next: '' })
  const [news, setNews] = useState([])
  const [outfits, setOutfits] = useState([])
  const [sheets, setSheets] = useState([])
  const [newsForm, setNewsForm] = useState({ title: '', desc: '', tag: 'Update', agent: '', agentLink: '' })
  const [outfitForm, setOutfitForm] = useState({ title: '', desc: '', img: '', cat: 'Streetwear', rating: '8' })
  const [sheetForm, setSheetForm] = useState({ url: '', tab: '', gender: 'auto', category: 'auto', range: '', sections: true })
  const [showNewsForm, setShowNewsForm] = useState(false)
  const [showOutfitForm, setShowOutfitForm] = useState(false)
  const [showSheetForm, setShowSheetForm] = useState(false)
  const { t } = usePrefs()

  useEffect(() => {
    if (!token) return
    fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setUsername(d.username))
      .catch(() => logout())
    loadStats()
    fetch('/api/agents').then(r => r.json()).then(setAgents)
    loadNews()
    loadOutfits()
    loadSheets()
  }, [token])

  const loadStats = () => {
    if (!token) return
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
  }

  const loadNews = () => {
    fetch('/api/news').then(r => r.json()).then(setNews).catch(() => {})
  }

  const loadOutfits = () => {
    fetch('/api/outfits').then(r => r.json()).then(setOutfits).catch(() => {})
  }

  const loadSheets = () => {
    fetch('/api/admin/sheets', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setSheets)
      .catch(() => {})
  }

  const login = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('admin.errorLogin'))
      setToken('cookie')
      sessionStorage.setItem('cf_admin_session', '1')
      sessionStorage.removeItem('cf_admin_token')
      sessionStorage.setItem('cf_admin_user', data.username)
      toast(`${t('admin.welcome')} ${data.username}!`)
    } catch (err) {
      toast(err.message)
    }
    setLoading(false)
  }

  const logout = () => {
    fetch('/api/admin/logout', { method: 'POST', headers: { Authorization: 'Bearer cookie' } }).catch(() => {})
    setToken(''); setUsername('')
    sessionStorage.removeItem('cf_admin_session')
    sessionStorage.removeItem('cf_admin_token')
    sessionStorage.removeItem('cf_admin_user')
  }

  const saveAgent = async (name, field, value) => {
    const res = await fetch(`/api/admin/agents/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ [field]: value }),
    })
    const data = await res.json()
    if (res.ok) { setAgents(data); toast(`${name}: ${field}`) }
    else toast(data.error || t('admin.errorSave'))
  }

  const changePassword = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(pwForm),
    })
    const data = await res.json()
    if (res.ok) { toast(t('admin.pwChanged')); setPwForm({ current: '', next: '' }) }
    else toast(data.error || t('admin.errorPw'))
  }

  const addNews = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/admin/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newsForm),
    })
    const data = await res.json()
    if (res.ok) { setNews(data); setNewsForm({ title: '', desc: '', tag: 'Update', agent: '', agentLink: '' }); setShowNewsForm(false); toast(t('admin.newsSaved')) }
    else toast(data.error || t('admin.errorSave'))
  }

  const deleteNews = async (id) => {
    const res = await fetch(`/api/admin/news/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (res.ok) { setNews(data); toast(t('admin.newsDeleted')) }
  }

  const addOutfit = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/admin/outfits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(outfitForm),
    })
    const data = await res.json()
    if (res.ok) { setOutfits(data); setOutfitForm({ title: '', desc: '', img: '', cat: 'Streetwear', rating: '8' }); setShowOutfitForm(false); toast(t('admin.outfitsSaved')) }
    else toast(data.error || t('admin.errorSave'))
  }

  const deleteOutfit = async (id) => {
    const res = await fetch(`/api/admin/outfits/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (res.ok) { setOutfits(data); toast(t('admin.outfitsDeleted')) }
  }

  const addSheet = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/admin/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url: sheetForm.url, sections: sheetForm.sections }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setSheets(data.sheets || [])
      setSheetForm({ url: '', tab: '', gender: 'auto', category: 'auto', range: '', sections: true })
      setShowSheetForm(false)
      loadStats()
      toast('Arkusz dodany i katalog odświeżony')
    } else toast(data.error || t('admin.errorSave'))
  }

  const deleteSheet = async (key) => {
    if (!window.confirm('Usunąć ten arkusz z importu?')) return
    const res = await fetch(`/api/admin/sheets/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setSheets(data.sheets || [])
      loadStats()
      toast('Arkusz usunięty i katalog odświeżony')
    } else toast(data.error || t('admin.error'))
  }

  const refreshCatalog = async () => {
    const res = await fetch('/api/admin/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { loadStats(); toast(`Katalog odświeżony: ${data.products || 0} produktów`) }
    else toast(data.error || t('admin.error'))
  }

  if (!token) {
    return (
      <section className="section wrap" style={{ maxWidth: 420 }}>
        <div className="admin-login-card">
          <div className="admin-login-icon"><Shield size={34} /></div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', margin: '0 0 4px' }}>{t('admin.loginTitle')}</h1>
          <p className="empty-note" style={{ margin: '0 0 24px' }}>{t('admin.loginHint')}</p>
          <form onSubmit={login} style={{ display: 'grid', gap: 12 }}>
            <input className="admin-input" placeholder={t('admin.loginPlaceholder')} value={loginForm.username}
                   onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} autoComplete="username" />
            <input className="admin-input" type="password" placeholder={t('admin.passwordPlaceholder')} value={loginForm.password}
                   onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} autoComplete="current-password" />
            <button className="btn btn-primary btn-lg" disabled={loading} type="submit">
              {loading ? <Loader2 size={18} className="spin" /> : <LogIn size={18} />} {t('admin.loginBtn')}
            </button>
          </form>
        </div>
        <style>{`
          .admin-login-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 36px; text-align: center; }
          .admin-login-icon { width: 68px; height: 68px; margin: 0 auto 16px; display: grid; place-items: center; border-radius: 50%; background: rgba(79,195,247,.12); color: var(--green); border: 1px solid var(--green); }
          .admin-input { width: 100%; background: var(--card-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; color: var(--text); font-size: .95rem; outline: none; transition: .15s; box-sizing: border-box; }
          .admin-input:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(79,195,247,.12); }
          @keyframes spin { to { transform: rotate(360deg) } } .spin { animation: spin .7s linear infinite }
        `}</style>
      </section>
    )
  }

  const statCards = stats ? [
    { icon: Package, label: t('admin.statProducts'), value: stats.products },
    { icon: Link2, label: t('admin.statLinked'), value: stats.linked },
    { icon: ImageIcon, label: t('admin.statImages'), value: stats.withImages },
    { icon: Layers, label: t('admin.statCategories'), value: stats.categories },
    { icon: Heart, label: t('admin.statFavs'), value: stats.favorites },
  ] : []

  return (
    <section className="section wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <span className="eyebrow"><Shield size={14} /> {t('admin.dashboard')}</span>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.8rem', margin: '4px 0 0' }}>{t('admin.dashboardSub')}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="chip">👤 {username}</span>
          <button className="btn btn-ghost" onClick={() => { loadStats(); toast(t('admin.refresh')) }}><RefreshCw size={15} /></button>
          <button className="btn btn-ghost" onClick={logout}><LogOut size={15} /> {t('admin.logout')}</button>
        </div>
      </div>

      {stats && (
        <>
          <div className="admin-stats-grid">
            {statCards.map(s => (
              <div key={s.label} className="admin-stat-card">
                <s.icon size={20} />
                <b>{s.value}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <p className="empty-note" style={{ marginBottom: 28 }}>
            <Database size={13} style={{ verticalAlign: '-2px' }} /> {t('admin.source')} ({stats.sheetMode}) • {t('admin.lastFetch')} {new Date(stats.lastSheetFetch).toLocaleString('pl-PL')}
          </p>
        </>
      )}


      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.25rem', margin: '36px 0 14px' }}>Arkusze produktów</h2>
      <div className="admin-section-box">
        <p className="empty-note" style={{ marginBottom: 14 }}>
          Dodaj publiczny link Google Sheets. Płeć ustawiona na „Auto” zostanie rozpoznana z nazwy produktu i zakładki, a kategorię można wymusić dla całego arkusza.
        </p>
        {sheets.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {sheets.map(sheet => (
              <div key={sheet.key} className="admin-news-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ color: 'var(--text)' }}>{sheet.tab || 'Główny arkusz'}</b>
                  <span className="chip" style={{ marginLeft: 8, fontSize: '.7rem' }}>
                    {{ auto: 'Auto', men: 'Męskie', women: 'Damskie', unisex: 'Unisex' }[sheet.gender] || sheet.gender}
                  </span>
                  {sheet.category && sheet.category !== 'auto' && <span className="chip" style={{ marginLeft: 8, fontSize: '.7rem' }}>{sheet.category}</span>}
                  <p style={{ margin: '4px 0 0', fontSize: '.78rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sheet.url}</p>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red, #f44)', flexShrink: 0 }} onClick={() => deleteSheet(sheet.key)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!showSheetForm && <button className="btn btn-ghost" onClick={() => setShowSheetForm(true)}><Plus size={15} /> Dodaj arkusz</button>}
          <button className="btn btn-ghost" onClick={refreshCatalog}><RefreshCw size={15} /> Odśwież katalog</button>
        </div>
        {showSheetForm && (
          <form onSubmit={addSheet} className="admin-form-grid" style={{ marginTop: 14 }}>
            <input className="admin-inline admin-inline-wide" placeholder="Link do Google Sheets" value={sheetForm.url} onChange={e => setSheetForm({ ...sheetForm, url: e.target.value })} required />
            <p className="empty-note" style={{ flex: '1 1 100%', margin: 0 }}>
              System automatycznie wykryje wszystkie zakładki, kolumny, płeć, kategorie, zdjęcia, ceny, linki, batch i opinie.
            </p>
            <input className="admin-inline" placeholder="Nazwa zakładki (opcjonalnie)" value={sheetForm.tab} onChange={e => setSheetForm({ ...sheetForm, tab: e.target.value })} />
            <select className="admin-inline" value={sheetForm.gender} onChange={e => setSheetForm({ ...sheetForm, gender: e.target.value })}>
              <option value="auto">Płeć: Auto</option>
              <option value="men">Płeć: Męskie</option>
              <option value="women">Płeć: Damskie</option>
              <option value="unisex">Płeć: Unisex</option>
            </select>
            <select className="admin-inline" value={sheetForm.category} onChange={e => setSheetForm({ ...sheetForm, category: e.target.value })}>
              <option value="auto">Kategoria: Auto</option>
              <option value="Buty">Buty</option>
              <option value="Bluzy">Bluzy</option>
              <option value="Koszulki">Koszulki</option>
              <option value="Spodnie">Spodnie</option>
              <option value="Kurtki">Kurtki</option>
              <option value="Akcesoria">Akcesoria</option>
              <option value="Inne">Inne</option>
            </select>
            <input className="admin-inline admin-inline-wide" placeholder="Zakres, np. A1:F3500 (opcjonalnie)" value={sheetForm.range} onChange={e => setSheetForm({ ...sheetForm, range: e.target.value })} />
            <label className="empty-note" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <input type="checkbox" checked={sheetForm.sections} onChange={e => setSheetForm({ ...sheetForm, sections: e.target.checked })} /> Rozpoznawaj nagłówki kategorii
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" type="submit"><Save size={14} /> Dodaj i pobierz</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowSheetForm(false)}>Anuluj</button>
            </div>
          </form>
        )}
      </div>


      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.25rem', marginBottom: 14 }}>{t('admin.agentsTitle')}</h2>
      <div className="admin-agents-wrap">
        <table className="admin-agents-table">
          <thead>
            <tr><th>{t('admin.agentsTh')}</th><th>{t('admin.agentsShip')}</th><th>{t('admin.agentsCoupon')}</th><th>{t('admin.agentsLink')}</th></tr>
          </thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.name}>
                <td><b style={{ color: 'var(--green-bright)' }}>{a.name}</b></td>
                <td><input className="admin-inline" defaultValue={a.shipping} onBlur={e => e.target.value !== a.shipping && saveAgent(a.name, 'shipping', e.target.value)} /></td>
                <td><input className="admin-inline" defaultValue={a.coupon} onBlur={e => e.target.value !== a.coupon && saveAgent(a.name, 'coupon', e.target.value)} /></td>
                <td><input className="admin-inline admin-inline-wide" defaultValue={a.affLink} onBlur={e => e.target.value !== a.affLink && saveAgent(a.name, 'affLink', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="empty-note" style={{ marginTop: 10 }}><Save size={13} style={{ verticalAlign: '-2px' }} /> {t('admin.agentsNote')}</p>
      </div>


      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.25rem', margin: '36px 0 14px' }}>{t('admin.newsTitle')}</h2>
      <div className="admin-section-box">
        {news.length === 0 && !showNewsForm && <p className="empty-note">{t('admin.newsEmpty')}</p>}
        {news.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {news.map(n => (
              <div key={n.id} className="admin-news-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ color: 'var(--text)' }}>{n.title}</b>
                  <span className="chip" style={{ marginLeft: 8, fontSize: '.7rem' }}>{n.tag}</span>
                  {n.agent && <span style={{ fontSize: '.78rem', color: 'var(--muted)', marginLeft: 8 }}>→ {n.agent}</span>}
                  <p style={{ margin: '4px 0 0', fontSize: '.82rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.desc}</p>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red, #f44)', flexShrink: 0 }} onClick={() => deleteNews(n.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
        {!showNewsForm ? (
          <button className="btn btn-ghost" onClick={() => setShowNewsForm(true)}><Plus size={15} /> {t('admin.newsAdd')}</button>
        ) : (
          <form onSubmit={addNews} className="admin-form-grid">
            <input className="admin-inline" placeholder={t('admin.newsTitleLabel')} value={newsForm.title} onChange={e => setNewsForm({ ...newsForm, title: e.target.value })} required />
            <input className="admin-inline admin-inline-wide" placeholder={t('admin.newsDescLabel')} value={newsForm.desc} onChange={e => setNewsForm({ ...newsForm, desc: e.target.value })} required />
            <input className="admin-inline" placeholder={t('admin.newsTagLabel')} value={newsForm.tag} onChange={e => setNewsForm({ ...newsForm, tag: e.target.value })} />
            <input className="admin-inline" placeholder={t('admin.newsAgentLabel')} value={newsForm.agent} onChange={e => setNewsForm({ ...newsForm, agent: e.target.value })} />
            <input className="admin-inline admin-inline-wide" placeholder={t('admin.newsLinkLabel')} value={newsForm.agentLink} onChange={e => setNewsForm({ ...newsForm, agentLink: e.target.value })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" type="submit"><Save size={14} /> {t('admin.newsSave')}</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowNewsForm(false)}>✕</button>
            </div>
          </form>
        )}
      </div>


      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.25rem', margin: '36px 0 14px' }}>{t('admin.outfitsTitle')}</h2>
      <div className="admin-section-box">
        {outfits.length === 0 && !showOutfitForm && <p className="empty-note">{t('admin.outfitsEmpty')}</p>}
        {outfits.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {outfits.map(o => (
              <div key={o.id} className="admin-news-item">
                <div style={{ width: 50, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--card-2)' }}>
                  {o.img && <img src={o.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ color: 'var(--text)' }}>{o.title}</b>
                  <span className="chip" style={{ marginLeft: 8, fontSize: '.7rem' }}>{o.cat}</span>
                  <span style={{ fontSize: '.78rem', color: 'var(--green)', marginLeft: 8, fontWeight: 700 }}>{o.rating}/10</span>
                  <p style={{ margin: '4px 0 0', fontSize: '.82rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.desc}</p>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red, #f44)', flexShrink: 0 }} onClick={() => deleteOutfit(o.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
        {!showOutfitForm ? (
          <button className="btn btn-ghost" onClick={() => setShowOutfitForm(true)}><Plus size={15} /> {t('admin.outfitsAdd')}</button>
        ) : (
          <form onSubmit={addOutfit} className="admin-form-grid">
            <input className="admin-inline" placeholder={t('admin.outfitsTitleLabel')} value={outfitForm.title} onChange={e => setOutfitForm({ ...outfitForm, title: e.target.value })} required />
            <input className="admin-inline admin-inline-wide" placeholder={t('admin.outfitsDescLabel')} value={outfitForm.desc} onChange={e => setOutfitForm({ ...outfitForm, desc: e.target.value })} />
            <input className="admin-inline admin-inline-wide" placeholder={t('admin.outfitsImgLabel')} value={outfitForm.img} onChange={e => setOutfitForm({ ...outfitForm, img: e.target.value })} />
            <input className="admin-inline" placeholder={t('admin.outfitsCatLabel')} value={outfitForm.cat} onChange={e => setOutfitForm({ ...outfitForm, cat: e.target.value })} />
            <input className="admin-inline" type="number" min="1" max="10" placeholder={t('admin.outfitsRatingLabel')} value={outfitForm.rating} onChange={e => setOutfitForm({ ...outfitForm, rating: e.target.value })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" type="submit"><Save size={14} /> {t('admin.outfitsSave')}</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowOutfitForm(false)}>✕</button>
            </div>
          </form>
        )}
      </div>


      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.25rem', margin: '36px 0 14px' }}>{t('admin.changePw')}</h2>
      <form onSubmit={changePassword} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="admin-inline" type="password" placeholder={t('admin.pwCurrent')} value={pwForm.current}
               onChange={e => setPwForm({ ...pwForm, current: e.target.value })} style={{ width: 200 }} />
        <input className="admin-inline" type="password" placeholder={t('admin.pwNew')} value={pwForm.next}
               onChange={e => setPwForm({ ...pwForm, next: e.target.value })} style={{ width: 200 }} />
        <button className="btn btn-primary"><KeyRound size={15} /> {t('admin.changePwBtn')}</button>
      </form>


      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.25rem', margin: '36px 0 14px' }}>{t('admin.uuTitle')}</h2>
      <div className="admin-api-section">
        <p style={{marginBottom: 14}}>{t('admin.uuDesc')} <b>{t('admin.uuApi')}</b>:</p>
        <div className="code-block">
          <code>GET https://api.uufinds.com/open/api/convertUrl?from=kyzreps&url=[URL]</code>
        </div>
        <ul style={{listStyle: 'disc', paddingLeft: 24, marginTop: 14, color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.8}}>
          <li><b>{t('admin.uuSupported')}</b> {t('admin.uuSupportedList')}</li>
          <li><b>Response:</b> <code style={{background: 'var(--card-2)', padding: '2px 6px', borderRadius: 4}}>{`{ success, result: { url, qcQuantity } }`}</code></li>
          <li><b>{t('admin.uuUrlEnc')}</b></li>
          <li><b>{t('admin.uuBackend')}</b> <code style={{background: 'var(--card-2)', padding: '2px 6px', borderRadius: 4}}>/api/convert</code> — proxy do UUFinds API (CORS + unwrap agent links)</li>
        </ul>
        <p style={{marginTop: 14, fontSize: '.85rem', color: 'var(--muted)'}}>
          {t('admin.uuWrapper')}
        </p>
      </div>

      <style>{`
        .admin-api-section { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; margin-bottom: 24px; }
        .code-block { background: var(--card-2); border: 1px solid var(--border-hover); border-radius: 8px; padding: 12px 14px; font-family: 'Consolas', 'Monaco', monospace; font-size: .82rem; color: var(--green-bright); overflow-x: auto; }
        .admin-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .admin-stat-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; color: var(--green); display: grid; gap: 6px; }
        .admin-stat-card b { font-family: var(--font-head); font-size: 1.7rem; color: var(--text); line-height: 1; }
        .admin-stat-card span { font-size: .78rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
        .admin-agents-wrap { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; overflow-x: auto; }
        .admin-agents-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
        .admin-agents-table th { text-align: left; padding: 8px 10px; color: var(--muted); font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid var(--border); }
        .admin-agents-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); }
        .admin-inline { background: var(--card-2); border: 1px solid var(--border); border-radius: 6px; padding: 7px 10px; color: var(--text); font-size: .85rem; outline: none; width: 140px; transition: .15s; }
        .admin-inline:focus { border-color: var(--green); }
        .admin-inline-wide { width: 100%; min-width: 260px; }
        .admin-section-box { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; }
        .admin-news-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .admin-news-item:last-child { border-bottom: none; }
        .admin-form-grid { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
        @keyframes spin { to { transform: rotate(360deg) } } .spin { animation: spin .7s linear infinite }
      `}</style>
    </section>
  )
}
