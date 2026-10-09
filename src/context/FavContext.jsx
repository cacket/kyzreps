import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const FavContext = createContext()

export function FavProvider({ children }) {
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cr_favs') || '{}') }
    catch { return {} }
  })

  useEffect(() => {
    localStorage.setItem('cr_favs', JSON.stringify(favs))
  }, [favs])

  const toggle = useCallback((id, color = null, colorImg = null) => {
    setFavs(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = { color, colorImg }
      return next
    })
  }, [])

  const has = useCallback((id) => !!favs[id], [favs])
  const getColor = useCallback((id) => favs[id]?.color || null, [favs])
  const getColorImg = useCallback((id) => favs[id]?.colorImg || null, [favs])

  return <FavContext.Provider value={{ favs, toggle, has, getColor, getColorImg }}>{children}</FavContext.Provider>
}

export const useFav = () => useContext(FavContext)
