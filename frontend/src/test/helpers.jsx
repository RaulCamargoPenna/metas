import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { App } from '../App'

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

export function mockFetch(handlers) {
  const fetchMock = vi.fn(async (input, options = {}) => {
    const url = new URL(input, window.location.origin)
    const key = `${options.method || 'GET'} ${url.pathname}${url.search}`
    const handler = handlers[key]
    if (!handler) throw new Error(`Requisição inesperada: ${key}`)
    return typeof handler === 'function' ? handler(options, url) : handler
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function signedIn() {
  localStorage.setItem('metas_access_token', 'access-test')
  localStorage.setItem('metas_refresh_token', 'refresh-test')
}

export function renderAt(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}
