import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderizar, semSessao, simularApi, usuario } from '../test/apoio.tsx'

const treinador = usuario({
  id: 9,
  nome: 'Carlos Treinador',
  email: 'carlos@box.com',
  ehProfessor: true,
})

describe('acesso', () => {
  it('sem sessão, qualquer página leva ao login', async () => {
    simularApi({ 'GET /api/auth/me': semSessao, 'POST /api/auth/refresh': semSessao })
    const router = renderizar('/treinador/alunos')

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('o treinador entra e vai para a visão geral', async () => {
    simularApi({
      'GET /api/auth/me': semSessao,
      'POST /api/auth/refresh': semSessao,
      'POST /api/auth/login': { body: { usuario: treinador } },
      'GET /api/c/1/visao-geral': {
        body: {
          alunos: { ativos: 0, primeiroAcessoConcluido: 0, comPr: 0, percentualComPr: 0 },
          ultimos30Dias: { registradosPeloAluno: 0, importados: 0 },
          ultimaImportacao: null,
          alunosSemPr: [],
        },
      },
    })
    const router = renderizar('/login')
    const pessoa = userEvent.setup()

    await pessoa.type(await screen.findByLabelText('E-mail'), 'carlos@box.com')
    await pessoa.type(screen.getByLabelText('Senha'), 'senha-123')
    await pessoa.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Olá, Carlos' })).toBeInTheDocument()
    expect(await screen.findByText('Comece cadastrando os alunos do box.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/treinador/visao-geral')
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
    simularApi({
      'GET /api/auth/me': { body: { usuario: usuario() } },
      'GET /api/me/prs': { body: [] },
    })
    const router = renderizar('/treinador/alunos')

    expect(await screen.findByRole('heading', { name: 'Percentuais de carga' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/aluno/percentuais')
  })

  it('sair encerra a sessão e volta ao login', async () => {
    simularApi({
      'GET /api/auth/me': { body: { usuario: treinador } },
      'GET /api/c/1/alunos': { body: [] },
      'GET /api/c/1/turmas': { body: [] },
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

describe('cadastro e primeiro acesso', () => {
  it('cria a conta de professor, aceita o termo e entra na gestão (sem código por e-mail)', async () => {
    const novo = usuario({
      id: 7,
      nome: 'Carla',
      email: 'carla@t.com',
      ehProfessor: true,
      consentimentoPendente: true,
    })
    const chamadas = simularApi({
      'GET /api/auth/me': semSessao,
      'POST /api/auth/refresh': semSessao,
      'POST /api/auth/cadastro': { status: 201, body: { usuario: novo } },
      'POST /api/auth/consentimento': {
        body: { usuario: { ...novo, consentimentoPendente: false } },
      },
      'GET /api/c/1/visao-geral': {
        body: {
          alunos: { ativos: 0, primeiroAcessoConcluido: 0, comPr: 0, percentualComPr: 0 },
          ultimos30Dias: { registradosPeloAluno: 0, importados: 0 },
          ultimaImportacao: null,
          alunosSemPr: [],
        },
      },
    })
    const router = renderizar('/cadastro')
    const pessoa = userEvent.setup()

    await pessoa.click(await screen.findByLabelText(/Professor/))
    await pessoa.type(screen.getByLabelText('Seu nome'), 'Carla')
    await pessoa.type(screen.getByLabelText('E-mail'), 'carla@t.com')
    await pessoa.type(screen.getByLabelText('Senha'), 'senha-forte-1')
    await pessoa.type(screen.getByLabelText('Confirme a senha'), 'outra')
    await pessoa.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(screen.getByText('As senhas não conferem')).toBeInTheDocument()

    await pessoa.clear(screen.getByLabelText('Confirme a senha'))
    await pessoa.type(screen.getByLabelText('Confirme a senha'), 'senha-forte-1')
    await pessoa.click(screen.getByRole('button', { name: 'Criar conta' }))

    // Vai direto para o termo, sem pedir código
    await pessoa.click(await screen.findByRole('button', { name: 'Li e aceito' }))
    expect(await screen.findByRole('heading', { name: 'Olá, Carla' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/treinador/visao-geral')
    expect(chamadas.find((c) => c.url === '/api/auth/cadastro')?.corpo).toEqual({
      nome: 'Carla',
      email: 'carla@t.com',
      senha: 'senha-forte-1',
      tipo: 'PESSOA',
      ehProfessor: true,
    })
  })

  it('esqueci a senha: pede o código e cria a nova senha', async () => {
    const chamadas = simularApi({
      'GET /api/auth/me': semSessao,
      'POST /api/auth/refresh': semSessao,
      'POST /api/auth/esqueci-senha': { status: 204 },
      'POST /api/auth/redefinir-senha': { status: 204 },
    })
    renderizar('/login')
    const pessoa = userEvent.setup()

    await pessoa.click(await screen.findByRole('link', { name: 'Esqueci a senha' }))
    await pessoa.type(await screen.findByLabelText('E-mail'), 'ana@t.com')
    await pessoa.click(screen.getByRole('button', { name: 'Enviar código' }))
    await pessoa.type(await screen.findByLabelText('Código'), '654321')
    await pessoa.type(screen.getByLabelText('Nova senha'), 'nova-senha-123')
    await pessoa.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText(/Sua senha foi alterada/)).toBeInTheDocument()
    expect(chamadas.find((c) => c.url === '/api/auth/redefinir-senha')?.corpo).toEqual({
      email: 'ana@t.com',
      codigo: '654321',
      novaSenha: 'nova-senha-123',
    })
  })
})

describe('vínculos', () => {
  it('o aluno usa o código do box', async () => {
    const chamadas = simularApi({
      'GET /api/auth/me': { body: { usuario: usuario() } },
      'GET /api/vinculos': { body: { comoAluno: [], academiasOndeEnsina: [] } },
      'POST /api/vinculos/codigo': {
        status: 201,
        body: { tipo: 'academia', academia: { id: 1, nome: 'Box Centro' } },
      },
    })
    renderizar('/aluno/vinculos')
    const pessoa = userEvent.setup()

    await pessoa.type(await screen.findByLabelText('Código de vínculo'), '482913')
    await pessoa.click(screen.getByRole('button', { name: 'Vincular' }))

    expect(await screen.findByText('Pronto! Você está vinculado a Box Centro.')).toBeInTheDocument()
    expect(chamadas.find((c) => c.url === '/api/vinculos/codigo')?.corpo).toEqual({
      codigo: '482913',
    })
  })

  it('o professor organiza o aluno na turma e pode desvinculá-lo', async () => {
    const ana = {
      id: 5,
      nome: 'Ana Souza',
      email: 'ana@t.com',
      vinculoId: 11,
      turma: null,
      local: null,
      apelidos: [],
      desde: '2026-10-01T00:00:00.000Z',
      primeiroAcessoPendente: false,
    }
    const chamadas = simularApi({
      'GET /api/auth/me': { body: { usuario: treinador } },
      'GET /api/c/1/alunos': { body: [ana] },
      'GET /api/c/1/turmas': {
        body: [{ id: 3, nome: 'Turma 18h', horario: '18:00', totalAlunos: 0, local: null }],
      },
      'GET /api/c/1/locais': { body: [] },
      'PUT /api/c/1/alunos/5': { body: { ...ana, turma: { id: 3, nome: 'Turma 18h' } } },
    })
    renderizar('/treinador/alunos')
    const pessoa = userEvent.setup()

    await pessoa.click(await screen.findByRole('button', { name: 'Organizar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Organizar Ana Souza' })
    await pessoa.selectOptions(dialogo.querySelector('select')!, '3')
    await pessoa.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(chamadas.find((c) => c.metodo === 'PUT')?.corpo).toEqual({
        turmaId: 3,
        localId: null,
        apelidos: [],
      }),
    )
  })
})
