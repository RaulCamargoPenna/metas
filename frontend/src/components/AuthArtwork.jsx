import { glass } from '../lib/ui'

export function AuthArtwork({ register = false }) {
  return (
    <div className="relative hidden min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#aed8bc] via-[#8dbfa2] to-[#5b9c82] px-10 lg:flex" aria-hidden="true">
      <div className="absolute -left-48 -top-44 h-[36rem] w-[36rem] rounded-full border border-white/25" />
      <div className="absolute -right-40 top-28 h-[36rem] w-[36rem] rounded-full border border-white/25" />
      <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-amber-100/75 blur-[90px]" />
      <div className="absolute -bottom-24 left-0 h-80 w-[110%] rotate-[-12deg] rounded-[50%] bg-emerald-700/25 blur-2xl" />
      <div className={`${glass} relative w-full max-w-md rotate-[-4deg] overflow-hidden p-8 text-emerald-950 lg:p-10`}>
        <span className="text-[10px] font-extrabold tracking-[0.2em] text-emerald-700">✦ PEQUENAS CONQUISTAS</span>
        <strong className="mt-5 block text-3xl leading-tight tracking-tight">{register ? <>Sua história começa<br />com um passo.</> : <>Você está mais perto<br />do que imagina.</>}</strong>
        <div className="mt-8 flex gap-2"><span className="h-1.5 flex-1 rounded-full bg-emerald-500" /><span className="h-1.5 flex-1 rounded-full bg-emerald-500" /><span className="h-1.5 flex-1 rounded-full bg-emerald-500" /><span className="h-1.5 flex-1 rounded-full bg-emerald-100" /><span className="h-1.5 flex-1 rounded-full bg-emerald-100" /></div>
      </div>
      <p className="relative mt-14 text-center font-serif text-2xl italic leading-snug text-white drop-shadow-md">{register ? <>“Toda conquista começa<br />com a decisão de tentar.”</> : <>“Todo grande sonho começa<br />com a coragem de tentar.”</>}<span className="mt-4 block font-sans text-[10px] not-italic uppercase tracking-[0.2em] text-white/80">— sua jornada começa aqui</span></p>
    </div>
  )
}
