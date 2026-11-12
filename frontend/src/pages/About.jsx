import { Link } from 'react-router'
import { ArrowIcon, Navbar } from '../components/Navbar'
import { glass, kicker, pageWidth, primaryButton } from '../lib/ui'

export function About() {
  return (
    <><Navbar /><main className={`${pageWidth} grid min-h-[calc(100vh-110px)] place-items-center py-20`}><div className={`${glass} max-w-2xl p-9 text-center sm:p-14`}><span className={kicker}>SOBRE O METAS</span><h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.055em] text-emerald-950 sm:text-5xl">Progresso é melhor em companhia.</h1><p className="mt-5 text-sm leading-7 text-slate-600">O Metas é um espaço para organizar objetivos, acompanhar pequenas conquistas e compartilhar a jornada com uma comunidade que torce por você. Crie metas e tarefas, escolha o que quer tornar público e conecte-se a pessoas com sonhos tão reais quanto os seus.</p><Link to="/cadastro" className={`${primaryButton} mt-8`}>Começar minha jornada <ArrowIcon /></Link></div></main></>
  )
}
