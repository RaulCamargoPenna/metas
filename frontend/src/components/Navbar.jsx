import { Link, NavLink } from 'react-router'
import { hasSession } from '../lib/api'
import { glassSoft, pageWidth, primaryButton } from '../lib/ui'

export function Logo({ compact = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 text-2xl font-extrabold tracking-[-0.08em] text-emerald-950" aria-label="Metas, voltar ao início">
      <span className="flex h-9 w-9 items-end justify-center gap-0.5 rounded-xl bg-gradient-to-br from-emerald-100/80 to-white/50 pb-2 shadow-inner ring-1 ring-white/80" aria-hidden="true">
        <span className="h-3 w-1.5 rotate-[-15deg] rounded-full bg-emerald-300" />
        <span className="h-5 w-1.5 rotate-[-15deg] rounded-full bg-emerald-500" />
        <span className="h-4 w-1.5 rotate-[-15deg] rounded-full bg-emerald-700" />
      </span>
      {!compact && <span>metas<span className="text-emerald-500">.</span></span>}
    </Link>
  )
}

export function ArrowIcon({ diagonal = false }) {
  return diagonal ? (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ) : (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  )
}

export function Navbar() {
  const signedIn = hasSession()
  return (
    <header className={`${pageWidth} pt-5`}>
      <nav className={`${glassSoft} flex min-h-18 items-center justify-between gap-5 px-4 sm:px-6`} aria-label="Navegação principal">
        <Logo />
        <div className="hidden items-center gap-6 text-xs font-bold text-slate-500 lg:flex">
          <NavLink className={({ isActive }) => isActive ? 'text-emerald-800' : 'transition hover:text-emerald-800'} to="/" end>Início</NavLink>
          <a className="transition hover:text-emerald-800" href="/#como-funciona">Como funciona</a>
          <NavLink className={({ isActive }) => isActive ? 'text-emerald-800' : 'transition hover:text-emerald-800'} to="/about">Sobre</NavLink>
          {signedIn && <NavLink className={({ isActive }) => isActive ? 'text-emerald-800' : 'transition hover:text-emerald-800'} to="/feed">Feed</NavLink>}
          {signedIn && <NavLink className={({ isActive }) => isActive ? 'text-emerald-800' : 'transition hover:text-emerald-800'} to="/metas">Minhas metas</NavLink>}
        </div>
        <Link to={signedIn ? '/perfil' : '/login'} className={`${primaryButton} px-4 py-3 sm:px-5`}>{signedIn ? 'Meu perfil' : 'Entrar'} <ArrowIcon /></Link>
      </nav>
    </header>
  )
}
