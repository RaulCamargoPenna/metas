import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { DashboardHeader } from '../components/DashboardHeader'
import { GoalLikeButton } from '../components/GoalLikeButton'
import { ArrowIcon } from '../components/Navbar'
import { UserAvatar } from '../components/UserAvatar'
import { apiRequest, fetchCollection, hasSession, readApiError, SessionExpiredError } from '../lib/api'
import { field, fieldLabel, formError, glass, kicker, pageWidth, primaryButton } from '../lib/ui'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

export function PublicGoalDetail() {
  const { goalId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [goal, setGoal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState('')

  useEffect(() => {
    let active = true
    async function loadGoal() {
      try {
        const response = await apiRequest(`/public/goal/${goalId}`)
        if (!response.ok) throw new Error(response.status === 404 ? 'Essa meta pública não foi encontrada.' : await readApiError(response, 'Não foi possível carregar esta meta.'))
        const data = await response.json()
        if (active) setGoal(data)
      } catch (caughtError) {
        if (!active) return
        if (caughtError instanceof SessionExpiredError) navigate('/login', { replace: true })
        else setError(caughtError.message)
      } finally { if (active) setLoading(false) }
    }
    async function loadComments() {
      try {
        const data = await fetchCollection(`/public/comment?goal=${encodeURIComponent(goalId)}`)
        if (active) setComments(data)
      } catch (caughtError) {
        if (!active) return
        if (caughtError instanceof SessionExpiredError) navigate('/login', { replace: true })
        else setCommentsError(caughtError.message)
      } finally { if (active) setCommentsLoading(false) }
    }
    if (hasSession()) { loadGoal(); loadComments() }
    return () => { active = false }
  }, [goalId, navigate])

  useEffect(() => {
    if (!loading && !error && location.hash === '#comments') {
      document.getElementById('comments')?.scrollIntoView?.()
    }
  }, [loading, error, location.hash])

  if (!hasSession()) return <Navigate to="/login" replace />

  const progress = Math.max(0, Math.min(100, Number(goal?.progress) || 0))
  const tasks = goal?.tasks ?? []
  const completedCount = tasks.filter((task) => task.completed).length

  async function submitComment(event) {
    event.preventDefault()
    if (!commentText.trim() || submittingComment) return
    setSubmittingComment(true)
    setCommentError('')
    try {
      const response = await apiRequest('/public/comment', { method: 'POST', body: { goal: goalId, comment: commentText.trim() } })
      if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível publicar o comentário.'))
      const created = await response.json()
      setComments((current) => [...current, created])
      setCommentsError('')
      setCommentText('')
    } catch (caughtError) {
      if (caughtError instanceof SessionExpiredError) navigate('/login', { replace: true })
      else setCommentError(caughtError.message)
    } finally { setSubmittingComment(false) }
  }

  return (
    <div className="min-h-screen pb-20">
      <DashboardHeader />
      <main className={`${pageWidth} pt-9`}>
        <Link to="/feed" className="text-xs font-bold text-emerald-700 hover:text-emerald-900">← Voltar para o feed</Link>
        {loading ? (
          <div className={`${glass} mt-8 grid min-h-56 place-items-center text-sm text-slate-500`} role="status">Carregando meta pública...</div>
        ) : error ? (
          <div className={`${glass} mt-8 flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center text-sm text-rose-700`} role="alert"><p>{error}</p><Link to="/feed" className={primaryButton}>Ver o feed <ArrowIcon /></Link></div>
        ) : (
          <div className="mx-auto mt-8 max-w-4xl space-y-6">
            <article className={`${glass} overflow-hidden`}>
              <div className="relative overflow-hidden border-b border-white/75 bg-gradient-to-br from-emerald-100/70 via-white/55 to-violet-100/65 p-7 sm:p-10">
                <div className="pointer-events-none absolute -right-14 -top-18 h-72 w-72 rounded-full bg-emerald-200/45 blur-3xl" />
                <div className="relative flex flex-wrap items-center justify-between gap-4"><span className="rounded-full border border-emerald-200/70 bg-emerald-50/75 px-3 py-1.5 text-[10px] font-extrabold text-emerald-800">✦ META PÚBLICA</span><span className="text-3xl text-emerald-400" aria-hidden="true">✳</span></div>
                <h1 className="relative mt-6 text-3xl font-extrabold leading-tight tracking-[-0.05em] text-emerald-950 sm:text-5xl">{goal.name}</h1>
                <p className="relative mt-5 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-slate-600">{goal.description}</p>
              </div>
              <div className="p-7 sm:p-10">
                <div className="flex items-center gap-4"><UserAvatar username={goal.user} image={goal.image} className="h-16 w-16 text-lg" /><div><span className={kicker}>CRIADA POR</span><p className="mt-1 text-base font-extrabold text-emerald-950">{goal.user}</p><time dateTime={goal.created_at} className="mt-0.5 block text-xs text-slate-500">{dateFormatter.format(new Date(goal.created_at))}</time></div></div>
                <div className="mt-10 rounded-2xl border border-white/80 bg-white/45 p-5 backdrop-blur-xl sm:p-6"><div className="flex items-center justify-between text-sm"><span className="font-bold text-emerald-950">Progresso da meta</span><strong className="text-emerald-700">{Math.round(progress)}%</strong></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-emerald-100/80"><span className="block h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-600" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs text-slate-500">{completedCount} de {tasks.length} {tasks.length === 1 ? 'tarefa concluída' : 'tarefas concluídas'}</p></div>
              </div>
            </article>
            <section className={`${glass} p-6 sm:p-8`} aria-label="Curtidas da meta"><GoalLikeButton goalId={goal.id} totalLikes={goal.total_likes} alreadyLiked={goal.already_liked} /></section>
            <section className={`${glass} p-7 sm:p-10`} aria-labelledby="public-tasks-title">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/80 pb-5"><div><span className={kicker}>PASSO A PASSO</span><h2 id="public-tasks-title" className="mt-2 text-xl font-extrabold text-emerald-950">Tarefas da meta</h2></div><span className="text-xs text-slate-500">{tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}</span></div>
              {tasks.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Esta meta ainda não tem tarefas.</p> : <div className="mt-5 space-y-3">{tasks.map((task) => <article key={task.id} className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/45 p-4 backdrop-blur-lg"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border text-sm font-extrabold ${task.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-emerald-200 bg-white/75 text-transparent'}`} aria-label={task.completed ? 'Concluída' : 'Pendente'}>{task.completed ? '✓' : '○'}</span><div className="min-w-0 flex-1"><h3 className={`text-sm font-extrabold ${task.completed ? 'text-slate-400 line-through' : 'text-emerald-950'}`}>{task.name}</h3>{task.description && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">{task.description}</p>}</div><span className={`hidden text-[10px] font-bold sm:inline ${task.completed ? 'text-emerald-700' : 'text-slate-400'}`}>{task.completed ? 'Concluída' : 'Pendente'}</span></article>)}</div>}
            </section>
            <section id="comments" className={`${glass} scroll-mt-8 p-7 sm:p-10`} aria-labelledby="comments-title">
              <span className={kicker}>CONVERSA</span>
              <h2 id="comments-title" className="mt-2 text-xl font-extrabold text-emerald-950">Comentários</h2>
              {commentsLoading ? <p className="mt-6 text-sm text-slate-500" role="status">Carregando comentários...</p> : commentsError ? <p className={`${formError} mt-6`} role="alert">{commentsError}</p> : comments.length === 0 ? <p className="mt-6 text-sm text-slate-500">Seja a primeira pessoa a comentar.</p> : <div className="mt-6 space-y-3">{comments.map((comment) => <article key={comment.id} className="rounded-2xl border border-white/80 bg-white/45 p-4 backdrop-blur-lg"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-emerald-950">{comment.user}</strong>{comment.created_at && <time dateTime={comment.created_at} className="text-xs text-slate-500">{dateFormatter.format(new Date(comment.created_at))}</time>}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.comment}</p></article>)}</div>}
              <form onSubmit={submitComment} className="mt-8 border-t border-white/80 pt-6"><label htmlFor="new-comment" className={fieldLabel}>Deixe seu comentário</label><textarea id="new-comment" className={`${field} resize-y`} rows={3} maxLength={250} required value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Compartilhe uma palavra de incentivo..." /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">{commentText.length}/250 caracteres</span><button type="submit" className={primaryButton} disabled={submittingComment || !commentText.trim()}>{submittingComment ? 'Publicando...' : 'Publicar comentário'}</button></div>{commentError && <p className={`${formError} mt-4`} role="alert">{commentError}</p>}</form>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
