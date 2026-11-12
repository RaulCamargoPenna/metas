import './global.css'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AppRoutes } from './routes/AppRoutes'
import { hasSession } from './lib/api'

export function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [, refreshNavigation] = useState(0)

  useEffect(() => {
    function syncSession(event) {
      if (event.storageArea !== localStorage || event.key !== 'metas_refresh_token') return
      const signedIn = hasSession()
      if (!signedIn && (location.pathname === '/perfil' || location.pathname.startsWith('/metas'))) {
        navigate('/login', { replace: true })
      } else if (signedIn && (location.pathname === '/login' || location.pathname === '/cadastro')) {
        navigate('/perfil', { replace: true })
      } else {
        refreshNavigation((value) => value + 1)
      }
    }
    window.addEventListener('storage', syncSession)
    return () => window.removeEventListener('storage', syncSession)
  }, [location.pathname, navigate])

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#f7faf7] font-sans text-slate-800 selection:bg-emerald-200/70">
      <div className="pointer-events-none absolute -left-40 top-24 -z-10 h-[36rem] w-[36rem] rounded-full bg-emerald-200/55 blur-[105px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-48 top-96 -z-10 h-[38rem] w-[38rem] rounded-full bg-violet-200/60 blur-[115px]" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/3 top-[85rem] -z-10 h-[32rem] w-[32rem] rounded-full bg-cyan-100/70 blur-[100px]" aria-hidden="true" />
      <AppRoutes />
    </div>
  )
}
