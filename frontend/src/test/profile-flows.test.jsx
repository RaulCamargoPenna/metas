import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { json, mockFetch, renderAt, signedIn } from './helpers'

const profile = { username: 'ana', first_name: 'Ana', last_name: 'Silva', email: 'ana@example.com', bio: 'Minha jornada', image: null }

describe('perfil', () => {
  it('busca os dados e salva as informações editadas por PATCH', async () => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'GET /api/v1/user': json(profile),
      'PATCH /api/v1/user': (options) => {
        expect(JSON.parse(options.body)).toEqual({ username: 'ana', first_name: 'Ana Maria', last_name: 'Silva', email: 'ana@example.com', bio: 'Minha jornada' })
        return json({ ...profile, first_name: 'Ana Maria' })
      },
    })
    renderAt('/perfil')
    await screen.findByDisplayValue('Ana')
    await browser.clear(screen.getByLabelText('Nome', { exact: true }))
    await browser.type(screen.getByLabelText('Nome', { exact: true }), 'Ana Maria')
    await browser.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Informações atualizadas com sucesso.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ana Maria Silva' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('envia uma foto como multipart sem definir Content-Type manualmente', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({
      'GET /api/v1/user': json(profile),
      'PATCH /api/v1/user': (options) => {
        expect(options.body).toBeInstanceOf(FormData)
        expect(options.body.get('image').name).toBe('foto.png')
        expect(options.headers['Content-Type']).toBeUndefined()
        return json({ ...profile, image: '/media/foto.png' })
      },
    })
    renderAt('/perfil')
    await screen.findByDisplayValue('Ana')
    await browser.upload(screen.getByLabelText('Escolher imagem'), new File(['imagem'], 'foto.png', { type: 'image/png' }))
    await browser.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Informações atualizadas com sucesso.')).toBeInTheDocument()
  })

  it('mostra a imagem escolhida antes de salvar', async () => {
    signedIn()
    const browser = userEvent.setup()
    const createObjectURL = URL.createObjectURL
    const revokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:foto-preview')
    URL.revokeObjectURL = vi.fn()
    try {
      mockFetch({ 'GET /api/v1/user': json(profile) })
      const view = renderAt('/perfil')
      await screen.findByDisplayValue('Ana')
      await browser.upload(screen.getByLabelText('Escolher imagem'), new File(['imagem'], 'foto.png', { type: 'image/png' }))
      expect(screen.getByText('Selecionada: foto.png')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Sua foto de perfil' })).toHaveAttribute('src', 'blob:foto-preview')
      view.unmount()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto-preview')
    } finally {
      URL.createObjectURL = createObjectURL
      URL.revokeObjectURL = revokeObjectURL
    }
  })

  it('permite remover a foto com image null', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({
      'GET /api/v1/user': json({ ...profile, image: '/media/ana.png' }),
      'PATCH /api/v1/user': (options) => {
        expect(JSON.parse(options.body).image).toBeNull()
        return json(profile)
      },
    })
    renderAt('/perfil')
    await screen.findByRole('button', { name: 'Remover foto' })
    await browser.click(screen.getByRole('button', { name: 'Remover foto' }))
    await browser.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Informações atualizadas com sucesso.')).toBeInTheDocument()
  })

  it('confere a nova senha antes de chamar a API e troca a senha quando coincide', async () => {
    signedIn()
    const browser = userEvent.setup()
    const fetchMock = mockFetch({
      'GET /api/v1/user': json(profile),
      'POST /api/v1/change/password': (options) => {
        expect(JSON.parse(options.body)).toEqual({ old_password: 'antiga123', new_password: 'nova1234' })
        return json({ detail: 'Senha atualizada com sucesso.' })
      },
    })
    renderAt('/perfil')
    await screen.findByDisplayValue('Ana')
    await browser.type(screen.getByLabelText('Senha atual'), 'antiga123')
    await browser.type(screen.getByLabelText('Nova senha', { exact: true }), 'nova1234')
    await browser.type(screen.getByLabelText('Confirmar nova senha'), 'diferente')
    await browser.click(screen.getByRole('button', { name: 'Atualizar senha' }))
    expect(screen.getByText('A confirmação não corresponde à nova senha.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await browser.clear(screen.getByLabelText('Confirmar nova senha'))
    await browser.type(screen.getByLabelText('Confirmar nova senha'), 'nova1234')
    await browser.click(screen.getByRole('button', { name: 'Atualizar senha' }))
    expect(await screen.findByText('Senha alterada com sucesso.')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha atual')).toHaveValue('')
  })

  it('mostra o erro retornado para a senha atual incorreta', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({
      'GET /api/v1/user': json(profile),
      'POST /api/v1/change/password': json({ detail: 'Senha antiga incorreta.' }, 403),
    })
    renderAt('/perfil')
    await screen.findByDisplayValue('Ana')
    await browser.type(screen.getByLabelText('Senha atual'), 'errada')
    await browser.type(screen.getByLabelText('Nova senha', { exact: true }), 'nova1234')
    await browser.type(screen.getByLabelText('Confirmar nova senha'), 'nova1234')
    await browser.click(screen.getByRole('button', { name: 'Atualizar senha' }))
    expect(await screen.findByText('Senha antiga incorreta.')).toBeInTheDocument()
  })

  it('limpa os tokens e volta ao login ao sair', async () => {
    signedIn()
    const browser = userEvent.setup()
    mockFetch({ 'GET /api/v1/user': json(profile) })
    renderAt('/perfil')
    await screen.findByDisplayValue('Ana')
    await browser.click(screen.getByRole('button', { name: 'Sair da conta' }))
    expect(await screen.findByRole('heading', { name: 'Entre na sua conta' })).toBeInTheDocument()
    expect(localStorage.getItem('metas_refresh_token')).toBeNull()
  })
})
