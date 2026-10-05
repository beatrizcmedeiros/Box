import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import { criarAppDeTeste, criarUsuario, limparBanco, logar, logarComoTreinador } from './apoio.ts'

const app = criarAppDeTeste()

beforeEach(limparBanco)

describe('controle de acesso', () => {
  it('exige autenticação', async () => {
    expect((await request(app).get('/api/admin/alunos')).status).toBe(401)
  })

  it('bloqueia o perfil aluno', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const aluno = await logar(app, 'ana@teste.com')

    for (const rota of ['/api/admin/turmas', '/api/admin/exercicios', '/api/admin/alunos']) {
      const res = await aluno.get(rota)
      expect(res.status).toBe(403)
      expect(res.body.codigo).toBe('SEM_PERMISSAO')
    }
  })
})

describe('turmas', () => {
  it('cria, lista, edita e remove', async () => {
    const treinador = await logarComoTreinador(app)

    const criada = await treinador
      .post('/api/admin/turmas')
      .send({ nome: 'Turma 18h', horario: '18:00' })
    expect(criada.status).toBe(201)

    const id = criada.body.id
    const editada = await treinador
      .put(`/api/admin/turmas/${id}`)
      .send({ nome: 'Turma 18h30', horario: '18:30' })
    expect(editada.body).toMatchObject({ nome: 'Turma 18h30', horario: '18:30' })

    const lista = await treinador.get('/api/admin/turmas')
    expect(lista.body).toEqual([expect.objectContaining({ id, totalAlunos: 0 })])

    expect((await treinador.delete(`/api/admin/turmas/${id}`)).status).toBe(204)
    expect((await treinador.delete(`/api/admin/turmas/${id}`)).status).toBe(404)
  })

  it('valida horário e nome repetido', async () => {
    const treinador = await logarComoTreinador(app)
    expect(
      (await treinador.post('/api/admin/turmas').send({ nome: 'A', horario: '25:00' })).status,
    ).toBe(400)

    await treinador.post('/api/admin/turmas').send({ nome: 'Turma 06h' })
    expect((await treinador.post('/api/admin/turmas').send({ nome: 'Turma 06h' })).status).toBe(409)
  })

  it('ao remover a turma, os alunos ficam sem turma', async () => {
    const treinador = await logarComoTreinador(app)
    const turma = await prisma.turma.create({ data: { nome: 'Turma 07h' } })
    const aluno = await criarUsuario({ email: 'ana@teste.com', turmaId: turma.id })

    await treinador.delete(`/api/admin/turmas/${turma.id}`)

    expect((await prisma.usuario.findUnique({ where: { id: aluno.id } }))?.turmaId).toBeNull()
  })
})

describe('exercícios', () => {
  it('normaliza os nomes alternativos e ignora o igual ao nome', async () => {
    const treinador = await logarComoTreinador(app)
    const res = await treinador.post('/api/admin/exercicios').send({
      nome: 'Push Press',
      categoria: 'LEVANTAMENTO',
      aliases: ['Push Prés ', 'push pres', 'PUSH PRESS', 'Desenvolvimento c/ impulso'],
    })
    expect(res.status).toBe(201)
    expect(res.body.aliases).toEqual(['desenvolvimento c/ impulso', 'push pres'])
  })

  it('não permite o mesmo nome alternativo em dois exercícios', async () => {
    const treinador = await logarComoTreinador(app)
    await treinador
      .post('/api/admin/exercicios')
      .send({ nome: 'Deadlift', categoria: 'LEVANTAMENTO', aliases: ['terra'] })

    const res = await treinador
      .post('/api/admin/exercicios')
      .send({ nome: 'Sumo Deadlift', categoria: 'LEVANTAMENTO', aliases: ['Terra'] })
    expect(res.status).toBe(409)
    expect(res.body.erro).toContain('Deadlift')
  })

  it('edita substituindo os nomes alternativos e pode desativar', async () => {
    const treinador = await logarComoTreinador(app)
    const { body } = await treinador
      .post('/api/admin/exercicios')
      .send({ nome: 'Snatch', categoria: 'OLIMPICO', aliases: ['arranco'] })

    const res = await treinador
      .put(`/api/admin/exercicios/${body.id}`)
      .send({ nome: 'Snatch', categoria: 'OLIMPICO', ativo: false, aliases: ['power snatch'] })
    expect(res.body).toMatchObject({ ativo: false, aliases: ['power snatch'] })
  })

  it('só exclui exercício sem testes de carga', async () => {
    const treinador = await logarComoTreinador(app)
    const aluno = await criarUsuario({ email: 'ana@teste.com' })
    const comTeste = await prisma.exercicio.create({ data: { nome: 'Clean' } })
    const semTeste = await prisma.exercicio.create({ data: { nome: 'Snatch' } })
    await prisma.testeCarga.create({
      data: { usuarioId: aluno.id, exercicioId: comTeste.id, dataTeste: new Date(), cargaKg: 70 },
    })

    const bloqueado = await treinador.delete(`/api/admin/exercicios/${comTeste.id}`)
    expect(bloqueado.status).toBe(409)
    expect(bloqueado.body.erro).toContain('Desative')

    expect((await treinador.delete(`/api/admin/exercicios/${semTeste.id}`)).status).toBe(204)
  })
})

describe('alunos', () => {
  it('cria o aluno com senha temporária que funciona no primeiro login', async () => {
    const treinador = await logarComoTreinador(app)
    const turma = await prisma.turma.create({ data: { nome: 'Turma 18h' } })

    const res = await treinador
      .post('/api/admin/alunos')
      .send({ nome: 'Bruno Lima', email: 'Bruno@Teste.com', turmaId: turma.id })

    expect(res.status).toBe(201)
    expect(res.body.aluno).toMatchObject({
      nome: 'Bruno Lima',
      email: 'bruno@teste.com',
      trocarSenha: true,
      turma: { id: turma.id, nome: 'Turma 18h' },
    })
    expect(res.body.aluno).not.toHaveProperty('senhaHash')
    expect(res.body.senhaTemporaria).toHaveLength(10)

    const aluno = await logar(app, 'bruno@teste.com', res.body.senhaTemporaria)
    const me = await aluno.get('/api/auth/me')
    expect(me.body.usuario).toMatchObject({ trocarSenha: true, consentimentoPendente: true })
  })

  it('valida e-mail repetido e turma inexistente', async () => {
    const treinador = await logarComoTreinador(app)
    await treinador.post('/api/admin/alunos').send({ nome: 'Ana Souza', email: 'ana@teste.com' })

    expect(
      (await treinador.post('/api/admin/alunos').send({ nome: 'Ana 2', email: 'ana@teste.com' }))
        .status,
    ).toBe(409)
    expect(
      (
        await treinador
          .post('/api/admin/alunos')
          .send({ nome: 'Carla', email: 'carla@teste.com', turmaId: 999 })
      ).status,
    ).toBe(400)
  })

  it('filtra por busca, turma e situação', async () => {
    const treinador = await logarComoTreinador(app)
    const t18 = await prisma.turma.create({ data: { nome: 'Turma 18h' } })
    await criarUsuario({ nome: 'Ana Souza', email: 'ana@teste.com', turmaId: t18.id })
    await criarUsuario({ nome: 'Bruno Lima', email: 'bruno@teste.com' })
    await criarUsuario({
      nome: 'Carla Mendes',
      email: 'carla@teste.com',
      turmaId: t18.id,
      ativo: false,
    })

    const nomes = async (query: string) =>
      (await treinador.get(`/api/admin/alunos${query}`)).body.map((a: { nome: string }) => a.nome)

    expect(await nomes('')).toEqual(['Ana Souza', 'Bruno Lima', 'Carla Mendes'])
    expect(await nomes('?busca=souz')).toEqual(['Ana Souza'])
    expect(await nomes(`?turmaId=${t18.id}`)).toEqual(['Ana Souza', 'Carla Mendes'])
    expect(await nomes(`?turmaId=${t18.id}&ativo=true`)).toEqual(['Ana Souza'])
  })

  it('não lista nem altera treinadores pela rota de alunos', async () => {
    const treinador = await logarComoTreinador(app)
    const outro = await criarUsuario({ email: 'outro@teste.com', perfil: 'TREINADOR' })

    expect((await treinador.get('/api/admin/alunos')).body).toEqual([])
    expect((await treinador.delete(`/api/admin/alunos/${outro.id}`)).status).toBe(404)
  })

  it('redefinir a senha encerra as sessões do aluno', async () => {
    const treinador = await logarComoTreinador(app)
    const ana = await criarUsuario({ email: 'ana@teste.com' })
    const sessaoAntiga = await logar(app, 'ana@teste.com')

    const res = await treinador.post(`/api/admin/alunos/${ana.id}/redefinir-senha`)
    expect(res.status).toBe(200)

    expect((await sessaoAntiga.post('/api/auth/refresh')).status).toBe(401)
    await logar(app, 'ana@teste.com', res.body.senhaTemporaria)
  })

  it('desativar impede o login; excluir remove o aluno', async () => {
    const treinador = await logarComoTreinador(app)
    const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@teste.com' })

    await treinador
      .put(`/api/admin/alunos/${ana.id}`)
      .send({ nome: 'Ana Souza', email: 'ana@teste.com', ativo: false })
    await expect(logar(app, 'ana@teste.com')).rejects.toThrow()

    expect((await treinador.delete(`/api/admin/alunos/${ana.id}`)).status).toBe(204)
    expect(await prisma.usuario.findUnique({ where: { id: ana.id } })).toBeNull()
  })
})

describe('visão geral (indicadores do piloto)', () => {
  it('conta adesão dos alunos ativos e lista quem ainda não tem PR', async () => {
    const treinador = await logarComoTreinador(app)
    const turma = await prisma.turma.create({ data: { nome: 'Turma 18h' } })
    const exercicio = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
    const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@t.com', turmaId: turma.id })
    await criarUsuario({
      nome: 'Bruno Lima',
      email: 'bruno@t.com',
      trocarSenha: true,
      consentido: false,
    })
    await criarUsuario({ nome: 'Carla Mendes', email: 'carla@t.com' })
    await criarUsuario({ nome: 'Inativo', email: 'inativo@t.com', ativo: false })
    await prisma.testeCarga.create({
      data: {
        usuarioId: ana.id,
        exercicioId: exercicio.id,
        dataTeste: new Date('2026-03-15'),
        cargaKg: 80,
      },
    })

    const res = await treinador.get('/api/admin/visao-geral')

    expect(res.status).toBe(200)
    expect(res.body.alunos).toEqual({
      ativos: 3,
      primeiroAcessoConcluido: 2,
      comPr: 1,
      percentualComPr: 33,
    })
    expect(res.body.ultimos30Dias).toEqual({ registradosPeloAluno: 1, importados: 0 })
    expect(res.body.ultimaImportacao).toBeNull()
    expect(res.body.alunosSemPr).toEqual([
      { id: expect.any(Number), nome: 'Bruno Lima', turma: null, aguardandoPrimeiroAcesso: true },
      {
        id: expect.any(Number),
        nome: 'Carla Mendes',
        turma: null,
        aguardandoPrimeiroAcesso: false,
      },
    ])
  })
})
