import { field, fieldLabel } from '../lib/ui'

export function GoalFilters({ filters, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label><span className={fieldLabel}>Usuário</span><input className={field} type="search" name="user" value={filters.user} onChange={onChange} placeholder="Ex.: ana" /></label>
      <label><span className={fieldLabel}>Descrição</span><input className={field} type="search" name="description" value={filters.description} onChange={onChange} placeholder="Ex.: treinar" /></label>
      <label><span className={fieldLabel}>Nome da meta</span><input className={field} type="search" name="name" value={filters.name} onChange={onChange} placeholder="Ex.: correr" /></label>
    </div>
  )
}
