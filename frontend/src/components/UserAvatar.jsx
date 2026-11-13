import { useState } from 'react'

export function UserAvatar({ username, image, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const initials = (username || '?').slice(0, 2).toUpperCase()
  const imageUrl = image ? new URL(image, window.location.origin).href : null

  return (
    <span className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-emerald-100 via-teal-100 to-violet-100 font-extrabold text-emerald-900 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_8px_20px_-12px_rgba(8,80,54,0.4)] ${className}`}>
      {imageUrl && !imageFailed ? <img className="h-full w-full object-cover" src={imageUrl} alt={`Foto de ${username}`} onError={() => setImageFailed(true)} /> : <span aria-label={`Avatar de ${username}`}>{initials}</span>}
    </span>
  )
}
