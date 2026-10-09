export const AGENTS = [
  {
    name: 'OSSbuy',
    tag: 'polecany',
    discount: 50,
    coupon: 'Kyzreps',
    affLink: 'https://www.ossbuy.com/register?inviteCode=Kyzreps',
    shippingPl: 'od 50 zł/kg',
    shippingEn: 'from 50 zł/kg',
    logo: 'https://file.uufinds.com/all/buy/Ossbuy_1782704960941.png',
  },
  {
    name: 'KakoBuy',
    tag: '',
    coupon: 'kyzreps',
    affLink: 'https://www.kakobuy.com/register/?affcode=kyzreps',
    shippingPl: 'od 48 zł/kg',
    shippingEn: 'from 48 zł/kg',
    logo: 'https://file.uufinds.com/all/buy/kakobuy_1782726471572.png',
  },
]

AGENTS[0].shippingPl = 'od 48 z\u0142/kg'
AGENTS[0].shippingEn = 'from 48 PLN/kg'
AGENTS[1].shippingPl = 'od 50 z\u0142/kg'
AGENTS[1].shippingEn = 'from 50 PLN/kg'

export function agentItemUrl(name, rawUrl, keyword) {
  const r = rawUrl ? encodeURIComponent(rawUrl) : null
  const kw = encodeURIComponent(keyword || '')

  switch (name) {
    case 'KakoBuy':
      return rawUrl
        ? `https://www.kakobuy.com/item/details?url=${r}&affcode=kyzreps`
        : `https://www.kakobuy.com/search?keyword=${kw}&affcode=kyzreps`
    case 'OSSbuy':
      return rawUrl
        ? `https://www.ossbuy.com/item?url=${r}`
        : `https://www.ossbuy.com/search?keyword=${kw}`
    default:
      return ''
  }
}
