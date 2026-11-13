const apiBase = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
const accessKey = 'metas_access_token'
const refreshKey = 'metas_refresh_token'
const migrationKey = 'metas_storage_migrated'

function migrateSession() {
  const oldRefresh = sessionStorage.getItem(refreshKey)
  if (oldRefresh && !localStorage.getItem(migrationKey) && !localStorage.getItem(refreshKey)) {
    const oldAccess = sessionStorage.getItem(accessKey)
    localStorage.setItem(refreshKey, oldRefresh)
    if (oldAccess) localStorage.setItem(accessKey, oldAccess)
    localStorage.setItem(migrationKey, '1')
  }
  sessionStorage.removeItem(accessKey)
  sessionStorage.removeItem(refreshKey)
}

export function hasSession() {
  migrateSession()
  return Boolean(localStorage.getItem(refreshKey))
}

export function saveSession(tokens) {
  localStorage.setItem(accessKey, tokens.access)
  localStorage.setItem(refreshKey, tokens.refresh)
  localStorage.setItem(migrationKey, '1')
  sessionStorage.removeItem(accessKey)
  sessionStorage.removeItem(refreshKey)
}

export function clearSession() {
  localStorage.removeItem(accessKey)
  localStorage.removeItem(refreshKey)
  localStorage.setItem(migrationKey, '1')
  sessionStorage.removeItem(accessKey)
  sessionStorage.removeItem(refreshKey)
}

export class SessionExpiredError extends Error {
  constructor() {
    super('Sua sessão expirou. Entre novamente para continuar.')
  }
}

async function refreshAccessToken() {
  migrateSession()
  const refresh = localStorage.getItem(refreshKey)
  if (!refresh) throw new SessionExpiredError()

  let response
  try {
    response = await fetch(`${apiBase}/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.')
  }

  if (!response.ok) {
    clearSession()
    throw new SessionExpiredError()
  }

  const tokens = await response.json()
  if (!tokens.access) {
    clearSession()
    throw new SessionExpiredError()
  }
  localStorage.setItem(accessKey, tokens.access)
  if (tokens.refresh) localStorage.setItem(refreshKey, tokens.refresh)
  return tokens.access
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  migrateSession()
  let access = localStorage.getItem(accessKey)
  if (!access) access = await refreshAccessToken()

  const send = (token) => fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
  })

  let response
  try {
    response = await send(access)
    if (response.status === 401) response = await send(await refreshAccessToken())
  } catch (error) {
    if (error instanceof SessionExpiredError || !(error instanceof TypeError)) throw error
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.', { cause: error })
  }

  if (response.status === 401) {
    clearSession()
    throw new SessionExpiredError()
  }
  return response
}

export async function readApiError(response, fallback) {
  try {
    const data = await response.json()
    if (typeof data.detail === 'string') return data.detail
    const field = Object.entries(data).find(([, value]) => value)
    if (field) {
      const [name, value] = field
      const labels = { username: 'Usuário', first_name: 'Nome', last_name: 'Sobrenome', email: 'E-mail', image: 'Foto', bio: 'Bio', password: 'Senha', old_password: 'Senha atual', new_password: 'Nova senha', name: 'Nome', description: 'Descrição', goal: 'Meta', public: 'Visibilidade' }
      const message = Array.isArray(value) ? value.join(' ') : String(value)
      return `${labels[name] || name}: ${message}`
    }
  } catch {
    // A API pode retornar uma resposta vazia ou não JSON.
  }
  return fallback
}

export async function fetchCollection(path) {
  const items = []
  const queryStart = path.indexOf('?')
  const basePath = queryStart === -1 ? path : path.slice(0, queryStart)
  let query = queryStart === -1 ? '' : path.slice(queryStart)

  do {
    const response = await apiRequest(`${basePath}${query}`)
    if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível carregar os dados.'))
    const data = await response.json()
    if (Array.isArray(data)) return data
    if (!Array.isArray(data.results)) throw new Error('A resposta do servidor está incompleta.')
    items.push(...data.results)
    query = data.next ? new URL(data.next, window.location.origin).search : ''
  } while (query)

  return items
}

export async function login(username, password) {
  const response = await fetch(`${apiBase}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) throw new Error('Usuário ou senha incorretos. Tente novamente.')
    throw new Error('Não foi possível entrar agora. Tente novamente em instantes.')
  }
  const tokens = await response.json()
  if (!tokens.access || !tokens.refresh) throw new Error('A resposta do servidor está incompleta. Tente novamente.')
  saveSession(tokens)
}

export async function registerUser(data) {
  let response
  try {
    response = await fetch(`${apiBase}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch (error) {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.', { cause: error })
  }

  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível criar sua conta.'))
  return response.json()
}
