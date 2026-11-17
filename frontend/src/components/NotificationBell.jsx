import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest, fetchCollection, readApiError, SessionExpiredError } from '../lib/api'
import { glassSoft } from '../lib/ui'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [markingId, setMarkingId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const syncVersion = useRef(0)

  useEffect(() => {
    let active = true
    let refreshing = false
    async function refresh() {
      if (document.visibilityState === 'hidden' || refreshing) return
      refreshing = true
      const version = syncVersion.current
      try {
        const data = await fetchCollection(open ? (onlyUnread ? '/notifications?read=false' : '/notifications') : '/notifications?read=false')
        if (!active || version !== syncVersion.current) return
        if (open) setNotifications([...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
        setUnreadCount(open && !onlyUnread ? data.filter((item) => !item.read).length : data.length)
      } catch (error) {
        if (active && error instanceof SessionExpiredError) navigate('/login', { replace: true })
      } finally { refreshing = false }
    }
    if (!open) refresh()
    const timer = setInterval(refresh, 30_000)
    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [open, onlyUnread, navigate])

  useEffect(() => {
    if (!open) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  async function loadNotifications(unreadOnly = onlyUnread) {
    const version = ++syncVersion.current
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchCollection(unreadOnly ? '/notifications?read=false' : '/notifications')
      if (version !== syncVersion.current) return
      setNotifications([...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
      setUnreadCount(unreadOnly ? data.length : data.filter((item) => !item.read).length)
    } catch (error) {
      if (version !== syncVersion.current) return
      if (error instanceof SessionExpiredError) navigate('/login', { replace: true })
      else setLoadError(error.message)
    } finally { if (version === syncVersion.current) setLoading(false) }
  }

  function togglePanel() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    setActionError('')
    loadNotifications()
  }

  function changeFilter(unreadOnly) {
    if (onlyUnread === unreadOnly) return
    setOnlyUnread(unreadOnly)
    setActionError('')
    loadNotifications(unreadOnly)
  }

  async function markAsRead(notification) {
    if (markingId || notification.read) return
    setMarkingId(notification.id)
    setActionError('')
    ++syncVersion.current
    try {
      const response = await apiRequest(`/notifications/${notification.id}`, { method: 'PATCH', body: { read: true } })
      if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível marcar a notificação como lida.'))
      const updated = await response.json()
      ++syncVersion.current
      setNotifications((current) => onlyUnread ? current.filter((item) => item.id !== notification.id) : current.map((item) => item.id === notification.id ? updated : item))
      setUnreadCount((current) => Math.max(0, current - 1))
    } catch (error) {
      if (error instanceof SessionExpiredError) navigate('/login', { replace: true })
      else setActionError(error.message)
    } finally { setMarkingId(null) }
  }

  return (
    <div className="relative shrink-0">
      <button type="button" aria-label="Notificações" aria-expanded={open} aria-controls="notifications-panel" onClick={togglePanel} className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/80 bg-white/60 text-emerald-900 shadow-sm backdrop-blur-xl transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white" aria-label={`${unreadCount} ${unreadCount === 1 ? 'não lida' : 'não lidas'}`}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && <div id="notifications-panel" className={`${glassSoft} absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] max-h-[min(32rem,70vh)] overflow-y-auto p-4 shadow-[0_24px_70px_-24px_rgba(36,77,59,0.35)] sm:p-5`} aria-label="Lista de notificações">
        <div className="flex items-center justify-between gap-3 border-b border-white/80 pb-3"><div><h2 className="text-sm font-extrabold text-emerald-950">Notificações</h2><p className="mt-0.5 text-xs text-slate-500">{unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}</p></div><button type="button" aria-label="Fechar notificações" className="rounded-lg px-2 py-1 text-lg text-slate-500 hover:bg-white/70 hover:text-emerald-950" onClick={() => setOpen(false)}>×</button></div>
        <div className="mt-3 flex gap-2" role="group" aria-label="Filtrar notificações"><button type="button" aria-pressed={!onlyUnread} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${onlyUnread ? 'bg-white/50 text-slate-500 hover:bg-white/80' : 'bg-emerald-100/80 text-emerald-900'}`} onClick={() => changeFilter(false)}>Todas</button><button type="button" aria-pressed={onlyUnread} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${onlyUnread ? 'bg-emerald-100/80 text-emerald-900' : 'bg-white/50 text-slate-500 hover:bg-white/80'}`} onClick={() => changeFilter(true)}>Não lidas</button></div>
        {loading ? <p className="py-8 text-center text-xs text-slate-500" role="status">Carregando notificações...</p> : loadError ? <div className="py-6 text-center"><p className="text-xs text-rose-700" role="alert">{loadError}</p><button type="button" className="mt-3 text-xs font-bold text-emerald-800 hover:underline" onClick={() => loadNotifications()}>Tentar novamente</button></div> : notifications.length === 0 ? <p className="py-8 text-center text-xs text-slate-500">{onlyUnread ? 'Nenhuma notificação não lida.' : 'Você ainda não tem notificações.'}</p> : <ul className="mt-3 space-y-2">{notifications.map((notification) => <li key={notification.id} className={`rounded-2xl border p-3 ${notification.read ? 'border-white/70 bg-white/35' : 'border-emerald-200/80 bg-emerald-50/70'}`}><div className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-slate-300' : 'bg-emerald-500'}`} aria-hidden="true" /><div className="min-w-0 flex-1"><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{notification.description}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2">{notification.created_at && <time dateTime={notification.created_at} className="text-[10px] text-slate-500">{dateFormatter.format(new Date(notification.created_at))}</time>}{!notification.read && <button type="button" className="text-[11px] font-bold text-emerald-800 hover:underline disabled:opacity-60" disabled={markingId !== null} onClick={() => markAsRead(notification)} aria-label={`Marcar como lida: ${notification.description}`}>{markingId === notification.id ? 'Marcando...' : 'Marcar como lida'}</button>}</div></div></div></li>)}</ul>}
        {actionError && <p className="mt-3 rounded-xl bg-rose-50/80 p-3 text-xs text-rose-700" role="alert">{actionError}</p>}
      </div>}
    </div>
  )
}
