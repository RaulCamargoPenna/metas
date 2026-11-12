import { glass } from '../lib/ui'
import { Tasks } from './Tasks'

export function Meta() {
  return <div className={`${glass} mx-auto max-w-xl p-6`}><h5 className="text-2xl font-extrabold tracking-tight text-emerald-950">Estudar React</h5><p className="mt-2 text-sm leading-6 text-slate-600">Entender melhor sobre componentes, hooks e demais ferramentas que o React oferece criando um app de metas.</p><p className="mt-5 text-xs font-bold text-emerald-700">Ver tarefas ↓</p><Tasks /></div>
}
