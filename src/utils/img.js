export function toWeserv(u, w = 800) {
  if (!u) return ''
  const raw = String(u).trim()
  if (/postimg\.cc|iili\.io/i.test(raw)) {
    return `/api/img?url=${encodeURIComponent(raw)}`
  }
  if (/^https?:\/\/i\.imgur\.com\/[^/?#]+\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(raw)) {
    return raw
  }
  if (/imgur\.com|imgur\.io/i.test(raw)) {
    return `/api/img?url=${encodeURIComponent(raw)}`
  }
  const clean = raw.replace(/^https?:\/\//, '').replace(/^\/\//, '')
  return `https://images.weserv.nl/?url=${encodeURIComponent(clean)}&w=${w}&output=webp&q=85`
}

export function toGeili(u, w = 400) {
  if (!u) return ''
  if (/si\.geilicdn\.com/i.test(u)) {
    return u.replace(/_\d+_\d+(?=\.\w+)/, `_${w}_${w}`)
  }
  return u
}

export function placeholderSvg(title, size = 600) {
  const safe = (title || '').slice(0, 20).replace(/[<>&"']/g, '')
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="%23060c1a"/><text x="50%" y="50%" fill="%234fc3f7" font-family="monospace" font-size="14" text-anchor="middle" dominant-baseline="middle">${safe}</text></svg>`
    )
  )
}
