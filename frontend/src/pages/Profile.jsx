import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { ArrowIcon, Logo } from '../components/Navbar'
import { NotificationBell } from '../components/NotificationBell'
import { apiRequest, clearSession, hasSession, readApiError, SessionExpiredError } from '../lib/api'
import { field, fieldLabel, formError, formSuccess, glass, kicker, pageWidth, primaryButton } from '../lib/ui'

const emptyProfile = { username: '', first_name: '', last_name: '', email: '', bio: '', image: null }

function Field({ id, label, value, onChange, type = 'text', autoComplete, required = false, placeholder, maxLength }) {
  return <div><label className={fieldLabel} htmlFor={id}>{label}</label><input className={field} id={id} name={id} type={type} value={value} onChange={onChange} autoComplete={autoComplete} required={required} placeholder={placeholder} maxLength={maxLength} /></div>
}

function Message({ message }) {
  return message && <p className={`${message.type === 'error' ? formError : formSuccess} mt-5`} role="status">{message.text}</p>
}

export function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(emptyProfile)
  const [savedProfile, setSavedProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState(null)
  const [password, setPassword] = useState({ old_password: '', new_password: '', confirm: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState(null)

  useEffect(() => {
    let active = true
    async function loadProfile() {
      try {
        const response = await apiRequest('/user')
        if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível carregar seu perfil.'))
        const data = await response.json()
        if (active) { setProfile({ ...emptyProfile, ...data }); setSavedProfile(data) }
      } catch (error) {
        if (!active) return
        if (error instanceof SessionExpiredError) navigate('/login', { replace: true })
        else setLoadError(error.message)
      } finally { if (active) setLoading(false) }
    }
    if (hasSession()) loadProfile()
    return () => { active = false }
  }, [navigate])

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])

  if (!hasSession()) return <Navigate to="/login" replace />

  function updateField(event) {
    const { name, value } = event.target
    setProfile((current) => ({ ...current, [name]: value }))
    setProfileMessage(null)
  }

  function selectImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setProfileMessage({ type: 'error', text: 'Escolha um arquivo de imagem.' }); event.target.value = ''; return }
    if (file.size > 5 * 1024 * 1024) { setProfileMessage({ type: 'error', text: 'A imagem deve ter no máximo 5 MB.' }); event.target.value = ''; return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL?.(file) || null)
    setRemoveImage(false)
    setProfileMessage(null)
  }

  async function saveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setProfileMessage(null)
    const fields = { username: profile.username.trim(), first_name: profile.first_name.trim(), last_name: profile.last_name.trim(), email: profile.email.trim(), bio: profile.bio }
    let body = removeImage ? { ...fields, image: null } : fields
    if (imageFile) { body = new FormData(); Object.entries(fields).forEach(([key, value]) => body.append(key, value)); body.append('image', imageFile) }
    try {
      const response = await apiRequest('/user', { method: 'PATCH', body })
      if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível salvar suas informações.'))
      const data = await response.json()
      setProfile({ ...emptyProfile, ...data })
      setSavedProfile(data)
      setImageFile(null)
      setImagePreview(null)
      setRemoveImage(false)
      setProfileMessage({ type: 'success', text: 'Informações atualizadas com sucesso.' })
    } catch (error) {
      if (error instanceof SessionExpiredError) navigate('/login', { replace: true })
      else setProfileMessage({ type: 'error', text: error.message })
    } finally { setSaving(false) }
  }

  async function changePassword(event) {
    event.preventDefault()
    setPasswordMessage(null)
    if (password.new_password !== password.confirm) { setPasswordMessage({ type: 'error', text: 'A confirmação não corresponde à nova senha.' }); return }
    setChangingPassword(true)
    try {
      const response = await apiRequest('/change/password', { method: 'POST', body: { old_password: password.old_password, new_password: password.new_password } })
      if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível alterar sua senha.'))
      setPassword({ old_password: '', new_password: '', confirm: '' })
      setPasswordMessage({ type: 'success', text: 'Senha alterada com sucesso.' })
    } catch (error) {
      if (error instanceof SessionExpiredError) navigate('/login', { replace: true })
      else setPasswordMessage({ type: 'error', text: error.message })
    } finally { setChangingPassword(false) }
  }

  function signOut() { clearSession(); navigate('/login', { replace: true }) }

  const displayName = [savedProfile?.first_name, savedProfile?.last_name].filter(Boolean).join(' ') || savedProfile?.username || 'Seu perfil'
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  const image = !removeImage && (imagePreview || savedProfile?.image)

  return (
    <div className="min-h-screen pb-20">
      <header className={`${pageWidth} relative z-50 flex min-h-24 items-center justify-between gap-4 border-b border-emerald-900/10`}><Logo /><div className="flex flex-wrap items-center justify-end gap-3 text-xs font-bold text-emerald-950/65 sm:gap-6"><Link to="/feed" className="hover:text-emerald-800">Feed</Link><Link to="/metas" className="hover:text-emerald-800">Minhas metas</Link><Link to="/" className="hover:text-emerald-800">Início</Link><NotificationBell /><button type="button" onClick={signOut} className="hover:text-emerald-800">Sair da conta</button></div></header>
      <main className={`${pageWidth} pt-12`}><div className="mb-9"><span className={kicker}>MINHA CONTA</span><h1 className="mt-3 text-4xl font-extrabold tracking-[-0.06em] text-emerald-950 sm:text-5xl">Seu espaço, <em className="font-serif font-normal text-emerald-600">sua história.</em></h1><p className="mt-3 text-sm text-slate-500">Cuide das suas informações para seguir construindo a sua jornada.</p></div>
        {loading ? <div className={`${glass} grid min-h-52 place-items-center text-sm text-slate-500`} role="status">Carregando seu perfil...</div> : loadError ? <div className={`${glass} flex min-h-52 flex-col items-center justify-center gap-4 p-8 text-sm text-rose-700`} role="alert"><p>{loadError}</p><button type="button" className={primaryButton} onClick={() => window.location.reload()}>Tentar novamente</button></div> : (
          <div className="grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
            <aside className={`${glass} hidden overflow-hidden text-center lg:block`}><div className="h-28 bg-gradient-to-br from-emerald-200/70 via-cyan-100/70 to-violet-200/70" /><div className="relative mx-auto -mt-10 grid h-20 w-20 place-items-center overflow-hidden rounded-3xl border-4 border-white bg-emerald-100 text-2xl font-extrabold text-emerald-800 shadow-lg">{image ? <img src={image} alt="Sua foto de perfil" className="h-full w-full object-cover" /> : initials || 'M'}</div><h2 className="mt-4 text-lg font-extrabold text-emerald-950">{displayName}</h2><p className="mt-1 text-xs text-slate-500">@{savedProfile?.username}</p><div className="mx-6 mt-7 border-t border-white/80 py-7 text-left"><strong className="text-xs text-emerald-900">✦ Seu perfil é o começo</strong><p className="mt-2 text-xs leading-5 text-slate-500">Mostre quem você é para quem vai acompanhar suas conquistas.</p></div></aside>
            <div className="space-y-6"><section className={`${glass} p-6 sm:p-9`} aria-labelledby="profile-info-heading"><div className="flex items-center gap-4 border-b border-white/80 pb-6"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100/75 text-2xl text-emerald-700">◎</span><div><h2 id="profile-info-heading" className="text-lg font-extrabold text-emerald-950">Informações do perfil</h2><p className="mt-1 text-xs text-slate-500">Atualize os dados que identificam você na plataforma.</p></div></div><form onSubmit={saveProfile}><div className="flex items-center gap-4 py-6"><div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-100 text-xl font-extrabold text-emerald-800">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : initials || 'M'}</div><div><strong className="text-xs text-emerald-950">Foto do perfil</strong><p className="mt-1 text-[11px] text-slate-500">JPG, PNG ou outra imagem de até 5 MB.</p><div className="mt-2 flex flex-wrap gap-3 text-xs font-bold"><label htmlFor="profile-image" className="inline-flex cursor-pointer items-center rounded-xl border border-emerald-200/80 bg-white/70 px-3 py-2 text-emerald-800 shadow-sm transition hover:bg-white focus-within:ring-2 focus-within:ring-emerald-300">Escolher imagem</label><input className="sr-only" id="profile-image" type="file" accept="image/*" onChange={selectImage} />{(image || imageFile) && <button type="button" className="text-rose-600 hover:underline" onClick={() => { setImageFile(null); setImagePreview(null); setRemoveImage(true); setProfileMessage(null) }}>Remover foto</button>}</div>{imageFile && <small className="mt-1 block text-slate-500">Selecionada: {imageFile.name}</small>}{removeImage && <small className="mt-1 block text-slate-500">A foto será removida ao salvar.</small>}</div></div><div className="grid gap-5 sm:grid-cols-2"><Field id="first_name" label="Nome" value={profile.first_name} onChange={updateField} autoComplete="given-name" placeholder="Seu nome" maxLength={150} /><Field id="last_name" label="Sobrenome" value={profile.last_name} onChange={updateField} autoComplete="family-name" placeholder="Seu sobrenome" maxLength={150} /><Field id="username" label="Nome de usuário" value={profile.username} onChange={updateField} autoComplete="username" required placeholder="Seu usuário" maxLength={150} /><Field id="email" label="E-mail" type="email" value={profile.email} onChange={updateField} autoComplete="email" placeholder="voce@exemplo.com" maxLength={254} /></div><div className="mt-5"><label className={fieldLabel} htmlFor="bio">Bio</label><textarea className={`${field} min-h-28 resize-y`} id="bio" name="bio" value={profile.bio || ''} onChange={updateField} rows="4" placeholder="Conte um pouco sobre você e o que te move..." /><small className="mt-1 block text-right text-[10px] text-slate-400">{(profile.bio || '').length} caracteres</small></div><Message message={profileMessage} /><div className="mt-6 flex justify-end border-t border-white/80 pt-5"><button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'} {!saving && <ArrowIcon />}</button></div></form></section>
              <section className={`${glass} p-6 sm:p-9`} aria-labelledby="password-heading"><div className="flex items-center gap-4 border-b border-white/80 pb-6"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100/75 text-xl text-violet-700">✳</span><div><h2 id="password-heading" className="text-lg font-extrabold text-emerald-950">Alterar senha</h2><p className="mt-1 text-xs text-slate-500">Escolha uma senha forte para proteger sua conta.</p></div></div><form onSubmit={changePassword} className="space-y-5 pt-6"><div className="sm:max-w-[48%]"><Field id="old_password" label="Senha atual" type="password" value={password.old_password} onChange={(event) => setPassword((current) => ({ ...current, old_password: event.target.value }))} autoComplete="current-password" required placeholder="Digite sua senha atual" /></div><div className="grid gap-5 sm:grid-cols-2"><Field id="new_password" label="Nova senha" type="password" value={password.new_password} onChange={(event) => setPassword((current) => ({ ...current, new_password: event.target.value }))} autoComplete="new-password" required placeholder="Crie uma nova senha" /><Field id="confirm" label="Confirmar nova senha" type="password" value={password.confirm} onChange={(event) => setPassword((current) => ({ ...current, confirm: event.target.value }))} autoComplete="new-password" required placeholder="Repita a nova senha" /></div><Message message={passwordMessage} /><div className="flex justify-end border-t border-white/80 pt-5"><button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={changingPassword}>{changingPassword ? 'Alterando...' : 'Atualizar senha'} {!changingPassword && <ArrowIcon />}</button></div></form></section></div>
          </div>
        )}
      </main>
    </div>
  )
}
