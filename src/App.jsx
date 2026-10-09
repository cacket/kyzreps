import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import CookieConsent from './components/CookieConsent'
import Welcome from './components/Welcome'
import TurnstileVerify from './components/TurnstileVerify'
import Home from './pages/Home'
import Products from './pages/Products'
import Product from './pages/Product'
import Konwerter from './pages/Konwerter'
import Tracking from './pages/Tracking'
import QCFinder from './pages/QCFinder'

import Outfity from './pages/Outfity'
import News from './pages/News'
import JakZamawiac from './pages/JakZamawiac'
import Favorites from './pages/Favorites'
import Narzedzia from './pages/Narzedzia'
import PorownanieWysylki from './pages/PorownanieWysylki'
import Regulamin from './pages/Regulamin'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'
import Toast from './components/Toast'
import FloatingPrefs from './components/FloatingPrefs'
import FloatingTools from './components/FloatingTools'
import { usePrefs } from './context/PrefsContext'

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

export default function App() {
  const { onboarded } = usePrefs()
  const [turnstileOk, setTurnstileOk] = useState(() => !!getCookie('cf_turnstile'))

  const handleVerified = () => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
    document.cookie = `cf_turnstile=1; expires=${d.toUTCString()}; path=/; SameSite=Lax`
    setTurnstileOk(true)
  }

  const TURNSTILE_ENABLED = import.meta.env.VITE_TURNSTILE_ENABLED === 'true'

  if (TURNSTILE_ENABLED && !turnstileOk) {
    return <TurnstileVerify onVerified={handleVerified} />
  }

  return (
    <>
      {!onboarded && <Welcome />}
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/produkty" element={<Products />} />
          <Route path="/produkt/:id" element={<Product />} />
          <Route path="/konwerter" element={<Konwerter />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/qc" element={<QCFinder />} />
          <Route path="/outfity" element={<Outfity />} />
          <Route path="/news" element={<News />} />
          <Route path="/jak-zamowiac" element={<JakZamawiac />} />
          <Route path="/narzedzia" element={<Narzedzia />} />
          <Route path="/porownanie-wysylki" element={<PorownanieWysylki />} />
          <Route path="/regulamin" element={<Regulamin />} />
          <Route path="/ulubione" element={<Favorites />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Toast />
      <CookieConsent />
      <FloatingTools />
      <FloatingPrefs />
    </>
  )
}
