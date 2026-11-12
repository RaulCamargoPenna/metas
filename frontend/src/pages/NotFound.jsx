import { Link } from 'react-router'
import { ArrowIcon, Navbar } from '../components/Navbar'
import { glass, kicker, pageWidth, primaryButton } from '../lib/ui'

export function NotFound() {
  return (
    <><Navbar /><main className={`${pageWidth} grid min-h-[calc(100vh-110px)] place-items-center py-20`}><div className={`${glass} max-w-xl p-9 text-center sm:p-14`}><span className={kicker}>ERRO 404</span><h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.055em] text-emerald-950 sm:text-5xl">Esse caminho não existe.</h1><p className="mt-5 text-sm leading-7 text-slate-600">Vamos voltar para o começo? Suas próximas conquistas esperam por você.</p><Link to="/" className={`${primaryButton} mt-8`}>Voltar ao início <ArrowIcon /></Link></div></main></>
  )
}
