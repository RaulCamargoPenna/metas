import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { json, mockFetch, renderAt, signedIn } from './helpers'

const goal = { id: 'public-1', name: 'Correr 10 km', description: 'Treinar com a comunidade', user: 'ana', image: '/media/ana.jpg', public: true, progress: 72, created_at: '2026-11-13T12:00:00Z' }

describe('feed de metas públicas', () => {
  it('exige login antes de consultar o feed', async () => {
    const fetchMock = mockFetch({})
    renderAt('/feed')
    expect(await screen.findByRole('heading', { name: 'Entre na sua conta' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lista páginas do feed e mostra foto, autor e progresso', async () => {
    signedIn()
    mockFetch({
      'GET /api/v1/feed': json({ results: [goal], next: 'http://localhost/api/v1/feed?page=2' }),
      'GET /api/v1/feed?page=2': json({ results: [{ ...goal, id: 'public-2', name: 'Ler 20 livros', user: 'bruno', image: null, progress: 35 }], next: null }),
    })
    renderAt('/feed')
    expect(await screen.findByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ler 20 livros' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto de ana' })).toHaveAttribute('src', `${window.location.origin}/media/ana.jpg`)
    expect(screen.getByLabelText('Avatar de bruno')).toHaveTextContent('BR')
    expect(screen.getByText('72%')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Ver meta' })[0]).toHaveAttribute('href', '/feed/public-1')
  })

  it('filtra metas por nome ou autor sem nova requisição', async () => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({ 'GET /api/v1/feed': json({ results: [goal, { ...goal, id: 'public-2', name: 'Aprender violão', user: 'bruno' }], next: null }) })
    renderAt('/feed')
    await screen.findByRole('heading', { name: 'Aprender violão' })
    await browser.type(screen.getByRole('searchbox', { name: 'Buscar metas públicas' }), 'ana')
    expect(screen.getByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Aprender violão' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('mostra estado vazio e erro de carregamento', async () => {
    signedIn()
    mockFetch({ 'GET /api/v1/feed': json({ results: [], next: null }) })
    const view = renderAt('/feed')
    expect(await screen.findByRole('heading', { name: 'Ainda não há metas públicas.' })).toBeInTheDocument()
    view.unmount()

    mockFetch({ 'GET /api/v1/feed': json({ detail: 'Falha no feed.' }, 500) })
    renderAt('/feed')
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no feed.')
  })
})

describe('detalhe de meta pública', () => {
  it('mostra tarefas concluídas e pendentes vindas do detalhe público', async () => {
    signedIn()
    const fetchMock = mockFetch({ 'GET /api/v1/public/goal/public-1': json({
      ...goal,
      tasks: [
        { id: 't1', name: 'Primeiro treino', description: 'Correr 3 km', completed: true },
        { id: 't2', name: 'Segundo treino', description: 'Correr 5 km', completed: false },
      ],
    }) })
    renderAt('/feed/public-1')
    expect(await screen.findByRole('heading', { name: 'Primeiro treino' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Segundo treino' })).toBeInTheDocument()
    expect(screen.getByText('1 de 2 tarefas concluídas')).toBeInTheDocument()
    expect(screen.getByText('Correr 3 km')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('mostra os dados públicos, foto do autor e progresso', async () => {
    signedIn()
    mockFetch({ 'GET /api/v1/public/goal/public-1': json(goal) })
    renderAt('/feed/public-1')
    expect(await screen.findByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto de ana' })).toHaveAttribute('src', `${window.location.origin}/media/ana.jpg`)
    expect(screen.getByText('Treinar com a comunidade')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar para o feed/ })).toHaveAttribute('href', '/feed')
  })

  it('usa iniciais quando não há foto ou quando a imagem falha', async () => {
    signedIn()
    mockFetch({ 'GET /api/v1/public/goal/public-1': json(goal) })
    renderAt('/feed/public-1')
    fireEvent.error(await screen.findByRole('img', { name: 'Foto de ana' }))
    expect(screen.getByLabelText('Avatar de ana')).toHaveTextContent('AN')
  })

  it('mostra 404 para uma meta privada ou inexistente', async () => {
    signedIn()
    mockFetch({ 'GET /api/v1/public/goal/private': json({ detail: 'Not found.' }, 404) })
    renderAt('/feed/private')
    expect(await screen.findByRole('alert')).toHaveTextContent('Essa meta pública não foi encontrada.')
    expect(screen.getByRole('link', { name: /Ver o feed/ })).toHaveAttribute('href', '/feed')
  })
})
