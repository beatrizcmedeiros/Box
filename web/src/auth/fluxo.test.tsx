import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderizar, semSessao, simularApi, usuario } from '../test/apoio.tsx'

const treinador = usuario({
  id: 9,
  nome: 'Carlos Treinador',
  email: 'carlos@box.com',
  perfil: 'TREINADOR',
})

describe('acesso', () => {
  it('sem sessão, qualquer página leva ao login', async () => {
    simularApi({ 'GET /api/auth/me': semSessao, 'POST /api/auth/refresh': semSessao })
    const router = renderizar('/treinador/alunos')

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('o treinador entra e vai para a lista de alunos', async () => {
    simularApi({
      'GET /api/auth/me': semSessao,
      'POST /api/auth/refresh': semSessao,
      'POST /api/auth/login': { body: { usuario: treinador } },
      'GET /api/admin/alunos': { body: [] },
      'GET /api/admin/turmas': { body: [] },
    })
    const router = renderizar('/login')
    const pessoa = userEvent.setup()

    await pessoa.type(await screen.findByLabelText('E-mail'), 'carlos@box.com')
    await pessoa.type(screen.getByLabelText('Senha'), 'senha-123')
    await pessoa.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Alunos' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/treinador/alunos')
  })

  it('mostra a mensagem de credenciais inválidas', async () => {
    simularApi({
      'GET /api/auth/me': semSessao,
      'POST /api/auth/refresh': semSessao,
      'POST /api/auth/login': {
        status: 401,
        body: { erro: 'E-mail ou senha incorretos', codigo: 'CREDENCIAIS_INVALIDAS' },
      },
    })
    renderizar('/login')
    const pessoa = userEvent.setup()

    await pessoa.type(await screen.findByLabelText('E-mail'), 'x@x.com')
    await pessoa.type(screen.getByLabelText('Senha'), 'errada')
    await pessoa.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos')
  })

  it('o aluno não acessa o painel do treinador', async () => {
    simularApi({ 'GET /api/auth/me': { body: { usuario: usuario() } } })
    const router = renderizar('/treinador/alunos')

    expect(await screen.findByText('Olá, Ana')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/aluno')
  })

  it('sair encerra a sessão e volta ao login', async () => {
    simularApi({
      'GET /api/auth/me': { body: { usuario: treinador } },
      'GET /api/admin/alunos': { body: [] },
      'GET /api/admin/turmas': { body: [] },
      'POST /api/auth/logout': { status: 204 },
    })
    const router = renderizar('/treinador/alunos')
    const pessoa = userEvent.setup()

    await screen.findByRole('heading', { name: 'Alunos' })
    await pessoa.click(screen.getAllByRole('button', { name: 'Sair' })[0])

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })
})

describe('primeiro acesso', () => {
  it('exige trocar a senha e depois aceitar o termo', async () => {
    const chamadas = simularApi({
      'GET /api/auth/me': {
        body: { usuario: usuario({ trocarSenha: true, consentimentoPendente: true }) },
      },
      'POST /api/auth/trocar-senha': {
        body: { usuario: usuario({ consentimentoPendente: true }) },
      },
      'POST /api/auth/consentimento': { body: { usuario: usuario() } },
    })
    const router = renderizar('/aluno')
    const pessoa = userEvent.setup()

    await pessoa.type(await screen.findByLabelText('Senha temporária'), 'Temp1234ab')
    await pessoa.type(screen.getByLabelText('Nova senha'), 'minha-senha-nova')
    await pessoa.type(screen.getByLabelText('Confirme a nova senha'), 'outra-coisa')
    await pessoa.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
    expect(screen.getByText('As senhas não conferem')).toBeInTheDocument()
    expect(chamadas.some((c) => c.url === '/api/auth/trocar-senha')).toBe(false)

    await pessoa.clear(screen.getByLabelText('Confirme a nova senha'))
    await pessoa.type(screen.getByLabelText('Confirme a nova senha'), 'minha-senha-nova')
    await pessoa.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    await pessoa.click(await screen.findByRole('button', { name: 'Li e aceito' }))

    expect(await screen.findByText('Olá, Ana')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/aluno')
    expect(chamadas.find((c) => c.url === '/api/auth/trocar-senha')?.corpo).toEqual({
      senhaAtual: 'Temp1234ab',
      novaSenha: 'minha-senha-nova',
    })
  })
})

describe('cadastro de aluno', () => {
  it('exibe a senha temporária gerada', async () => {
    const chamadas = simularApi({
      'GET /api/auth/me': { body: { usuario: treinador } },
      'GET /api/admin/alunos': { body: [] },
      'GET /api/admin/turmas': {
        body: [{ id: 3, nome: 'Turma 18h', horario: '18:00', totalAlunos: 0 }],
      },
      'POST /api/admin/alunos': (corpo) => ({
        status: 201,
        body: {
          aluno: {
            id: 5,
            ...(corpo as object),
            trocarSenha: true,
            turma: { id: 3, nome: 'Turma 18h' },
          },
          senhaTemporaria: 'Abc23xyZ9k',
        },
      }),
    })
    renderizar('/treinador/alunos')
    const pessoa = userEvent.setup()

    await pessoa.click(await screen.findByRole('button', { name: '+ Novo aluno' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Novo aluno' })
    await pessoa.type(screen.getByLabelText('Nome completo'), 'Bruno Lima')
    await pessoa.type(
      screen.getByLabelText('E-mail', { selector: '[role=dialog] input' }),
      'bruno@teste.com',
    )
    await pessoa.selectOptions(dialogo.querySelector('select')!, '3')
    await pessoa.click(screen.getByRole('button', { name: 'Cadastrar aluno' }))

    expect(await screen.findByTestId('senha-temporaria')).toHaveTextContent('Abc23xyZ9k')
    await waitFor(() =>
      expect(
        chamadas.find((c) => c.metodo === 'POST' && c.url === '/api/admin/alunos')?.corpo,
      ).toEqual({
        nome: 'Bruno Lima',
        email: 'bruno@teste.com',
        turmaId: 3,
        ativo: true,
      }),
    )
  })
})
