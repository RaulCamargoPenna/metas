import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { DashboardHeader } from '../components/DashboardHeader'
import { GoalFilters } from '../components/GoalFilters'
import { ArrowIcon } from '../components/Navbar'
import { apiRequest, hasSession, readApiError, SessionExpiredError } from '../lib/api'
import { buildGoalFilterQuery, emptyGoalFilters } from '../lib/goalFilters'
import { field, fieldLabel, formError, glass, kicker, pageWidth, primaryButton } from '../lib/ui'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

async function fetchGoalsPage(query = '') {
  const response = await apiRequest(`/goals${query}`)
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível carregar suas metas.'))
  const data = await response.json()
  if (!Array.isArray(data.results)) throw new Error('A resposta das metas está incompleta.')
  if (data.results.some((goal) => !goal.id || !goal.name)) throw new Error('A resposta das metas está sem o identificador ou o nome de uma meta.')
  return { results: data.results, count: data.count, next: data.next ? new URL(data.next, window.location.origin).search : null }
}

export function VisibilitySwitch({ checked, onChange, disabled = false, description }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/45 p-4 backdrop-blur-xl"><span><strong className="block text-xs text-emerald-950">Compartilhar com a comunidade</strong><small className="mt-1 block text-[11px] text-slate-500">{description}</small></span><input className="peer sr-only" type="checkbox" checked={checked} onChange={onChange} disabled={disabled} /><span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-200 peer-disabled:opacity-50 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition after:content-[''] peer-checked:after:translate-x-5" /></label>
}

function GoalCard({ goal }) {
  const progress = Math.max(0, Math.min(100, Number(goal.progress) || 0))
  const taskCount = Math.max(0, Number(goal.total_tasks) || 0)
  return <Link to={`/metas/${goal.id}`} className={`${glass} group flex h-full flex-col overflow-hidden p-5 transition duration-300 hover:-translate-y-1 sm:p-6`}><div className="flex items-center justify-between gap-3"><span className="text-xs font-extrabold text-emerald-800">Minha meta</span>{typeof goal.public === 'boolean' && <span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${goal.public ? 'bg-emerald-100/70 text-emerald-800' : 'bg-slate-100/80 text-slate-600'}`}>{goal.public ? '✦ Pública' : '◌ Privada'}</span>}</div><div className="mt-5 flex-1"><h2 className="line-clamp-2 text-xl font-extrabold leading-snug tracking-[-0.04em] text-emerald-950 sm:text-2xl">{goal.name}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{goal.description}</p></div><div className="mt-5 rounded-2xl border border-white/80 bg-white/45 p-4 backdrop-blur-xl"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-emerald-800">{taskCount} {taskCount === 1 ? 'tarefa' : 'tarefas'}</span><span className="font-semibold text-slate-500">Progresso <strong className="ml-1 text-emerald-700">{Math.round(progress)}%</strong></span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100/80"><span className="block h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-600" style={{ width: `${progress}%` }} /></div></div><div className="mt-5 flex items-center justify-between border-t border-white/80 pt-4"><span className="text-[11px] text-slate-500">{goal.created_at && `Criada em ${dateFormatter.format(new Date(goal.created_at))}`}</span><span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 transition group-hover:gap-2">Ver meta <ArrowIcon diagonal /></span></div></Link>
}

export function Goals() {
  const navigate = useNavigate()
  const [goals, setGoals] = useState([])
  const [filters, setFilters] = useState(emptyGoalFilters)
  const [filterQuery, setFilterQuery] = useState('')
  const [totalGoals, setTotalGoals] = useState(null)
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
      setTotalGoals(null)
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
    async function loadGoals() {
      try {
        const page = await fetchGoalsPage(filterQuery)
        if (active) {
          setGoals(page.results)
          setTotalGoals(page.count)
          setNextPage(page.next)
        }
      } catch (caughtError) {
        if (!active) return
        if (caughtError instanceof SessionExpiredError) navigate('/login', { replace: true })
        else setError(caughtError.message)
      } finally { if (active) setLoading(false) }
    }
    if (hasSession()) loadGoals()
    return () => { active = false }
  }, [filterQuery, navigate])

  const loadMore = useCallback(async () => {
    if (!nextPage || loadingMoreRef.current) return
    const requestedFilter = filterQuery
    loadingMoreRef.current = true
    setLoadingMore(true)
    setPageError('')
    try {
      const page = await fetchGoalsPage(nextPage)
      if (!mountedRef.current || filterQueryRef.current !== requestedFilter) return
      setGoals((current) => {
        const knownIds = new Set(current.map((goal) => goal.id))
        return [...current, ...page.results.filter((goal) => !knownIds.has(goal.id))]
      })
      setTotalGoals(page.count)
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

  const completed = goals.filter((goal) => Number(goal.progress) === 100).length
  const total = typeof totalGoals === 'number' ? totalGoals : goals.length

  return (
    <div className="min-h-screen pb-20">
      <DashboardHeader />
      <main className={`${pageWidth} pt-12`}>
        <div className="mb-9 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end"><div><span className={kicker}>MINHA JORNADA</span><h1 className="mt-3 text-5xl font-extrabold tracking-[-0.06em] text-emerald-950">Minhas <em className="font-serif font-normal text-emerald-600">metas.</em></h1><p className="mt-3 text-sm text-slate-500">Um lugar para acompanhar tudo o que você está construindo, passo a passo.</p></div><Link to="/metas/nova" className={`${primaryButton} w-full sm:w-auto`}>+ Nova meta</Link></div>
        <div className={`${glass} mb-6 p-4 sm:p-5`}><GoalFilters filters={filters} onChange={updateFilters} /></div>
        {loading ? <div className={`${glass} grid min-h-64 place-items-center text-sm text-slate-500`} role="status">Carregando suas metas...</div> : error ? <div className={`${glass} flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-sm text-rose-700`} role="alert"><p>{error}</p><button type="button" className={primaryButton} onClick={() => window.location.reload()}>Tentar novamente</button></div> : <>
          {goals.length === 0 ? (filterQuery ? <div className={`${glass} flex min-h-72 flex-col items-center justify-center p-8 text-center`}><span className="text-5xl text-emerald-400">⌕</span><h2 className="mt-3 text-2xl font-extrabold text-emerald-950">Nenhuma meta encontrada.</h2><p className="mt-2 text-sm text-slate-500">Tente ajustar os filtros.</p></div> : <div className={`${glass} flex min-h-72 flex-col items-center justify-center p-8 text-center`}><span className="text-5xl text-emerald-400">✳</span><h2 className="mt-3 text-2xl font-extrabold text-emerald-950">O primeiro passo é seu.</h2><p className="mt-2 text-sm text-slate-500">Crie uma meta e transforme aquela ideia em uma jornada possível.</p><Link to="/metas/nova" className={`${primaryButton} mt-6`}>Criar minha primeira meta <ArrowIcon /></Link></div>) : <><div className="mb-6 flex flex-wrap gap-3 text-xs text-slate-600"><span className="rounded-full border border-white/80 bg-white/50 px-4 py-2 backdrop-blur-xl"><strong className="text-emerald-700">{total}</strong> {filterQuery ? (total === 1 ? 'meta encontrada' : 'metas encontradas') : (total === 1 ? 'meta criada' : 'metas criadas')}</span><span className="rounded-full border border-white/80 bg-white/50 px-4 py-2 backdrop-blur-xl"><strong className="text-emerald-700">{completed}</strong> {completed === 1 ? 'meta concluída carregada' : 'metas concluídas carregadas'}</span></div><div className="grid gap-5 md:grid-cols-2">{goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}</div></>}
          {nextPage && <div ref={sentinelRef} className="mt-8 flex flex-col items-center gap-3" aria-live="polite">{pageError && <p className={formError} role="alert">{pageError}</p>}<button type="button" className={primaryButton} onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Carregando mais metas...' : pageError ? 'Tentar novamente' : 'Carregar mais metas'}</button></div>}
        </>}
      </main>
    </div>
  )
}

export function NewGoal() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!hasSession()) return <Navigate to="/login" replace />

  async function createGoal(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await apiRequest('/goals', { method: 'POST', body: { name: name.trim(), description: description.trim(), public: isPublic } })
      if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível criar sua meta.'))
      const goal = await response.json()
      if (!goal.id) throw new Error('A resposta do servidor está incompleta.')
      navigate(`/metas/${goal.id}`, { replace: true, state: { created: true } })
    } catch (caughtError) {
      if (caughtError instanceof SessionExpiredError) navigate('/login', { replace: true })
      else setError(caughtError.message)
    } finally { setSaving(false) }
  }

  return <div className="min-h-screen pb-20"><DashboardHeader /><main className={`${pageWidth} pt-9`}><Link to="/metas" className="text-xs font-bold text-emerald-700 hover:text-emerald-900">← Voltar para minhas metas</Link><div className="mx-auto mt-12 max-w-2xl text-center"><span className={kicker}>UM NOVO COMEÇO</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.06em] text-emerald-950 sm:text-5xl">Qual é sua próxima <em className="font-serif font-normal text-emerald-600">meta?</em></h1><p className="mt-3 text-sm leading-6 text-slate-500">Comece com uma ideia. Depois você pode dividir o caminho em tarefas menores.</p></div><form className={`${glass} mx-auto mt-9 flex max-w-2xl flex-col gap-5 p-6 sm:p-10`} onSubmit={createGoal}><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100/80 text-2xl text-emerald-700">✳</span><div><h2 className="text-xl font-extrabold tracking-tight text-emerald-950">Vamos dar nome a esse sonho</h2><p className="mt-1 text-xs text-slate-500">Escreva do seu jeito. O que importa é começar.</p></div><div><label className={fieldLabel} htmlFor="goal-name">Nome da meta</label><input className={field} id="goal-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={150} required placeholder="Ex.: Correr meus primeiros 10 km" /></div><div><label className={fieldLabel} htmlFor="goal-description">Descrição</label><textarea className={`${field} resize-y`} id="goal-description" value={description} onChange={(event) => setDescription(event.target.value)} required rows={5} placeholder="O que você deseja alcançar? Por que isso importa para você?" /></div><VisibilitySwitch checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} description={isPublic ? 'Sua meta ficará pública para outras pessoas.' : 'Por enquanto, só você poderá ver esta meta.'} />{error && <p className={formError} role="alert">{error}</p>}<div className="flex items-center justify-end gap-5 border-t border-white/80 pt-5"><Link to="/metas" className="text-xs font-bold text-slate-500 hover:text-emerald-800">Cancelar</Link><button className={primaryButton} type="submit" disabled={saving}>{saving ? 'Criando...' : 'Criar meta'} {!saving && <ArrowIcon />}</button></div></form></main></div>
}
