import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { json, mockFetch, renderAt, signedIn } from './helpers'

const unread = { id: 'n1', description: 'Sua meta recebeu uma curtida.', read: false, created_at: '2026-11-17T12:00:00Z' }
const read = { id: 'n2', description: 'Alguém comentou na sua meta.', read: true, created_at: '2026-11-16T12:00:00Z' }

describe('notificações na navegação', () => {
  it('atualiza o indicador e a lista periodicamente sem clicar no sino', async () => {
    signedIn()
    const browser = userEvent.setup()
    const intervalSpy = vi.spyOn(globalThis, 'setInterval')
    const newer = { ...unread, id: 'n3', description: 'Sua meta recebeu um comentário novo.' }
    let current = [unread]
    mockFetch({
      'GET /api/v1/feed': json({ results: [], next: null }),
      'GET /api/v1/notifications?read=false': () => json({ results: current, next: null }),
      'GET /api/v1/notifications': () => json({ results: current, next: null }),
    })
    renderAt('/feed')
    expect(await screen.findByLabelText('1 não lida')).toBeInTheDocument()
    current = [unread, newer]
    const closedPoll = intervalSpy.mock.calls.find(([, delay]) => delay === 30_000)?.[0]
    expect(closedPoll).toBeTypeOf('function')
    await act(async () => { await closedPoll() })
    expect(screen.getByLabelText('2 não lidas')).toBeInTheDocument()

    await browser.click(screen.getByRole('button', { name: 'Notificações' }))
    expect(await screen.findByText(newer.description)).toBeInTheDocument()
    current = [...current, { ...unread, id: 'n4', description: 'Mais uma atualização.' }]
    const openPoll = intervalSpy.mock.calls.findLast(([, delay]) => delay === 30_000)?.[0]
    await act(async () => { await openPoll() })
    expect(screen.getByText('Mais uma atualização.')).toBeInTheDocument()
    expect(screen.getByLabelText('3 não lidas')).toBeInTheDocument()
  })

  it('lista páginas ao abrir o sino e marca uma notificação como lida', async () => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'GET /api/v1/feed': json({ results: [], next: null }),
      'GET /api/v1/notifications': json({ results: [unread], next: 'http://localhost/api/v1/notifications?page=2' }),
      'GET /api/v1/notifications?page=2': json({ results: [read], next: null }),
      'PATCH /api/v1/notifications/n1': (options) => {
        expect(JSON.parse(options.body)).toEqual({ read: true })
        return json({ ...unread, read: true })
      },
    })
    renderAt('/feed')
    await screen.findByRole('heading', { name: 'Ainda não há metas públicas.' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await browser.click(screen.getByRole('button', { name: 'Notificações' }))
    expect(await screen.findByText(unread.description)).toBeInTheDocument()
    expect(screen.getByText(read.description)).toBeInTheDocument()
    expect(screen.getByText('1 não lida')).toBeInTheDocument()
    await browser.click(screen.getByRole('button', { name: `Marcar como lida: ${unread.description}` }))
    expect(await screen.findByText('0 não lidas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: `Marcar como lida: ${unread.description}` })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('1 não lida')).not.toBeInTheDocument()
    await browser.click(screen.getByRole('button', { name: 'Fechar notificações' }))
    expect(screen.getByRole('button', { name: 'Notificações' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('mantém a notificação não lida quando o PATCH falha', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({
      'GET /api/v1/feed': json({ results: [], next: null }),
      'GET /api/v1/notifications': json({ results: [unread], next: null }),
      'PATCH /api/v1/notifications/n1': json({ detail: 'Falha ao atualizar.' }, 500),
    })
    renderAt('/feed')
    await browser.click(screen.getByRole('button', { name: 'Notificações' }))
    await browser.click(await screen.findByRole('button', { name: `Marcar como lida: ${unread.description}` }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao atualizar.')
    expect(screen.getByText('1 não lida')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Marcar como lida: ${unread.description}` })).toBeInTheDocument()
  })

  it('usa o filtro read=false e remove da lista filtrada a notificação lida', async () => {
    signedIn()
    const browser = userEvent.setup()
    const otherUnread = { ...unread, id: 'n3', description: 'Você recebeu um novo comentário.' }
    const fetchMock = mockFetch({
      'GET /api/v1/feed': json({ results: [], next: null }),
      'GET /api/v1/notifications': json({ results: [unread, read], next: null }),
      'GET /api/v1/notifications?read=false': () => json({ results: [unread], next: 'http://localhost/api/v1/notifications?read=false&page=2' }),
      'GET /api/v1/notifications?read=false&page=2': () => json({ results: [otherUnread], next: null }),
      'PATCH /api/v1/notifications/n1': json({ ...unread, read: true }),
    })
    renderAt('/feed')
    await browser.click(screen.getByRole('button', { name: 'Notificações' }))
    await screen.findByText(read.description)
    await browser.click(screen.getByRole('button', { name: 'Não lidas' }))
    expect(await screen.findByText(otherUnread.description)).toBeInTheDocument()
    expect(screen.queryByText(read.description)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Não lidas' })).toHaveAttribute('aria-pressed', 'true')
    await browser.click(screen.getByRole('button', { name: `Marcar como lida: ${unread.description}` }))
    expect(screen.queryByText(unread.description)).not.toBeInTheDocument()
    expect(screen.getByText(otherUnread.description)).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input]) => new URL(input, window.location.origin).search === '?read=false&page=2')).toBe(true)
  })

  it('mostra estado vazio depois da consulta inicial e ao abrir o sino', async () => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'GET /api/v1/feed': json({ results: [], next: null }),
      'GET /api/v1/notifications?read=false': json({ results: [], next: null }),
      'GET /api/v1/notifications': json({ results: [], next: null }),
    })
    renderAt('/feed')
    await screen.findByRole('heading', { name: 'Ainda não há metas públicas.' })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await browser.click(screen.getByRole('button', { name: 'Notificações' }))
    expect(await screen.findByText('Você ainda não tem notificações.')).toBeInTheDocument()
  })
})
