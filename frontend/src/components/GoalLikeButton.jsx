import { useState } from 'react'
import { useNavigate } from 'react-router'
import { apiRequest, readApiError, SessionExpiredError } from '../lib/api'

function isDuplicateLike(data) {
  return /unique|already|exist|duplic|já|integrity/i.test(JSON.stringify(data))
}

export function GoalLikeButton({ goalId, totalLikes = 0, alreadyLiked = false }) {
  const navigate = useNavigate()
  const [count, setCount] = useState(Number(totalLikes) || 0)
  const [liked, setLiked] = useState(Boolean(alreadyLiked))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function removeLike() {
    let deleteResponse
    let deleteFailure
    try {
      deleteResponse = await apiRequest(`/goals/${goalId}/like`, { method: 'DELETE' })
    } catch (caughtError) {
      deleteFailure = caughtError
    }

    let currentLike
    try {
      const response = await apiRequest(`/public/goal/${goalId}`)
      if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível conferir a curtida.'))
      currentLike = await response.json()
    } catch (caughtError) {
      if (!deleteResponse?.ok) throw deleteFailure ?? caughtError
      setLiked(false)
      setCount((current) => Math.max(0, current - 1))
      return
    }

    setLiked(Boolean(currentLike.already_liked))
    setCount(Math.max(0, Number(currentLike.total_likes) || 0))
    if (!currentLike.already_liked) return
    if (deleteFailure) throw deleteFailure
    if (!deleteResponse.ok) throw new Error(await readApiError(deleteResponse, 'Não foi possível remover a curtida.'))
    throw new Error('A curtida ainda consta na meta. Tente novamente.')
  }

  async function toggleLike() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (liked) {
        await removeLike()
        return
      }
      const response = await apiRequest(`/goals/${goalId}/like`, { method: 'POST' })
      if (!response.ok) {
        if (response.status === 400) {
          const data = await response.json()
          if (isDuplicateLike(data)) {
            setLiked(true)
            return
          }
          throw new Error(typeof data.detail === 'string' ? data.detail : 'Não foi possível curtir a meta.')
        }
        throw new Error(await readApiError(response, 'Não foi possível curtir a meta.'))
      }
      setLiked(true)
      setCount((current) => current + 1)
    } catch (caughtError) {
      if (caughtError instanceof SessionExpiredError) navigate('/login', { replace: true })
      else setError(caughtError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" aria-label={liked ? 'Remover curtida' : 'Curtir meta'} aria-pressed={liked} disabled={busy} onClick={toggleLike} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold backdrop-blur-lg transition disabled:cursor-wait disabled:opacity-60 ${liked ? 'border-rose-200/80 bg-rose-50/75 text-rose-700 hover:bg-rose-100/80' : 'border-white/80 bg-white/55 text-emerald-800 hover:bg-white/85'}`}><span aria-hidden="true">{liked ? '♥' : '♡'}</span>{liked ? 'Curtido' : 'Curtir'}</button>
      <span className="text-xs font-semibold text-slate-600" aria-label={`${count} ${count === 1 ? 'curtida' : 'curtidas'}`}>{count} {count === 1 ? 'curtida' : 'curtidas'}</span>
      {error && <p className="w-full text-xs text-rose-700" role="alert">{error}</p>}
    </div>
  )
}
