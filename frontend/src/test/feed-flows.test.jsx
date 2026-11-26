import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { json, mockFetch, renderAt, signedIn } from './helpers'

const goal = { id: 'public-1', name: 'Correr 10 km', description: 'Treinar com a comunidade', owner: 'ana', image: '/media/ana.jpg', public: true, progress: 72, total_tasks: 2, total_likes: 3, already_liked: false, created_at: '2026-11-13T12:00:00Z' }

describe('feed de metas públicas', () => {
  it('exige login antes de consultar o feed', async () => {
    const fetchMock = mockFetch({})
    renderAt('/feed')
    expect(await screen.findByRole('heading', { name: 'Entre na sua conta' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('carrega a primeira página e busca a próxima somente ao chegar ao fim', async () => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'GET /api/v1/feed': json({ results: [goal], next: 'http://localhost/api/v1/feed?page=2' }),
      'GET /api/v1/feed?page=2': json({ results: [goal, { ...goal, id: 'public-2', name: 'Ler 20 livros', owner: 'bruno', image: null, progress: 35, total_tasks: 1 }], next: null }),
    })
    renderAt('/feed')
    expect(await screen.findByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ler 20 livros' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(screen.getByRole('img', { name: 'Foto de ana' })).toHaveAttribute('src', `${window.location.origin}/media/ana.jpg`)
    expect(screen.getByText('72%')).toBeInTheDocument()
    expect(screen.getByText('2 tarefas')).toBeInTheDocument()
    await browser.click(screen.getByRole('button', { name: 'Carregar mais metas' }))
    expect(await screen.findByRole('heading', { name: 'Ler 20 livros' })).toBeInTheDocument()
    expect(screen.getByLabelText('Avatar de bruno')).toHaveTextContent('BR')
    expect(screen.getByText('1 tarefa')).toBeInTheDocument()
    expect(screen.getAllByLabelText('3 curtidas')).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Ver meta' })[0]).toHaveAttribute('href', '/feed/public-1')
    expect(screen.getAllByRole('link', { name: 'Comentar' })[0]).toHaveAttribute('href', '/feed/public-1#comments')
    expect(screen.getAllByRole('link', { name: 'Ver meta' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Carregar mais metas' })).not.toBeInTheDocument()
  })

  it('carrega a próxima página automaticamente quando o fim da lista aparece', async () => {
    signedIn()
    let onIntersection
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback) { onIntersection = callback }
      observe() {}
      disconnect() {}
    })
    const fetchMock = mockFetch({
      'GET /api/v1/feed': json({ results: [goal], next: 'http://localhost/api/v1/feed?page=2' }),
      'GET /api/v1/feed?page=2': json({ results: [{ ...goal, id: 'public-2', name: 'Ler 20 livros' }], next: null }),
    })
    renderAt('/feed')
    expect(await screen.findByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(onIntersection).toBeUndefined()
    fireEvent.scroll(window)
    expect(onIntersection).toBeTypeOf('function')
    await act(async () => { onIntersection([{ isIntersecting: true }]) })
    expect(await screen.findByRole('heading', { name: 'Ler 20 livros' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.getAllByRole('link', { name: 'Ver meta' })).toHaveLength(2)
  })

  it('mantém as metas carregadas e permite tentar de novo se a próxima página falhar', async () => {
    signedIn()
    const browser = userEvent.setup()
    let attempts = 0
    mockFetch({
      'GET /api/v1/feed': json({ results: [goal], next: 'http://localhost/api/v1/feed?page=2' }),
      'GET /api/v1/feed?page=2': () => ++attempts === 1
        ? json({ detail: 'Falha temporária.' }, 503)
        : json({ results: [{ ...goal, id: 'public-2', name: 'Ler 20 livros' }], next: null }),
    })
    renderAt('/feed')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    await browser.click(screen.getByRole('button', { name: 'Carregar mais metas' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária.')
    expect(screen.getByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    await browser.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('heading', { name: 'Ler 20 livros' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('busca no servidor metas que ainda não foram carregadas e mantém o filtro na paginação', async () => {
    signedIn()
    const browser = userEvent.setup()
    const otherGoal = { ...goal, id: 'public-2', name: 'Ler 20 livros', owner: 'bruno' }
    const fetchMock = mockFetch({
      'GET /api/v1/feed': json({ results: [goal], next: 'http://localhost/api/v1/feed?page=2' }),
      'GET /api/v1/feed?user=&description=&name=livr': json({ results: [otherGoal], next: 'http://localhost/api/v1/feed?user=&description=&name=livr&page=2' }),
      'GET /api/v1/feed?user=&description=&name=livr&page=2': json({ results: [{ ...otherGoal, id: 'public-3', name: 'Ler mais livros' }], next: null }),
      'GET /api/v1/feed?user=ana&description=treinar&name=livr': json({ results: [{ ...otherGoal, owner: 'ana', description: 'Treinar leitura' }], next: null }),
    })
    renderAt('/feed')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    await browser.type(screen.getByRole('searchbox', { name: 'Nome da meta' }), 'livr')
    expect(await screen.findByRole('heading', { name: 'Ler 20 livros' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Correr 10 km' })).not.toBeInTheDocument()
    await browser.click(screen.getByRole('button', { name: 'Carregar mais metas' }))
    expect(await screen.findByRole('heading', { name: 'Ler mais livros' })).toBeInTheDocument()
    act(() => {
      fireEvent.change(screen.getByRole('searchbox', { name: 'Usuário' }), { target: { value: 'ana' } })
      fireEvent.change(screen.getByRole('searchbox', { name: 'Descrição' }), { target: { value: 'treinar' } })
    })
    expect(await screen.findByText('Treinar leitura')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([input]) => new URL(input, window.location.origin).search)).toContain('?user=&description=&name=livr&page=2')
    expect(fetchMock.mock.calls.map(([input]) => new URL(input, window.location.origin).search)).toContain('?user=ana&description=treinar&name=livr')
  })

  it('ignora uma página antiga que termina de carregar depois de uma nova busca', async () => {
    signedIn()
    const browser = userEvent.setup()
    let finishOldPage
    mockFetch({
      'GET /api/v1/feed': json({ results: [goal], next: 'http://localhost/api/v1/feed?page=2' }),
      'GET /api/v1/feed?page=2': () => new Promise((resolve) => { finishOldPage = resolve }),
      'GET /api/v1/feed?user=&description=&name=livr': json({ results: [{ ...goal, id: 'public-2', name: 'Ler 20 livros' }], next: null }),
    })
    renderAt('/feed')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    await browser.click(screen.getByRole('button', { name: 'Carregar mais metas' }))
    await browser.type(screen.getByRole('searchbox', { name: 'Nome da meta' }), 'livr')
    expect(await screen.findByRole('heading', { name: 'Ler 20 livros' })).toBeInTheDocument()
    await act(async () => { finishOldPage(json({ results: [{ ...goal, id: 'public-3', name: 'Meta antiga' }], next: null })) })
    expect(screen.queryByRole('heading', { name: 'Meta antiga' })).not.toBeInTheDocument()
  })

  it('curte e remove uma curtida no card, atualizando a contagem', async () => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'GET /api/v1/feed': json({ results: [goal], next: null }),
      'POST /api/v1/goals/public-1/like': json({ detail: 'Success.' }, 201),
      'DELETE /api/v1/goals/public-1/like': new Response(null, { status: 204 }),
      'GET /api/v1/public/goal/public-1': json(goal),
    })
    renderAt('/feed')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    await browser.click(screen.getByRole('button', { name: 'Curtir meta' }))
    expect(await screen.findByRole('button', { name: 'Remover curtida' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('4 curtidas')).toBeInTheDocument()
    await browser.click(screen.getByRole('button', { name: 'Remover curtida' }))
    expect(await screen.findByRole('button', { name: 'Curtir meta' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('3 curtidas')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([input, options]) => `${options?.method || 'GET'} ${new URL(input, window.location.origin).pathname}`)).toContain('DELETE /api/v1/goals/public-1/like')
  })

  it('permite remover imediatamente uma curtida já registrada no feed', async () => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'GET /api/v1/feed': json({ results: [{ ...goal, already_liked: true }], next: null }),
      'DELETE /api/v1/goals/public-1/like': new Response(null, { status: 204 }),
      'GET /api/v1/public/goal/public-1': json({ ...goal, total_likes: 2 }),
    })
    renderAt('/feed')
    expect(await screen.findByRole('button', { name: 'Remover curtida' })).toHaveAttribute('aria-pressed', 'true')
    await browser.click(screen.getByRole('button', { name: 'Remover curtida' }))
    expect(await screen.findByRole('button', { name: 'Curtir meta' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('2 curtidas')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
  })

  it.each([502, 404])('sincroniza a contagem quando o DELETE responde %i após remover a curtida', async (status) => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'GET /api/v1/feed': json({ results: [{ ...goal, already_liked: true }], next: null }),
      'DELETE /api/v1/goals/public-1/like': json({ detail: status === 502 ? 'No Content' : 'Not found' }, status),
      'GET /api/v1/public/goal/public-1': json({ ...goal, already_liked: false, total_likes: 2 }),
    })
    renderAt('/feed')
    await browser.click(await screen.findByRole('button', { name: 'Remover curtida' }))
    expect(await screen.findByRole('button', { name: 'Curtir meta' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('2 curtidas')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(1)
  })

  it('mantém o botão curtido quando a meta confirma que o DELETE não removeu a curtida', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({
      'GET /api/v1/feed': json({ results: [{ ...goal, already_liked: true }], next: null }),
      'DELETE /api/v1/goals/public-1/like': json({ detail: 'Falha ao remover.' }, 502),
      'GET /api/v1/public/goal/public-1': json({ ...goal, already_liked: true }),
    })
    renderAt('/feed')
    await browser.click(await screen.findByRole('button', { name: 'Remover curtida' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao remover.')
    expect(screen.getByRole('button', { name: 'Remover curtida' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('3 curtidas')).toBeInTheDocument()
  })

  it('permite remover uma curtida antiga após a API indicar duplicidade', async () => {
    signedIn()
    const browser = userEvent.setup()
    let detailCalls = 0
    const fetchMock = mockFetch({
      'GET /api/v1/feed': json({ results: [goal], next: null }),
      'POST /api/v1/goals/public-1/like': json({ detail: 'UNIQUE constraint failed: unique_like' }, 400),
      'DELETE /api/v1/goals/public-1/like': new Response(null, { status: 204 }),
      'GET /api/v1/public/goal/public-1': () => {
        detailCalls += 1
        return json({ ...goal, already_liked: detailCalls === 1, total_likes: detailCalls === 1 ? 4 : 3 })
      },
    })
    renderAt('/feed')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    await browser.click(screen.getByRole('button', { name: 'Curtir meta' }))
    expect(await screen.findByRole('button', { name: 'Remover curtida' })).toBeInTheDocument()
    expect(await screen.findByLabelText('4 curtidas')).toBeInTheDocument()
    await browser.click(screen.getByRole('button', { name: 'Remover curtida' }))
    expect(await screen.findByLabelText('3 curtidas')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([input]) => new URL(input, window.location.origin).pathname === '/api/v1/public/goal/public-1')).toHaveLength(2)
  })

  it('informa que a contagem pode estar antiga quando a curtida já existe e o detalhe falha', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({
      'GET /api/v1/feed': json({ results: [goal], next: null }),
      'POST /api/v1/goals/public-1/like': json({ detail: 'UNIQUE constraint failed: unique_like' }, 400),
      'GET /api/v1/public/goal/public-1': json({ detail: 'Falha temporária.' }, 503),
    })
    renderAt('/feed')
    await browser.click(await screen.findByRole('button', { name: 'Curtir meta' }))
    expect(await screen.findByRole('button', { name: 'Remover curtida' })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('alert')).toHaveTextContent('não foi possível atualizar a contagem')
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

  it('avisa quando a resposta do feed não inclui os dados necessários da meta', async () => {
    signedIn()
    mockFetch({ 'GET /api/v1/feed': json({ results: [{ owner: 'ana', total_tasks: 2 }], next: null }) })
    renderAt('/feed')
    expect(await screen.findByRole('alert')).toHaveTextContent('A resposta do feed está sem o identificador ou o nome das metas.')
  })
})

describe('detalhe de meta pública', () => {
  it('mostra o total de tarefas quando o detalhe retorna total_tasks', async () => {
    signedIn()
    mockFetch({
      'GET /api/v1/public/goal/public-1': json(goal),
      'GET /api/v1/public/comment?goal=public-1': json({ results: [], next: null }),
    })
    renderAt('/feed/public-1')
    expect(await screen.findByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    expect(screen.getByText('2 tarefas nesta meta')).toBeInTheDocument()
    expect(screen.getByText('Esta meta tem 2 tarefas.')).toBeInTheDocument()
  })

  it('usa already_liked no detalhe para oferecer a remoção da curtida', async () => {
    signedIn()
    mockFetch({
      'GET /api/v1/public/goal/public-1': json({ ...goal, already_liked: true }),
      'GET /api/v1/public/comment?goal=public-1': json({ results: [], next: null }),
    })
    renderAt('/feed/public-1')
    expect(await screen.findByRole('button', { name: 'Remover curtida' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('3 curtidas')).toBeInTheDocument()
  })
  it('lista comentários filtrados e publica um novo comentário', async () => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'GET /api/v1/public/goal/public-1': json(goal),
      'GET /api/v1/public/comment?goal=public-1': json({ results: [{ id: 'c1', goal: 'public-1', user: 'bruno', comment: 'Boa sorte!', created_at: '2026-11-13T12:00:00Z' }], next: null }),
      'POST /api/v1/public/comment': (options) => {
        expect(JSON.parse(options.body)).toEqual({ goal: 'public-1', comment: 'Você consegue!' })
        return json({ id: 'c2', goal: 'public-1', user: 'ana', comment: 'Você consegue!', created_at: '2026-11-13T13:00:00Z' }, 201)
      },
    })
    renderAt('/feed/public-1')
    expect(await screen.findByText('Boa sorte!')).toBeInTheDocument()
    await browser.type(screen.getByLabelText('Deixe seu comentário'), 'Você consegue!')
    await browser.click(screen.getByRole('button', { name: 'Publicar comentário' }))
    expect(await screen.findByText('Você consegue!')).toBeInTheDocument()
    expect(screen.getByLabelText('Deixe seu comentário')).toHaveValue('')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('mantém o texto e mostra o erro quando o comentário é recusado', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({
      'GET /api/v1/public/goal/public-1': json(goal),
      'GET /api/v1/public/comment?goal=public-1': json({ results: [], next: null }),
      'POST /api/v1/public/comment': json({ detail: 'Comentário recusado.' }, 400),
    })
    renderAt('/feed/public-1')
    await screen.findByRole('heading', { name: 'Correr 10 km' })
    await browser.type(screen.getByLabelText('Deixe seu comentário'), 'Minha mensagem')
    await browser.click(screen.getByRole('button', { name: 'Publicar comentário' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Comentário recusado.')
    expect(screen.getByLabelText('Deixe seu comentário')).toHaveValue('Minha mensagem')
  })
  it('mostra tarefas concluídas e pendentes vindas do detalhe público', async () => {
    signedIn()
    mockFetch({ 'GET /api/v1/public/goal/public-1': json({
      ...goal,
      total_tasks: 2,
      tasks: [
        { id: 't1', name: 'Primeiro treino', description: 'Correr 3 km', completed: true },
        { id: 't2', name: 'Segundo treino', description: 'Correr 5 km', completed: false },
      ],
    }), 'GET /api/v1/public/comment?goal=public-1': json({ results: [], next: null }) })
    renderAt('/feed/public-1')
    expect(await screen.findByRole('heading', { name: 'Primeiro treino' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Segundo treino' })).toBeInTheDocument()
    expect(screen.getByText('1 de 2 tarefas concluídas')).toBeInTheDocument()
    expect(screen.getByText('Correr 3 km')).toBeInTheDocument()
  })

  it('mostra os dados públicos, foto do autor e progresso', async () => {
    signedIn()
    mockFetch({ 'GET /api/v1/public/goal/public-1': json(goal), 'GET /api/v1/public/comment?goal=public-1': json({ results: [], next: null }) })
    renderAt('/feed/public-1')
    expect(await screen.findByRole('heading', { name: 'Correr 10 km' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto de ana' })).toHaveAttribute('src', `${window.location.origin}/media/ana.jpg`)
    expect(screen.getByText('Treinar com a comunidade')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar para o feed/ })).toHaveAttribute('href', '/feed')
  })

  it('usa iniciais quando não há foto ou quando a imagem falha', async () => {
    signedIn()
    mockFetch({ 'GET /api/v1/public/goal/public-1': json(goal), 'GET /api/v1/public/comment?goal=public-1': json({ results: [], next: null }) })
    renderAt('/feed/public-1')
    fireEvent.error(await screen.findByRole('img', { name: 'Foto de ana' }))
    expect(screen.getByLabelText('Avatar de ana')).toHaveTextContent('AN')
  })

  it('mostra 404 para uma meta privada ou inexistente', async () => {
    signedIn()
    mockFetch({ 'GET /api/v1/public/goal/private': json({ detail: 'Not found.' }, 404), 'GET /api/v1/public/comment?goal=private': json({ results: [], next: null }) })
    renderAt('/feed/private')
    expect(await screen.findByRole('alert')).toHaveTextContent('Essa meta pública não foi encontrada.')
    expect(screen.getByRole('link', { name: /Ver o feed/ })).toHaveAttribute('href', '/feed')
  })
})
