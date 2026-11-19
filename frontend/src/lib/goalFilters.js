export const emptyGoalFilters = { user: '', description: '', name: '' }

export function buildGoalFilterQuery(filters) {
  const values = {
    user: filters.user.trim(),
    description: filters.description.trim(),
    name: filters.name.trim(),
  }
  return Object.values(values).some(Boolean) ? `?${new URLSearchParams(values)}` : ''
}
