const queue = []
let active = 0
const MAX = 12
const DELAY_MS = 0
const map = new Map()

let recentErrors = 0
let errorResetTimer = null
let paused = false

export function reportImageError() {
  recentErrors++
  if (errorResetTimer) clearTimeout(errorResetTimer)
  errorResetTimer = setTimeout(() => { recentErrors = 0 }, 5000)

  if (recentErrors >= 20 && !paused) {
    paused = true
    setTimeout(() => {
      paused = false
      recentErrors = 0
      pump()
    }, 1000)
  }
}

export function requestImage(getSrc, onAssign) {
  const key = {}
  map.set(key, { getSrc, onAssign })
  queue.push(key)
  pump()
  return () => {
    const i = queue.indexOf(key)
    if (i >= 0) queue.splice(i, 1)
    map.delete(key)
  }
}

export function releaseImage() {
  if (active > 0) active--
  setTimeout(pump, DELAY_MS)   
}

function pump() {
  if (paused) return
  while (active < MAX && queue.length > 0) {
    const key = queue.shift()
    const item = map.get(key)
    if (!item) continue
    map.delete(key)
    active++
    item.onAssign(item.getSrc())
  }
}
