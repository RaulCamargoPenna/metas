import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { DashboardHeader } from '../components/DashboardHeader'
import { ArrowIcon } from '../components/Navbar'
import { UserAvatar } from '../components/UserAvatar'
import { fetchCollection, hasSession, SessionExpiredError } from '../lib/api'
import { field, glass, kicker, pageWidth, primaryButton } from '../lib/ui'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

export function PublicGoalCard({ goal }) {
  const progress = Math.max(0, Math.min(100, Number(goal.progress) || 0))

  return (
    <article className={`${glass} flex h-full flex-col overflow-hidden p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_-30px_rgba(26,88,60,0.34)]`}>
      <div className="flex items-center gap-3">
        <UserAvatar username={goal.user} image={goal.image} className="h-12 w-12 text-sm" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-emerald-950">{goal.user}</p><p className="mt-0.5 text-[11px] text-slate-500">Compartilhou uma meta</p></div>
        <span className="rounded-full border border-emerald-200/70 bg-emerald-100/70 px-3 py-1.5 text-[10px] font-extrabold text-emerald-800">✦ Pública</span>
      </div>
      <div className="relative mt-6 overflow-hidden rounded-[22px] border border-white/65 bg-gradient-to-br from-emerald-100/65 via-white/55 to-violet-100/65 p-5 backdrop-blur-xl"><span className="absolute -right-5 -top-9 text-[120px] leading-none text-emerald-200/40" aria-hidden="true">✳</span><h2 className="relative line-clamp-2 text-xl font-extrabold leading-snug tracking-tight text-emerald-950">{goal.name}</h2><p className="relative mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{goal.description}</p></div>
      <div className="mt-auto pt-6"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-500">Progresso da meta</span><strong className="text-emerald-700">{Math.round(progress)}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100/80"><span className="block h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-600" style={{ width: `${progress}%` }} /></div><div className="mt-5 flex items-center justify-between border-t border-white/80 pt-4"><time dateTime={goal.created_at} className="text-[11px] text-slate-500">{dateFormatter.format(new Date(goal.created_at))}</time><Link to={`/feed/${goal.id}`} className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-800 transition hover:text-emerald-600">Ver meta <ArrowIcon diagonal /></Link></div></div>
    </article>
  )
}

export function Feed() {
  const navigate = useNavigate()
  const [goals, setGoals] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadFeed() {
      try { const data = await fetchCollection('/feed'); if (active) setGoals([...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) }
      catch (caughtError) { if (!active) return; if (caughtError instanceof SessionExpiredError) navigate('/login', { replace: true }); else setError(caughtError.message) }
      finally { if (active) setLoading(false) }
    }
    if (hasSession()) loadFeed()
    return () => { active = false }
  }, [navigate])

  if (!hasSession()) return <Navigate to="/login" replace />

  const filteredGoals = goals.filter((goal) => `${goal.name} ${goal.description} ${goal.user}`.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')))

  return (
    <div className="min-h-screen pb-20"><DashboardHeader /><main className={`${pageWidth} pt-12`}>
      <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-emerald-100/70 via-white/50 to-violet-100/65 p-7 shadow-[0_22px_65px_-30px_rgba(32,91,58,0.25)] backdrop-blur-3xl sm:p-10"><div className="pointer-events-none absolute -right-18 -top-35 h-80 w-80 rounded-full bg-emerald-200/55 blur-3xl" /><span className={`${kicker} relative`}>JORNADAS COMPARTILHADAS</span><h1 className="relative mt-3 text-4xl font-extrabold tracking-[-0.06em] text-emerald-950 sm:text-5xl">Inspiração para <em className="font-serif font-normal text-emerald-600">seguir em frente.</em></h1><p className="relative mt-4 max-w-xl text-sm leading-7 text-slate-600">Conheça metas públicas da comunidade. Cada história pode ser o empurrão que faltava para a sua.</p><span className="pointer-events-none absolute bottom-3 right-9 hidden text-8xl text-emerald-300/35 sm:block" aria-hidden="true">✳</span></div>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><span className={kicker}>COMUNIDADE</span><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-950">Metas da comunidade</h2><p className="mt-1 text-xs text-slate-500">Um pouco de inspiração para o seu próximo passo.</p></div><label className="w-full sm:max-w-xs"><span className="sr-only">Buscar metas públicas</span><input className={field} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar metas ou pessoas..." /></label></div>
      {loading ? <div className={`${glass} mt-7 grid min-h-56 place-items-center text-sm text-slate-500`} role="status">Carregando metas da comunidade...</div> : error ? <div className={`${glass} mt-7 flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center text-sm text-rose-700`} role="alert"><p>{error}</p><button type="button" className={primaryButton} onClick={() => window.location.reload()}>Tentar novamente</button></div> : filteredGoals.length === 0 ? <div className={`${glass} mt-7 flex min-h-56 flex-col items-center justify-center p-8 text-center`}><span className="text-4xl text-emerald-400">✳</span><h2 className="mt-2 text-lg font-extrabold text-emerald-950">{query ? 'Nenhuma meta encontrada.' : 'Ainda não há metas públicas.'}</h2><p className="mt-2 text-xs text-slate-500">{query ? 'Tente buscar outro assunto ou pessoa.' : 'Quando a comunidade compartilhar metas, elas aparecerão aqui.'}</p></div> : <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredGoals.map((goal) => <PublicGoalCard key={goal.id} goal={goal} />)}</div>}
    </main></div>
  )
}
