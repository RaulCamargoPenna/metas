import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { json, mockFetch, renderAt, signedIn } from './helpers'

const goal = { id: 'g1', name: 'Correr 10 km', description: 'Treinar com constância', public: false, progress: 0, created_at: '2026-11-12T12:00:00Z' }
const listedGoal = { id: 'g1', name: 'Correr 10 km', description: 'Treinar com constância', owner: 'ana', image: null, progress: 0, total_tasks: 2, total_likes: 0, already_liked: false, created_at: '2026-11-12T12:00:00Z' }
const firstTask = { id: 't1', goal: 'g1', name: 'Correr 3 km', description: 'Começar leve', completed: false, created_at: '2026-11-12T12:00:00Z' }

describe('minhas metas', () => {
  it('mostra só a primeira página e carrega a próxima quando solicitado', async () => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'GET /api/v1/goals': json({ count: 2, results: [listedGoal], next: 'http://localhost/api/v1/goals?page=2' }),
      'GET /api/v1/goals?page=2': json({ count: 2, results: [{ ...listedGoal, id: 'g2', name: 'Ler mais livros', progress: 50, total_tasks: 1 }], next: null }),
    })
    renderAt('/metas')
    expect(await screen.findByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ler mais livros' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(screen.getByText('2 tarefas')).toBeInTheDocument()
    expect(screen.queryByText('◌ Privada')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Correr 10 km/ })).toHaveAttribute('href', '/metas/g1')
    await browser.click(screen.getByRole('button', { name: 'Carregar mais metas' }))
    expect(await screen.findByRole('heading', { name: 'Ler mais livros' })).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('1 tarefa')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('button', { name: 'Carregar mais metas' })).not.toBeInTheDocument()
  })

  it('mostra a visibilidade quando public vier na listagem', async () => {
    signedIn()
    mockFetch({
      'GET /api/v1/goals': json({ count: 2, results: [
        { ...listedGoal, public: false },
        { ...listedGoal, id: 'g2', name: 'Ler mais livros', public: true },
      ], next: null }),
    })
    renderAt('/metas')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    expect(screen.getByText('◌ Privada')).toBeInTheDocument()
    expect(screen.getByText('✦ Pública')).toBeInTheDocument()
  })

  it('busca no servidor entre todas as metas e preserva o filtro nas páginas seguintes', async () => {
    signedIn()
    const browser = userEvent.setup()
    const otherGoal = { ...listedGoal, id: 'g2', name: 'Ler 20 livros', description: 'Leitura diária' }
    const fetchMock = mockFetch({
      'GET /api/v1/goals': json({ count: 2, results: [listedGoal], next: 'http://localhost/api/v1/goals?page=2' }),
      'GET /api/v1/goals?user=&description=&name=livr': json({ count: 2, results: [otherGoal], next: 'http://localhost/api/v1/goals?user=&description=&name=livr&page=2' }),
      'GET /api/v1/goals?user=&description=&name=livr&page=2': json({ count: 2, results: [{ ...otherGoal, id: 'g3', name: 'Ler mais livros' }], next: null }),
      'GET /api/v1/goals?user=ana&description=const&name=': json({ count: 1, results: [listedGoal], next: null }),
    })
    renderAt('/metas')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    await browser.type(screen.getByRole('searchbox', { name: 'Nome da meta' }), 'livr')
    expect(await screen.findByRole('heading', { name: 'Ler 20 livros' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Correr 10 km' })).not.toBeInTheDocument()
    await browser.click(screen.getByRole('button', { name: 'Carregar mais metas' }))
    expect(await screen.findByRole('heading', { name: 'Ler mais livros' })).toBeInTheDocument()
    act(() => {
      fireEvent.change(screen.getByRole('searchbox', { name: 'Usuário' }), { target: { value: 'ana' } })
      fireEvent.change(screen.getByRole('searchbox', { name: 'Descrição' }), { target: { value: 'const' } })
      fireEvent.change(screen.getByRole('searchbox', { name: 'Nome da meta' }), { target: { value: '' } })
    })
    expect(await screen.findByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([input]) => new URL(input, window.location.origin).search)).toContain('?user=&description=&name=livr&page=2')
    expect(fetchMock.mock.calls.map(([input]) => new URL(input, window.location.origin).search)).toContain('?user=ana&description=const&name=')
    act(() => {
      fireEvent.change(screen.getByRole('searchbox', { name: 'Usuário' }), { target: { value: '' } })
      fireEvent.change(screen.getByRole('searchbox', { name: 'Descrição' }), { target: { value: '' } })
    })
    await waitFor(() => expect(fetchMock.mock.calls.map(([input]) => new URL(input, window.location.origin).search).filter((search) => search === '')).toHaveLength(2))
  })

  it('carrega mais metas ao rolar até o fim da lista', async () => {
    signedIn()
    let onIntersection
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback) { onIntersection = callback }
      observe() {}
      disconnect() {}
    })
    const fetchMock = mockFetch({
      'GET /api/v1/goals': json({ count: 2, results: [listedGoal], next: 'http://localhost/api/v1/goals?page=2' }),
      'GET /api/v1/goals?page=2': json({ count: 2, results: [{ ...listedGoal, id: 'g2', name: 'Ler mais livros' }], next: null }),
    })
    renderAt('/metas')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(onIntersection).toBeUndefined()
    fireEvent.scroll(window)
    expect(onIntersection).toBeTypeOf('function')
    await act(async () => { onIntersection([{ isIntersecting: true }]) })
    expect(await screen.findByRole('heading', { name: 'Ler mais livros' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('preserva a primeira página e permite repetir uma página que falhou', async () => {
    signedIn()
    const browser = userEvent.setup()
    let attempts = 0
    mockFetch({
      'GET /api/v1/goals': json({ count: 2, results: [listedGoal], next: 'http://localhost/api/v1/goals?page=2' }),
      'GET /api/v1/goals?page=2': () => ++attempts === 1
        ? json({ detail: 'Falha temporária.' }, 503)
        : json({ count: 2, results: [{ ...listedGoal, id: 'g2', name: 'Ler mais livros' }], next: null }),
    })
    renderAt('/metas')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    await browser.click(screen.getByRole('button', { name: 'Carregar mais metas' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária.')
    expect(screen.getByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    await browser.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('heading', { name: 'Ler mais livros' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('oferece criar a primeira meta quando a lista está vazia', async () => {
    signedIn()
    mockFetch({ 'GET /api/v1/goals': json({ results: [], next: null }) })
    renderAt('/metas')
    expect(await screen.findByRole('heading', { name: 'O primeiro passo é seu.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Criar minha primeira meta/ })).toHaveAttribute('href', '/metas/nova')
  })

  it('cria uma meta pública e abre sua página de tarefas', async () => {
    signedIn()
    const browser = userEvent.setup()
    const created = { ...goal, name: 'Aprender React', description: 'Estudar componentes', public: true }
    mockFetch({
      'POST /api/v1/goals': (options) => {
        expect(JSON.parse(options.body)).toEqual({ name: 'Aprender React', description: 'Estudar componentes', public: true })
        return json(created, 201)
      },
      'GET /api/v1/goals/g1': json(created),
      'GET /api/v1/tasks?goal=g1': json({ results: [], next: null }),
    })
    renderAt('/metas/nova')
    await browser.type(screen.getByLabelText('Nome da meta'), 'Aprender React')
    await browser.type(screen.getByLabelText('Descrição'), 'Estudar componentes')
    await browser.click(screen.getByLabelText(/Compartilhar com a comunidade/))
    await browser.click(screen.getByRole('button', { name: 'Criar meta' }))
    expect(await screen.findByRole('heading', { name: 'Aprender React' })).toBeInTheDocument()
    expect(screen.getByText('Meta criada! Agora adicione os passos para chegar lá.')).toBeInTheDocument()
  })

  it('cria metas privadas por padrão e mostra falhas do servidor', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({ 'POST /api/v1/goals': (options) => {
      expect(JSON.parse(options.body).public).toBe(false)
      return json({ name: ['Nome inválido.'] }, 400)
    } })
    renderAt('/metas/nova')
    await browser.type(screen.getByLabelText('Nome da meta'), 'Teste')
    await browser.type(screen.getByLabelText('Descrição'), 'Uma descrição')
    await browser.click(screen.getByRole('button', { name: 'Criar meta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nome: Nome inválido.')
  })
})

describe('tarefas e visibilidade de uma meta', () => {
  it('pede confirmação antes de excluir a meta e volta para a lista após sucesso', async () => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'GET /api/v1/goals/g1': json(goal),
      'GET /api/v1/tasks?goal=g1': json({ results: [], next: null }),
      'DELETE /api/v1/goals/g1': new Response(null, { status: 204 }),
      'GET /api/v1/goals': json({ results: [], next: null }),
    })
    renderAt('/metas/g1')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    await browser.click(screen.getByRole('button', { name: 'Excluir meta' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('A meta “Correr 10 km” e suas tarefas serão removidas.')
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false)
    await browser.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await browser.click(screen.getByRole('button', { name: 'Excluir meta' }))
    await browser.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir meta' }))
    expect(await screen.findByRole('heading', { name: 'O primeiro passo é seu.' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(1)
  })

  it('mantém a meta aberta e mostra o erro quando a exclusão falha', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({
      'GET /api/v1/goals/g1': json(goal),
      'GET /api/v1/tasks?goal=g1': json({ results: [], next: null }),
      'DELETE /api/v1/goals/g1': json({ detail: 'Não é possível excluir esta meta.' }, 400),
    })
    renderAt('/metas/g1')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    await browser.click(screen.getByRole('button', { name: 'Excluir meta' }))
    const dialog = screen.getByRole('alertdialog')
    await browser.click(within(dialog).getByRole('button', { name: 'Excluir meta' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Não é possível excluir esta meta.')
    expect(screen.getByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
  })

  it('busca tarefas filtradas pela meta aberta', async () => {
    signedIn()
    mockFetch({
      'GET /api/v1/goals/g1': json(goal),
      'GET /api/v1/tasks?goal=g1': json({ results: [firstTask], next: null }),
    })
    renderAt('/metas/g1')
    expect(await screen.findByRole('heading', { name: 'Correr 3 km' })).toBeInTheDocument()
    expect(screen.queryByText('Tarefa de outra meta')).not.toBeInTheDocument()
  })

  it('cria uma tarefa com o ID da meta e atualiza o progresso', async () => {
    signedIn()
    const browser = userEvent.setup()
    let goalReads = 0
    mockFetch({
      'GET /api/v1/goals/g1': () => json({ ...goal, progress: goalReads++ ? 50 : 0 }),
      'GET /api/v1/tasks?goal=g1': json({ results: [firstTask], next: null }),
      'POST /api/v1/tasks': (options) => {
        expect(JSON.parse(options.body)).toEqual({ goal: 'g1', name: 'Correr 5 km', description: 'Aumentar a distância' })
        return json({ ...firstTask, id: 't2', name: 'Correr 5 km', description: 'Aumentar a distância' }, 201)
      },
    })
    renderAt('/metas/g1')
    await screen.findByRole('heading', { name: 'Correr 3 km' })
    await browser.type(screen.getByLabelText('Nome da tarefa'), 'Correr 5 km')
    await browser.type(screen.getByLabelText('Descrição'), 'Aumentar a distância')
    await browser.click(screen.getByRole('button', { name: 'Adicionar tarefa' }))
    expect(await screen.findByRole('heading', { name: 'Correr 5 km' })).toBeInTheDocument()
    expect(await screen.findByText('Tarefa adicionada à sua meta.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome da tarefa')).toHaveValue('')
  })

  it('mostra o erro de criação sem inserir uma tarefa rejeitada', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({
      'GET /api/v1/goals/g1': json(goal),
      'GET /api/v1/tasks?goal=g1': json({ results: [], next: null }),
      'POST /api/v1/tasks': json({ name: ['Nome inválido.'] }, 400),
    })
    renderAt('/metas/g1')
    await screen.findByRole('heading', { name: 'Ainda não há tarefas' })
    await browser.type(screen.getByLabelText('Nome da tarefa'), 'Teste')
    await browser.type(screen.getByLabelText('Descrição'), 'Descrição')
    await browser.click(screen.getByRole('button', { name: 'Adicionar tarefa' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nome: Nome inválido.')
    expect(screen.getByRole('heading', { name: 'Ainda não há tarefas' })).toBeInTheDocument()
  })

  it('conclui uma tarefa com PATCH e recarrega o progresso da meta', async () => {
    signedIn()
    const browser = userEvent.setup()
    let goalReads = 0
    mockFetch({
      'GET /api/v1/goals/g1': () => json({ ...goal, progress: goalReads++ ? 100 : 0 }),
      'GET /api/v1/tasks?goal=g1': json({ results: [firstTask], next: null }),
      'PATCH /api/v1/tasks/t1': (options) => {
        expect(JSON.parse(options.body)).toEqual({ completed: true })
        return json({ ...firstTask, completed: true })
      },
    })
    renderAt('/metas/g1')
    await browser.click(await screen.findByRole('button', { name: 'Concluir Correr 3 km' }))
    expect(await screen.findByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marcar Correr 3 km como pendente' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('altera a visibilidade por PATCH e reflete o retorno da API', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({
      'GET /api/v1/goals/g1': json(goal),
      'GET /api/v1/tasks?goal=g1': json({ results: [], next: null }),
      'PATCH /api/v1/goals/g1': (options) => {
        expect(JSON.parse(options.body)).toEqual({ public: true })
        return json({ ...goal, public: true })
      },
    })
    renderAt('/metas/g1')
    await browser.click(await screen.findByLabelText(/Compartilhar com a comunidade/))
    expect(await screen.findByText('Agora sua meta é pública.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Compartilhar com a comunidade/)).toBeChecked()
  })

  it('mantém a visibilidade anterior quando a API rejeita a alteração', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({
      'GET /api/v1/goals/g1': json(goal),
      'GET /api/v1/tasks?goal=g1': json({ results: [], next: null }),
      'PATCH /api/v1/goals/g1': json({ public: ['Alteração recusada.'] }, 400),
    })
    renderAt('/metas/g1')
    await browser.click(await screen.findByLabelText(/Compartilhar com a comunidade/))
    expect(await screen.findByText('Visibilidade: Alteração recusada.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Compartilhar com a comunidade/)).not.toBeChecked()
  })
})
