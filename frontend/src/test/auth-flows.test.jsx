import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { json, mockFetch, renderAt, signedIn } from './helpers'

const user = { username: 'ana', first_name: 'Ana', last_name: 'Silva', email: 'ana@example.com', bio: '', image: null }

async function fillRegistration(browser) {
  await browser.type(screen.getByLabelText('Nome'), 'Ana')
  await browser.type(screen.getByLabelText('Sobrenome'), 'Silva')
  await browser.type(screen.getByLabelText('Nome de usuário'), 'ana')
  await browser.type(screen.getByLabelText('E-mail'), 'ana@example.com')
  await browser.type(screen.getByLabelText('Senha', { exact: true }), 'senha123')
  await browser.type(screen.getByLabelText('Confirmar senha'), 'senha123')
}

describe('rotas públicas', () => {
  it('mostra a landing e leva ao cadastro e à página Sobre', async () => {
    const browser = userEvent.setup()
    renderAt('/')
    expect(screen.getByRole('link', { name: /Começar minha jornada/ })).toHaveAttribute('href', '/cadastro')
    expect(screen.getByText('Metas com direção')).toBeInTheDocument()
    await browser.click(screen.getByRole('link', { name: 'Sobre' }))
    expect(screen.getByRole('heading', { name: 'Progresso é melhor em companhia.' })).toBeInTheDocument()
  })

  it('mostra uma página 404 para uma rota desconhecida', () => {
    renderAt('/nao-existe')
    expect(screen.getByRole('heading', { name: 'Esse caminho não existe.' })).toBeInTheDocument()
  })

  it('redireciona uma rota privada sem sessão para login', async () => {
    renderAt('/metas')
    expect(await screen.findByRole('heading', { name: 'Entre na sua conta' })).toBeInTheDocument()
  })
})

describe('login', () => {
  it('envia as credenciais e abre o perfil autenticado', async () => {
    const browser = userEvent.setup()
    mockFetch({
      'POST /api/v1/token': json({ access: 'access', refresh: 'refresh' }),
      'GET /api/v1/user': json(user),
    })
    renderAt('/login')
    await browser.type(screen.getByLabelText('Nome de usuário'), 'ana')
    await browser.type(screen.getByLabelText('Senha'), 'senha123')
    await browser.click(screen.getByRole('button', { name: 'Entrar na minha conta' }))
    expect(await screen.findByRole('heading', { name: /Seu espaço, sua história/ })).toBeInTheDocument()
    expect(localStorage.getItem('metas_refresh_token')).toBe('refresh')
  })

  it('mostra credenciais incorretas e mantém o formulário', async () => {
    const browser = userEvent.setup()
    mockFetch({ 'POST /api/v1/token': json({ detail: 'No active account' }, 401) })
    renderAt('/login')
    await browser.type(screen.getByLabelText('Nome de usuário'), 'ana')
    await browser.type(screen.getByLabelText('Senha'), 'errada')
    await browser.click(screen.getByRole('button', { name: 'Entrar na minha conta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha incorretos')
    expect(screen.getByRole('link', { name: 'Crie sua conta' })).toHaveAttribute('href', '/cadastro')
  })

  it('abre o perfil quando outra aba faz login', async () => {
    mockFetch({ 'GET /api/v1/user': json(user) })
    renderAt('/login')
    signedIn()
    window.dispatchEvent(new StorageEvent('storage', { key: 'metas_refresh_token', newValue: 'refresh-test', storageArea: localStorage }))
    expect(await screen.findByRole('heading', { name: /Seu espaço, sua história/ })).toBeInTheDocument()
  })

  it('volta ao login quando outra aba encerra a sessão', async () => {
    signedIn()
    mockFetch({ 'GET /api/v1/user': json(user) })
    renderAt('/perfil')
    await screen.findByDisplayValue('Ana')
    localStorage.removeItem('metas_access_token')
    localStorage.removeItem('metas_refresh_token')
    window.dispatchEvent(new StorageEvent('storage', { key: 'metas_refresh_token', oldValue: 'refresh-test', storageArea: localStorage }))
    expect(await screen.findByRole('heading', { name: 'Entre na sua conta' })).toBeInTheDocument()
  })
})

describe('cadastro', () => {
  it('cria a conta e entra automaticamente', async () => {
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'POST /api/v1/register': (options) => {
        expect(JSON.parse(options.body)).toEqual({ username: 'ana', first_name: 'Ana', last_name: 'Silva', email: 'ana@example.com', password: 'senha123' })
        return json(user, 201)
      },
      'POST /api/v1/token': json({ access: 'access', refresh: 'refresh' }),
      'GET /api/v1/user': json(user),
    })
    renderAt('/cadastro')
    await fillRegistration(browser)
    await browser.click(screen.getByRole('button', { name: 'Criar minha conta' }))
    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('não envia senhas diferentes', async () => {
    const browser = userEvent.setup()
    const fetchMock = mockFetch({})
    renderAt('/cadastro')
    await fillRegistration(browser)
    await browser.clear(screen.getByLabelText('Confirmar senha'))
    await browser.type(screen.getByLabelText('Confirmar senha'), 'outra123')
    await browser.click(screen.getByRole('button', { name: 'Criar minha conta' }))
    expect(screen.getByRole('alert')).toHaveTextContent('confirmação de senha')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mostra erro de usuário duplicado vindo do backend', async () => {
    const browser = userEvent.setup()
    mockFetch({ 'POST /api/v1/register': json({ username: ['Este usuário já existe.'] }, 400) })
    renderAt('/cadastro')
    await fillRegistration(browser)
    await browser.click(screen.getByRole('button', { name: 'Criar minha conta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário: Este usuário já existe.')
  })

  it('preserva o cadastro se o login automático falhar', async () => {
    const browser = userEvent.setup()
    mockFetch({
      'POST /api/v1/register': json(user, 201),
      'POST /api/v1/token': json({ detail: 'Unavailable' }, 503),
    })
    renderAt('/cadastro')
    await fillRegistration(browser)
    await browser.click(screen.getByRole('button', { name: 'Criar minha conta' }))
    expect(await screen.findByText('Conta criada com sucesso! Entre para continuar.')).toBeInTheDocument()
  })
})
