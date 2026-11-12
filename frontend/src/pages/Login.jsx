import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { AuthArtwork } from '../components/AuthArtwork'
import { ArrowIcon, Logo } from '../components/Navbar'
import { hasSession, login } from '../lib/api'
import { field, fieldLabel, formError, formSuccess, glass, kicker, primaryButton } from '../lib/ui'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate('/perfil', { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof TypeError ? 'Não foi possível conectar ao servidor. Verifique se a API está disponível.' : caughtError.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (hasSession()) return <Navigate to="/perfil" replace />

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex min-h-screen flex-col items-center px-5 py-7 sm:px-10 lg:px-14 xl:px-22">
        <div className="flex w-full items-center justify-between gap-3"><Logo /><Link to="/" className="text-xs font-bold text-emerald-900/65 hover:text-emerald-900">← Voltar ao início</Link></div>
        <div className="mt-16 w-full max-w-md lg:mt-18"><span className={kicker}>BEM-VINDO DE VOLTA</span><h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.06em] text-emerald-950 sm:text-5xl">Seu próximo passo<br />começa <em className="font-serif font-normal text-emerald-600">aqui.</em></h1><p className="mt-4 text-sm leading-7 text-slate-600">Entre para acompanhar suas metas e celebrar cada conquista com quem torce por você.</p></div>
        <div className={`${glass} mt-8 w-full max-w-md p-6 sm:p-9`}><h2 className="text-xl font-extrabold tracking-tight text-emerald-950">Entre na sua conta</h2><p className="mt-1 text-xs text-slate-500">Que bom ter você por aqui outra vez.</p>{location.state?.registered && <p className={`${formSuccess} mt-5`} role="status">Conta criada com sucesso! Entre para continuar.</p>}<form className="mt-7 space-y-5" onSubmit={handleSubmit}><div><label className={fieldLabel} htmlFor="username">Nome de usuário</label><input className={field} id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Seu nome de usuário" required /></div><div><label className={fieldLabel} htmlFor="password">Senha</label><div className="relative"><input className={`${field} pr-20`} id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" required /><button type="button" className="absolute inset-y-0 right-3 text-[11px] font-bold text-emerald-700 hover:text-emerald-900" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div></div>{error && <p className={formError} role="alert">{error}</p>}<button type="submit" className={`${primaryButton} w-full`} disabled={submitting}>{submitting ? 'Entrando...' : 'Entrar na minha conta'} {!submitting && <ArrowIcon />}</button></form><p className="mt-7 border-t border-white/70 pt-5 text-center text-xs text-slate-500">Ainda não tem uma conta? <Link to="/cadastro" className="font-bold text-emerald-700 hover:underline">Crie sua conta</Link></p></div>
        <p className="mt-auto pt-8 text-[11px] text-slate-400">© {new Date().getFullYear()} metas. Um passo de cada vez.</p>
      </div>
      <AuthArtwork />
    </main>
  )
}
