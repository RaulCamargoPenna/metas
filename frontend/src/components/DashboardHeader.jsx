import { Link, NavLink, useNavigate } from 'react-router'
import { clearSession } from '../lib/api'
import { glassSoft, pageWidth } from '../lib/ui'
import { Logo } from './Navbar'

export function DashboardHeader() {
  const navigate = useNavigate()

  function signOut() {
    clearSession()
    navigate('/login', { replace: true })
  }

  const navClass = ({ isActive }) => `whitespace-nowrap transition hover:text-emerald-800 ${isActive ? 'text-emerald-900' : 'text-slate-500'}`

  return (
    <header className={`${pageWidth} pt-5`}>
      <div className={`${glassSoft} flex min-h-18 flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6`}>
        <Logo />
        <nav className="order-3 flex w-full items-center gap-5 overflow-x-auto text-xs font-bold sm:order-2 sm:w-auto sm:gap-8" aria-label="Navegação da conta">
          <NavLink to="/metas" end className={navClass}>Minhas metas</NavLink>
          <NavLink to="/perfil" className={navClass}>Meu perfil</NavLink>
          <Link to="/" className="whitespace-nowrap text-slate-500 transition hover:text-emerald-800">Início</Link>
        </nav>
        <button type="button" onClick={signOut} className="order-2 rounded-xl border border-white/80 bg-white/55 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-white/80 hover:text-emerald-900 sm:order-3">Sair</button>
      </div>
    </header>
  )
}
