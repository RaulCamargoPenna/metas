import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { DashboardHeader } from '../components/DashboardHeader'
import { GoalFilters } from '../components/GoalFilters'
import { GoalLikeButton } from '../components/GoalLikeButton'
import { ArrowIcon } from '../components/Navbar'
import { UserAvatar } from '../components/UserAvatar'
import { apiRequest, hasSession, readApiError, SessionExpiredError } from '../lib/api'
import { buildGoalFilterQuery, emptyGoalFilters } from '../lib/goalFilters'
import { formError, glass, kicker, pageWidth, primaryButton } from '../lib/ui'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

async function fetchFeedPage(query = '') {
  const response = await apiRequest(`/feed${query}`)
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível carregar o feed.'))
  const data = await response.json()
  if (!Array.isArray(data.results)) throw new Error('A resposta do feed está incompleta.')
  if (data.results.some((goal) => !goal.id || !goal.name)) throw new Error('A resposta do feed está sem o identificador ou o nome das metas.')
  return { results: data.results, next: data.next ? new URL(data.next, window.location.origin).search : null }
}

function appendGoals(current, incoming) {
  const knownIds = new Set(current.map((goal) => goal.id))
  return [...current, ...incoming.filter((goal) => !knownIds.has(goal.id))]
}

export function PublicGoalCard({ goal }) {
  const progress = Math.max(0, Math.min(100, Number(goal.progress) || 0))
  const taskCount = Math.max(0, Number(goal.total_tasks ?? (Array.isArray(goal.tasks) ? goal.tasks.length : goal.tasks)) || 0)
  const owner = goal.owner ?? goal.user

  return (
    <article className={`${glass} group flex h-full flex-col overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_-30px_rgba(26,88,60,0.34)] sm:p-6`}>
      <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-emerald-100/75 blur-3xl" aria-hidden="true" />
      <div className="relative flex items-center gap-3">
        <UserAvatar username={owner} image={goal.image} className="h-11 w-11 text-sm" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-emerald-950">{owner}</p><p className="mt-0.5 text-[11px] text-slate-500">Meta pública</p></div>
        {goal.created_at && <time dateTime={goal.created_at} className="shrink-0 text-[11px] text-slate-500">{dateFormatter.format(new Date(goal.created_at))}</time>}
      </div>
      <div className="relative mt-5 flex-1">
        <h2 className="line-clamp-2 text-xl font-extrabold leading-snug tracking-[-0.04em] text-emerald-950 sm:text-2xl">{goal.name}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{goal.description}</p>
      </div>
      <div className="relative mt-5 rounded-2xl border border-white/80 bg-white/45 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-emerald-800">{taskCount} {taskCount === 1 ? 'tarefa' : 'tarefas'}</span><span className="font-semibold text-slate-500">Progresso <strong className="ml-1 text-emerald-700">{Math.round(progress)}%</strong></span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100/80"><span className="block h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-600" style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/80 pt-4">
        <GoalLikeButton goalId={goal.id} totalLikes={goal.total_likes} alreadyLiked={goal.already_liked} />
        <Link to={`/feed/${goal.id}#comments`} className="text-xs font-extrabold text-slate-600 transition hover:text-emerald-800">Comentar</Link>
        <Link to={`/feed/${goal.id}`} className="ml-auto inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 transition hover:gap-2 hover:text-emerald-600">Ver meta <ArrowIcon diagonal /></Link>
      </div>
    </article>
  )
}

export function Feed() {
  const navigate = useNavigate()
  const [goals, setGoals] = useState([])
  const [filters, setFilters] = useState(emptyGoalFilters)
  const [filterQuery, setFilterQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nextPage, setNextPage] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pageError, setPageError] = useState('')
  const [hasScrolled, setHasScrolled] = useState(() => window.scrollY > 0)
  const sentinelRef = useRef(null)
  const loadingMoreRef = useRef(false)
  const mountedRef = useRef(false)
  const filterQueryRef = useRef('')

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const onScroll = () => setHasScrolled(true)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextQuery = buildGoalFilterQuery(filters)
      if (nextQuery === filterQuery) return
      filterQueryRef.current = nextQuery
      loadingMoreRef.current = false
      setGoals([])
      setNextPage(null)
      setLoading(true)
      setLoadingMore(false)
      setError('')
      setPageError('')
      setHasScrolled(false)
      setFilterQuery(nextQuery)
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [filters, filterQuery])

  useEffect(() => {
    let active = true
    async function loadFeed() {
      try {
        const page = await fetchFeedPage(filterQuery)
        if (active) {
          setGoals(page.results)
          setNextPage(page.next)
        }
      }
      catch (caughtError) { if (!active) return; if (caughtError instanceof SessionExpiredError) navigate('/login', { replace: true }); else setError(caughtError.message) }
      finally { if (active) setLoading(false) }
    }
    if (hasSession()) loadFeed()
    return () => { active = false }
  }, [filterQuery, navigate])

  const loadMore = useCallback(async () => {
    if (!nextPage || loadingMoreRef.current) return
    const requestedFilter = filterQuery
    loadingMoreRef.current = true
    setLoadingMore(true)
    setPageError('')
    try {
      const page = await fetchFeedPage(nextPage)
      if (!mountedRef.current || filterQueryRef.current !== requestedFilter) return
      setGoals((current) => appendGoals(current, page.results))
      setNextPage(page.next)
    } catch (caughtError) {
      if (!mountedRef.current || filterQueryRef.current !== requestedFilter) return
      if (caughtError instanceof SessionExpiredError) navigate('/login', { replace: true })
      else setPageError(caughtError.message)
    } finally {
      if (filterQueryRef.current === requestedFilter) {
        loadingMoreRef.current = false
        if (mountedRef.current) setLoadingMore(false)
      }
    }
  }, [filterQuery, nextPage, navigate])

  useEffect(() => {
    if (!hasScrolled || !nextPage || !sentinelRef.current || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect()
        loadMore()
      }
    }, { rootMargin: '300px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasScrolled, nextPage, loadMore])

  if (!hasSession()) return <Navigate to="/login" replace />

  function updateFilters(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="min-h-screen pb-20"><DashboardHeader /><main className={`${pageWidth} pt-12`}>
      <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-emerald-100/70 via-white/50 to-violet-100/65 p-7 shadow-[0_22px_65px_-30px_rgba(32,91,58,0.25)] backdrop-blur-3xl sm:p-10"><div className="pointer-events-none absolute -right-18 -top-35 h-80 w-80 rounded-full bg-emerald-200/55 blur-3xl" /><span className={`${kicker} relative`}>JORNADAS COMPARTILHADAS</span><h1 className="relative mt-3 text-4xl font-extrabold tracking-[-0.06em] text-emerald-950 sm:text-5xl">Inspiração para <em className="font-serif font-normal text-emerald-600">seguir em frente.</em></h1><p className="relative mt-4 max-w-xl text-sm leading-7 text-slate-600">Conheça metas públicas da comunidade. Cada história pode ser o empurrão que faltava para a sua.</p><span className="pointer-events-none absolute bottom-3 right-9 hidden text-8xl text-emerald-300/35 sm:block" aria-hidden="true">✳</span></div>
      <div className="mt-10"><span className={kicker}>COMUNIDADE</span><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-950">Metas da comunidade</h2><p className="mt-1 text-xs text-slate-500">Encontre metas por pessoa, descrição ou nome.</p></div>
      <div className={`${glass} mt-5 p-4 sm:p-5`}><GoalFilters filters={filters} onChange={updateFilters} /></div>
      {loading ? <div className={`${glass} mt-7 grid min-h-56 place-items-center text-sm text-slate-500`} role="status">Carregando metas da comunidade...</div> : error ? <div className={`${glass} mt-7 flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center text-sm text-rose-700`} role="alert"><p>{error}</p><button type="button" className={primaryButton} onClick={() => window.location.reload()}>Tentar novamente</button></div> : <>
        {goals.length === 0 ? <div className={`${glass} mt-7 flex min-h-56 flex-col items-center justify-center p-8 text-center`}><span className="text-4xl text-emerald-400">✳</span><h2 className="mt-2 text-lg font-extrabold text-emerald-950">{filterQuery ? 'Nenhuma meta encontrada.' : 'Ainda não há metas públicas.'}</h2><p className="mt-2 text-xs text-slate-500">{filterQuery ? 'Tente ajustar os filtros.' : 'Quando a comunidade compartilhar metas, elas aparecerão aqui.'}</p></div> : <div className="mt-7 grid gap-5 md:grid-cols-2">{goals.map((goal) => <PublicGoalCard key={goal.id} goal={goal} />)}</div>}
        {nextPage && <div ref={sentinelRef} className="mt-8 flex flex-col items-center gap-3" aria-live="polite">{pageError && <p className={formError} role="alert">{pageError}</p>}<button type="button" className={primaryButton} onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Carregando mais metas...' : pageError ? 'Tentar novamente' : 'Carregar mais metas'}</button></div>}
      </>}
    </main></div>
  )
}
