import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { DashboardHeader } from '../components/DashboardHeader'
import { ArrowIcon } from '../components/Navbar'
import { apiRequest, fetchCollection, hasSession, readApiError, SessionExpiredError } from '../lib/api'
import { field, fieldLabel, formError, formSuccess, glass, kicker, pageWidth, primaryButton } from '../lib/ui'
import { VisibilitySwitch } from './Goals'

const sortTasks = (tasks) => [...tasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

export function GoalDetail() {
  const { goalId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [goal, setGoal] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [taskName, setTaskName] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [savingTask, setSavingTask] = useState(false)
  const [taskError, setTaskError] = useState('')
  const [taskMessage, setTaskMessage] = useState(location.state?.created ? 'Meta criada! Agora adicione os passos para chegar lá.' : '')
  const [updatingTaskId, setUpdatingTaskId] = useState(null)
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [visibilityMessage, setVisibilityMessage] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [goalResponse, goalTasks] = await Promise.all([apiRequest(`/goals/${goalId}`), fetchCollection(`/tasks?goal=${encodeURIComponent(goalId)}`)])
        if (!goalResponse.ok) throw new Error(goalResponse.status === 404 ? 'Meta não encontrada.' : await readApiError(goalResponse, 'Não foi possível carregar a meta.'))
        const goalData = await goalResponse.json()
        if (active) { setGoal(goalData); setTasks(sortTasks(goalTasks)) }
      } catch (error) {
        if (!active) return
        if (error instanceof SessionExpiredError) navigate('/login', { replace: true })
        else setLoadError(error.message)
      } finally { if (active) setLoading(false) }
    }
    if (hasSession()) load()
    return () => { active = false }
  }, [goalId, navigate])

  if (!hasSession()) return <Navigate to="/login" replace />

  async function updateProgress() {
    const response = await apiRequest(`/goals/${goalId}`)
    if (response.ok) setGoal(await response.json())
  }

  async function changeVisibility() {
    setSavingVisibility(true)
    setVisibilityMessage(null)
    try {
      const response = await apiRequest(`/goals/${goalId}`, { method: 'PATCH', body: { public: !goal.public } })
      if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível alterar a visibilidade da meta.'))
      const updated = await response.json()
      setGoal(updated)
      setVisibilityMessage({ type: 'success', text: updated.public ? 'Agora sua meta é pública.' : 'Agora sua meta é privada.' })
    } catch (error) {
      if (error instanceof SessionExpiredError) navigate('/login', { replace: true })
      else setVisibilityMessage({ type: 'error', text: error.message })
    } finally { setSavingVisibility(false) }
  }

  async function createTask(event) {
    event.preventDefault()
    setSavingTask(true)
    setTaskError('')
    setTaskMessage('')
    try {
      const response = await apiRequest('/tasks', { method: 'POST', body: { goal: goalId, name: taskName.trim(), description: taskDescription.trim() } })
      if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível criar a tarefa.'))
      const task = await response.json()
      setTasks((current) => sortTasks([task, ...current]))
      setTaskName('')
      setTaskDescription('')
      setTaskMessage('Tarefa adicionada à sua meta.')
      await updateProgress()
    } catch (error) {
      if (error instanceof SessionExpiredError) navigate('/login', { replace: true })
      else setTaskError(error.message)
    } finally { setSavingTask(false) }
  }

  async function toggleTask(task) {
    setUpdatingTaskId(task.id)
    setTaskError('')
    setTaskMessage('')
    try {
      const response = await apiRequest(`/tasks/${task.id}`, { method: 'PATCH', body: { completed: !task.completed } })
      if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível atualizar a tarefa.'))
      const updated = await response.json()
      setTasks((current) => current.map((item) => item.id === task.id ? updated : item))
      await updateProgress()
    } catch (error) {
      if (error instanceof SessionExpiredError) navigate('/login', { replace: true })
      else setTaskError(error.message)
    } finally { setUpdatingTaskId(null) }
  }

  const progress = Math.max(0, Math.min(100, Number(goal?.progress) || 0))
  const completedCount = tasks.filter((task) => task.completed).length

  return <div className="min-h-screen pb-20"><DashboardHeader /><main className={`${pageWidth} pt-9`}><Link to="/metas" className="text-xs font-bold text-emerald-700 hover:text-emerald-900">← Voltar para minhas metas</Link>{loading ? <div className={`${glass} mt-8 grid min-h-52 place-items-center text-sm text-slate-500`} role="status">Carregando sua meta...</div> : loadError ? <div className={`${glass} mt-8 flex min-h-52 flex-col items-center justify-center gap-4 p-8 text-sm text-rose-700`} role="alert"><p>{loadError}</p><Link to="/metas" className={primaryButton}>Ver minhas metas</Link></div> : <><div className={`${glass} mt-8 overflow-hidden p-6 sm:p-10`}><div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" /><div className="relative flex items-center justify-between"><span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${goal.public ? 'bg-emerald-100/70 text-emerald-800' : 'bg-slate-100/80 text-slate-600'}`}>{goal.public ? '✦ Pública' : '◌ Privada'}</span><span className="text-3xl text-emerald-400">✳</span></div><h1 className="relative mt-5 text-3xl font-extrabold tracking-[-0.05em] text-emerald-950 sm:text-4xl">{goal.name}</h1><p className="relative mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-slate-600">{goal.description}</p><div className="relative mt-8 max-w-md"><div className="flex justify-between text-xs text-slate-500"><span>Seu progresso</span><strong className="text-emerald-700">{Math.round(progress)}%</strong></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-emerald-100/80"><span className="block h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-600" style={{ width: `${progress}%` }} /></div><small className="mt-2 block text-[11px] text-slate-400">{completedCount} de {tasks.length} {tasks.length === 1 ? 'tarefa concluída' : 'tarefas concluídas'}</small></div><div className="relative mt-7 max-w-md"><VisibilitySwitch checked={goal.public} onChange={changeVisibility} disabled={savingVisibility} description={goal.public ? 'Sua meta está visível para outras pessoas.' : 'Só você pode ver esta meta.'} />{visibilityMessage && <p className={`${visibilityMessage.type === 'error' ? formError : formSuccess} mt-3`} role="status">{visibilityMessage.text}</p>}</div></div>
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)]"><section className={`${glass} p-6 sm:p-8`} aria-labelledby="tasks-title"><div className="flex items-end justify-between gap-4 border-b border-white/80 pb-5"><div><span className={kicker}>PASSO A PASSO</span><h2 id="tasks-title" className="mt-2 text-xl font-extrabold text-emerald-950">Tarefas da meta</h2></div><span className="text-xs text-slate-400">{tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}</span></div>{tasks.length === 0 ? <div className="py-13 text-center"><span className="text-4xl text-emerald-300">◎</span><h3 className="mt-2 text-sm font-extrabold text-emerald-950">Ainda não há tarefas</h3><p className="mt-2 text-xs text-slate-500">Divida sua meta em passos menores e comece pelo primeiro.</p></div> : <div className="mt-5 space-y-3">{tasks.map((task) => <article className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/45 p-4 backdrop-blur-lg" key={task.id}><button type="button" className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border text-sm font-extrabold transition ${task.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-emerald-200 bg-white/75 text-transparent hover:border-emerald-500'}`} onClick={() => toggleTask(task)} disabled={updatingTaskId === task.id} aria-label={task.completed ? `Marcar ${task.name} como pendente` : `Concluir ${task.name}`} aria-pressed={task.completed}>{task.completed ? '✓' : ''}</button><div className="min-w-0 flex-1"><h3 className={`text-xs font-extrabold ${task.completed ? 'text-slate-400 line-through' : 'text-emerald-950'}`}>{task.name}</h3><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">{task.description}</p></div><span className={`hidden text-[10px] font-bold sm:inline ${task.completed ? 'text-emerald-700' : 'text-slate-400'}`}>{task.completed ? 'Concluída' : 'Pendente'}</span></article>)}</div>}</section><section className={`${glass} p-6 sm:p-8`} aria-labelledby="new-task-title"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100/75 text-2xl text-emerald-700">＋</span><span className={`${kicker} mt-5 block`}>PRÓXIMO PASSO</span><h2 id="new-task-title" className="mt-2 text-xl font-extrabold text-emerald-950">Adicionar tarefa</h2><p className="mt-2 text-xs text-slate-500">Pequenas ações levam você mais longe.</p><form onSubmit={createTask} className="mt-7 space-y-5"><div><label className={fieldLabel} htmlFor="task-name">Nome da tarefa</label><input className={field} id="task-name" value={taskName} onChange={(event) => setTaskName(event.target.value)} maxLength={150} required placeholder="Ex.: Correr 3 vezes na semana" /></div><div><label className={fieldLabel} htmlFor="task-description">Descrição</label><textarea className={`${field} resize-y`} id="task-description" value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} required rows={4} placeholder="Descreva este passo..." /></div>{taskError && <p className={formError} role="alert">{taskError}</p>}{taskMessage && <p className={formSuccess} role="status">{taskMessage}</p>}<button className={`${primaryButton} w-full`} type="submit" disabled={savingTask}>{savingTask ? 'Adicionando...' : 'Adicionar tarefa'} {!savingTask && <ArrowIcon />}</button></form></section></div></>}</main></div>
}
