import { Music2, ShoppingBag, ExternalLink } from 'lucide-react'

function DiscordIcon({ size = 21 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 19" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M16.224 3.768a14.5 14.5 0 0 0-3.67-1.153c-.158.286-.343.67-.47.976a13.5 13.5 0 0 0-4.067 0c-.128-.306-.317-.69-.476-.976A14.4 14.4 0 0 0 3.868 3.77C1.546 7.28.916 10.703 1.231 14.077a14.7 14.7 0 0 0 4.5 2.306q.545-.748.965-1.587a9.5 9.5 0 0 1-1.518-.74q.191-.14.372-.293c2.927 1.369 6.107 1.369 8.999 0q.183.152.372.294-.723.437-1.52.74.418.838.963 1.588a14.6 14.6 0 0 0 4.504-2.308c.37-3.911-.63-7.302-2.644-10.309m-9.13 8.234c-.878 0-1.599-.82-1.599-1.82 0-.998.705-1.82 1.6-1.82.894 0 1.614.82 1.599 1.82.001 1-.705 1.82-1.6 1.82m5.91 0c-.878 0-1.599-.82-1.599-1.82 0-.998.705-1.82 1.6-1.82.893 0 1.614.82 1.599 1.82 0 1-.706 1.82-1.6 1.82" />
    </svg>
  )
}

const ALL = [
  {
    href: 'https://discord.com/invite/sTaRgQXAPy',
    label: 'Discord',
    Icon: DiscordIcon,
    logo: '',
  },
  {
    href: 'https://www.tiktok.com/@kayozz_r3ps',
    label: 'TikTok',
    Icon: Music2,
    logo: 'https://cdn.simpleicons.org/tiktok/ffffff',
  },
  {
    href: 'https://www.ossbuy.com/register?inviteCode=Kyzreps',
    label: 'OSSbuy',
    Icon: ExternalLink,
    logo: 'https://www.ossbuy.com/favicon.ico',
    accent: true,
  },
  {
    href: 'https://www.kakobuy.com/register/?affcode=kyzreps',
    label: 'KakoBuy',
    Icon: ShoppingBag,
    logo: 'https://www.kakobuy.com/favicon.ico',
    accent: false,
  },
]

export default function FloatingTools() {
  return (
    <div style={{
      position: 'fixed',
      right: 16,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 35,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
    }}>
      {ALL.map(({ href, label, Icon, logo, accent }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: accent ? 'rgba(79,195,247,0.14)' : 'rgba(255,255,255,0.07)',
            border: accent ? '1px solid rgba(79,195,247,0.45)' : '1px solid rgba(255,255,255,0.1)',
            color: accent ? 'var(--green-bright)' : 'var(--text)',
            textDecoration: 'none',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          {logo ? (
            <img
              src={logo}
              alt=""
              style={{ width: 23, height: 23, objectFit: 'contain' }}
              onError={e => {
                e.currentTarget.style.display = 'none'
                const fallback = e.currentTarget.nextElementSibling
                if (fallback) fallback.style.display = 'block'
              }}
            />
          ) : (
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
          )}
          {logo && <Icon size={20} strokeWidth={1.8} aria-hidden="true" style={{ display: 'none' }} />}
        </a>
      ))}
    </div>
  )
}
