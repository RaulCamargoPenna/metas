import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AuthArtwork } from '../components/AuthArtwork'
import { ArrowIcon, Logo } from '../components/Navbar'
import { hasSession, login, registerUser } from '../lib/api'
import { field, fieldLabel, formError, glass, kicker, primaryButton } from '../lib/ui'

const initialForm = { first_name: '', last_name: '', username: '', email: '', password: '', confirm: '' }

export function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.password !== form.confirm) {
      setError('A confirmação de senha não corresponde à senha informada.')
      return
    }
    const username = form.username.trim()
    const password = form.password
    setSubmitting(true)
    setError('')
    try {
      await registerUser({ username, first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(), password })
    } catch (caughtError) {
      setError(caughtError.message)
      setSubmitting(false)
      return
    }
    try {
      await login(username, password)
      navigate('/perfil', { replace: true })
    } catch {
      navigate('/login', { replace: true, state: { registered: true } })
    } finally {
      setSubmitting(false)
    }
  }

  if (hasSession()) return <Navigate to="/perfil" replace />

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex min-h-screen flex-col items-center px-5 py-7 sm:px-10 lg:px-14 xl:px-22">
        <div className="flex w-full items-center justify-between gap-3"><Logo /><Link to="/" className="text-xs font-bold text-emerald-900/65 hover:text-emerald-900">← Voltar ao início</Link></div>
        <div className="mt-10 w-full max-w-md"><span className={kicker}>SEU PRIMEIRO PASSO</span><h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.06em] text-emerald-950 sm:text-5xl">Seu caminho<br />começa <em className="font-serif font-normal text-emerald-600">agora.</em></h1><p className="mt-3 text-sm leading-7 text-slate-600">Crie sua conta para organizar seus objetivos e compartilhar cada conquista no seu ritmo.</p></div>
        <div className={`${glass} mt-6 w-full max-w-md p-6 sm:p-8`}><h2 className="text-xl font-extrabold tracking-tight text-emerald-950">Crie sua conta</h2><p className="mt-1 text-xs text-slate-500">Poucos dados para começar uma grande jornada.</p><form className="mt-6 space-y-4" onSubmit={handleSubmit}><div className="grid gap-4 sm:grid-cols-2"><div><label className={fieldLabel} htmlFor="first_name">Nome</label><input className={field} id="first_name" name="first_name" value={form.first_name} onChange={updateField} autoComplete="given-name" maxLength={150} required placeholder="Seu nome" /></div><div><label className={fieldLabel} htmlFor="last_name">Sobrenome</label><input className={field} id="last_name" name="last_name" value={form.last_name} onChange={updateField} autoComplete="family-name" maxLength={150} required placeholder="Seu sobrenome" /></div></div><div><label className={fieldLabel} htmlFor="register-username">Nome de usuário</label><input className={field} id="register-username" name="username" value={form.username} onChange={updateField} autoComplete="username" maxLength={150} required placeholder="Como você quer ser chamado" /></div><div><label className={fieldLabel} htmlFor="register-email">E-mail</label><input className={field} id="register-email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" maxLength={254} required placeholder="voce@exemplo.com" /></div><div><label className={fieldLabel} htmlFor="register-password">Senha</label><div className="relative"><input className={`${field} pr-20`} id="register-password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField} autoComplete="new-password" minLength={8} maxLength={128} required placeholder="Pelo menos 8 caracteres" /><button type="button" className="absolute inset-y-0 right-3 text-[11px] font-bold text-emerald-700 hover:text-emerald-900" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div></div><div><label className={fieldLabel} htmlFor="register-confirm">Confirmar senha</label><input className={field} id="register-confirm" name="confirm" type={showPassword ? 'text' : 'password'} value={form.confirm} onChange={updateField} autoComplete="new-password" minLength={8} maxLength={128} required placeholder="Digite a senha novamente" /></div>{error && <p className={formError} role="alert">{error}</p>}<button className={`${primaryButton} w-full`} type="submit" disabled={submitting}>{submitting ? 'Criando sua conta...' : 'Criar minha conta'} {!submitting && <ArrowIcon />}</button></form><p className="mt-6 border-t border-white/70 pt-5 text-center text-xs text-slate-500">Já tem uma conta? <Link to="/login" className="font-bold text-emerald-700 hover:underline">Entrar</Link></p></div>
        <p className="mt-auto pt-8 text-[11px] text-slate-400">© {new Date().getFullYear()} metas. Um passo de cada vez.</p>
      </div>
      <AuthArtwork register />
    </main>
  )
}
