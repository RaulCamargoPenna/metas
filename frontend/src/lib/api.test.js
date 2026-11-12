import { describe, expect, it } from 'vitest'
import { clearSession, fetchCollection, hasSession, login, registerUser, saveSession, SessionExpiredError, apiRequest } from './api'
import { json, mockFetch } from '../test/helpers'

describe('sessão e cliente da API', () => {
  it('mantém o login entre abas e remove a sessão ao sair', () => {
    saveSession({ access: 'access-1', refresh: 'refresh-1' })
    sessionStorage.clear()
    expect(hasSession()).toBe(true)
    expect(localStorage.getItem('metas_refresh_token')).toBe('refresh-1')

    clearSession()
    expect(hasSession()).toBe(false)
    expect(localStorage.getItem('metas_access_token')).toBeNull()
  })

  it('migra uma sessão antiga sem restaurá-la após o logout', () => {
    sessionStorage.setItem('metas_access_token', 'old-access')
    sessionStorage.setItem('metas_refresh_token', 'old-refresh')
    expect(hasSession()).toBe(true)
    expect(localStorage.getItem('metas_refresh_token')).toBe('old-refresh')
    expect(sessionStorage.getItem('metas_refresh_token')).toBeNull()

    clearSession()
    sessionStorage.setItem('metas_refresh_token', 'old-refresh')
    expect(hasSession()).toBe(false)
  })

  it('renova o acesso e repete uma requisição que retornou 401', async () => {
    saveSession({ access: 'expired', refresh: 'refresh-1' })
    const calls = []
    mockFetch({
      'GET /api/v1/user': (options) => {
        calls.push(options.headers.Authorization)
        return calls.length === 1 ? json({ detail: 'expired' }, 401) : json({ username: 'ana' })
      },
      'POST /api/v1/token/refresh': (options) => {
        expect(JSON.parse(options.body)).toEqual({ refresh: 'refresh-1' })
        return json({ access: 'access-2' })
      },
    })

    const response = await apiRequest('/user')
    expect(await response.json()).toEqual({ username: 'ana' })
    expect(calls).toEqual(['Bearer expired', 'Bearer access-2'])
    expect(localStorage.getItem('metas_access_token')).toBe('access-2')
  })

  it('limpa uma sessão cujo refresh foi recusado', async () => {
    saveSession({ access: 'expired', refresh: 'invalid' })
    mockFetch({
      'GET /api/v1/user': json({}, 401),
      'POST /api/v1/token/refresh': json({ detail: 'invalid' }, 401),
    })
    await expect(apiRequest('/user')).rejects.toBeInstanceOf(SessionExpiredError)
    expect(hasSession()).toBe(false)
  })

  it('percorre todas as páginas de uma lista', async () => {
    saveSession({ access: 'access', refresh: 'refresh' })
    mockFetch({
      'GET /api/v1/goals': json({ results: [{ id: 'one' }], next: 'http://localhost/api/v1/goals?page=2' }),
      'GET /api/v1/goals?page=2': json({ results: [{ id: 'two' }], next: null }),
    })
    expect(await fetchCollection('/goals')).toEqual([{ id: 'one' }, { id: 'two' }])
  })
})

describe('autenticação pública', () => {
  it('envia credenciais e salva tokens após login', async () => {
    const fetchMock = mockFetch({
      'POST /api/v1/token': (options) => {
        expect(JSON.parse(options.body)).toEqual({ username: 'ana', password: 'senha123' })
        return json({ access: 'access', refresh: 'refresh' })
      },
    })
    await login('ana', 'senha123')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(hasSession()).toBe(true)
  })

  it('envia os campos de cadastro e mostra erro de validação da API', async () => {
    const data = { username: 'ana', first_name: 'Ana', last_name: 'Silva', email: 'ana@example.com', password: 'senha123' }
    mockFetch({ 'POST /api/v1/register': (options) => {
      expect(JSON.parse(options.body)).toEqual(data)
      return json({ username: 'Esse usuário já existe.' }, 400)
    } })
    await expect(registerUser(data)).rejects.toThrow('Usuário: Esse usuário já existe.')
  })
})
