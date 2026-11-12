import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { json, mockFetch, renderAt, signedIn } from './helpers'

const goal = { id: 'g1', name: 'Correr 10 km', description: 'Treinar com constância', public: false, progress: 0, created_at: '2026-11-12T12:00:00Z' }
const firstTask = { id: 't1', goal: 'g1', name: 'Correr 3 km', description: 'Começar leve', completed: false, created_at: '2026-11-12T12:00:00Z' }

describe('minhas metas', () => {
  it('lista metas paginadas do usuário com visibilidade e progresso', async () => {
    signedIn()
    mockFetch({
      'GET /api/v1/goals': json({ results: [goal], next: 'http://localhost/api/v1/goals?page=2' }),
      'GET /api/v1/goals?page=2': json({ results: [{ ...goal, id: 'g2', name: 'Ler mais livros', public: true, progress: 50 }], next: null }),
    })
    renderAt('/metas')
    expect(await screen.findByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ler mais livros' })).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('✦ Pública')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Correr 10 km/ })).toHaveAttribute('href', '/metas/g1')
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
      'GET /api/v1/tasks': json({ results: [], next: null }),
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
  it('mostra somente as tarefas da meta aberta', async () => {
    signedIn()
    mockFetch({
      'GET /api/v1/goals/g1': json(goal),
      'GET /api/v1/tasks': json({ results: [firstTask, { ...firstTask, id: 't2', goal: 'g2', name: 'Tarefa de outra meta' }], next: null }),
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
      'GET /api/v1/tasks': json({ results: [firstTask], next: null }),
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
      'GET /api/v1/tasks': json({ results: [], next: null }),
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
      'GET /api/v1/tasks': json({ results: [firstTask], next: null }),
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
      'GET /api/v1/tasks': json({ results: [], next: null }),
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
      'GET /api/v1/tasks': json({ results: [], next: null }),
      'PATCH /api/v1/goals/g1': json({ public: ['Alteração recusada.'] }, 400),
    })
    renderAt('/metas/g1')
    await browser.click(await screen.findByLabelText(/Compartilhar com a comunidade/))
    expect(await screen.findByText('Visibilidade: Alteração recusada.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Compartilhar com a comunidade/)).not.toBeChecked()
  })
})
