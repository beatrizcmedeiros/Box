import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import {
  admin,
  criarAppDeTeste,
  criarTurma,
  criarUsuario,
  limparBanco,
  logar,
  logarComoTreinador,
} from './apoio.ts'

const app = criarAppDeTeste()

beforeEach(limparBanco)

describe('controle de acesso', () => {
  it('exige autenticação', async () => {
    expect((await request(app).get('/api/c/1/alunos')).status).toBe(401)
  })

  it('bloqueia o perfil aluno', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const aluno = await logar(app, 'ana@teste.com')

    for (const rota of [admin('/turmas'), admin('/exercicios'), admin('/alunos')]) {
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
      .post(admin('/turmas'))
      .send({ nome: 'Turma 18h', horario: '18:00' })
    expect(criada.status).toBe(201)

    const id = criada.body.id
    const editada = await treinador
      .put(admin(`/turmas/${id}`))
      .send({ nome: 'Turma 18h30', horario: '18:30' })
    expect(editada.body).toMatchObject({ nome: 'Turma 18h30', horario: '18:30' })

    const lista = await treinador.get(admin('/turmas'))
    expect(lista.body).toEqual([expect.objectContaining({ id, totalAlunos: 0 })])

    expect((await treinador.delete(admin(`/turmas/${id}`))).status).toBe(204)
    expect((await treinador.delete(admin(`/turmas/${id}`))).status).toBe(404)
  })

  it('valida horário e nome repetido', async () => {
    const treinador = await logarComoTreinador(app)
    expect(
      (await treinador.post(admin('/turmas')).send({ nome: 'A', horario: '25:00' })).status,
    ).toBe(400)

    await treinador.post(admin('/turmas')).send({ nome: 'Turma 06h' })
    expect((await treinador.post(admin('/turmas')).send({ nome: 'Turma 06h' })).status).toBe(409)
  })

  it('ao remover a turma, os alunos ficam sem turma', async () => {
    const treinador = await logarComoTreinador(app)
    const turma = await criarTurma('Turma 07h')
    const aluno = await criarUsuario({ email: 'ana@teste.com', turmaId: turma.id })

    await treinador.delete(admin(`/turmas/${turma.id}`))

    // O aluno continua vinculado à academia, só sem turma
    const vinculo = await prisma.vinculoAluno.findFirstOrThrow({ where: { alunoId: aluno.id } })
    expect(vinculo.turmaId).toBeNull()
  })
})

describe('exercícios', () => {
  it('normaliza os nomes alternativos e ignora o igual ao nome', async () => {
    const treinador = await logarComoTreinador(app)
    const res = await treinador.post(admin('/exercicios')).send({
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
      .post(admin('/exercicios'))
      .send({ nome: 'Deadlift', categoria: 'LEVANTAMENTO', aliases: ['terra'] })

    const res = await treinador
      .post(admin('/exercicios'))
      .send({ nome: 'Sumo Deadlift', categoria: 'LEVANTAMENTO', aliases: ['Terra'] })
    expect(res.status).toBe(409)
    expect(res.body.erro).toContain('Deadlift')
  })

  it('edita substituindo os nomes alternativos e pode desativar', async () => {
    const treinador = await logarComoTreinador(app)
    const { body } = await treinador
      .post(admin('/exercicios'))
      .send({ nome: 'Snatch', categoria: 'OLIMPICO', aliases: ['arranco'] })

    const res = await treinador
      .put(admin(`/exercicios/${body.id}`))
      .send({ nome: 'Snatch', categoria: 'OLIMPICO', ativo: false, aliases: ['power snatch'] })
    expect(res.body).toMatchObject({ ativo: false, aliases: ['power snatch'] })
  })

  it('só exclui exercício sem testes de carga; a lista padrão não pode ser alterada', async () => {
    const treinador = await logarComoTreinador(app)
    const aluno = await criarUsuario({ email: 'ana@teste.com' })
    const padrao = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
    const criar = async (nome: string) =>
      (await treinador.post(admin('/exercicios')).send({ nome, categoria: 'OLIMPICO' })).body
    const comTeste = await criar('Clean')
    const semTeste = await criar('Snatch')
    expect((await treinador.delete(admin(`/exercicios/${padrao.id}`))).status).toBe(403)
    await prisma.testeCarga.create({
      data: { usuarioId: aluno.id, exercicioId: comTeste.id, dataTeste: new Date(), cargaKg: 70 },
    })

    const bloqueado = await treinador.delete(admin(`/exercicios/${comTeste.id}`))
    expect(bloqueado.status).toBe(409)
    expect(bloqueado.body.erro).toContain('Desative')

    expect((await treinador.delete(admin(`/exercicios/${semTeste.id}`))).status).toBe(204)
  })
})

describe('alunos do contexto', () => {
  it('lista só os alunos ativos vinculados, com filtros por busca e turma', async () => {
    const treinador = await logarComoTreinador(app)
    const t18 = await criarTurma('Turma 18h')
    await criarUsuario({ nome: 'Ana Souza', email: 'ana@teste.com', turmaId: t18.id })
    await criarUsuario({ nome: 'Bruno Lima', email: 'bruno@teste.com' })
    await criarUsuario({ nome: 'Carla Mendes', email: 'carla@teste.com', ativo: false })
    await criarUsuario({ nome: 'Sem Vínculo', email: 'livre@teste.com', vinculado: false })
    await criarUsuario({ nome: 'Outro Professor', email: 'prof@teste.com', perfil: 'TREINADOR' })

    const nomes = async (query: string) =>
      (await treinador.get(admin(`/alunos${query}`))).body.map((a: { nome: string }) => a.nome)

    expect(await nomes('')).toEqual(['Ana Souza', 'Bruno Lima'])
    expect(await nomes('?busca=souz')).toEqual(['Ana Souza'])
    expect(await nomes(`?turmaId=${t18.id}`)).toEqual(['Ana Souza'])
  })

  it('organiza o aluno: turma e apelidos valem só neste vínculo', async () => {
    const treinador = await logarComoTreinador(app)
    const t18 = await criarTurma('Turma 18h')
    const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@teste.com' })
    const bia = await criarUsuario({ nome: 'Beatriz Lima', email: 'bia@teste.com' })

    const res = await treinador
      .put(admin(`/alunos/${ana.id}`))
      .send({ turmaId: t18.id, apelidos: ['Aninha', ' aninha '] })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      nome: 'Ana Souza',
      turma: { id: t18.id, nome: 'Turma 18h' },
      apelidos: ['aninha'],
    })

    // O mesmo apelido não pode apontar para duas alunas do mesmo contexto
    const repetido = await treinador.put(admin(`/alunos/${bia.id}`)).send({ apelidos: ['aninha'] })
    expect(repetido.status).toBe(409)
  })

  it('não aceita turma de outra academia', async () => {
    const treinador = await logarComoTreinador(app)
    const ana = await criarUsuario({ email: 'ana@teste.com' })
    const outraConta = await criarUsuario({ email: 'box2@teste.com', vinculado: false })
    const outra = await prisma.academia.create({ data: { nome: 'Box 2', contaId: outraConta.id } })
    const turmaAlheia = await prisma.turma.create({ data: { nome: 'T', academiaId: outra.id } })

    const res = await treinador.put(admin(`/alunos/${ana.id}`)).send({ turmaId: turmaAlheia.id })
    expect(res.status).toBe(404)
  })

  it('desvincular mantém a conta e os PRs do aluno, mas o contexto deixa de vê-lo', async () => {
    const treinador = await logarComoTreinador(app)
    const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@teste.com' })
    const exercicio = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
    await prisma.testeCarga.create({
      data: { usuarioId: ana.id, exercicioId: exercicio.id, dataTeste: new Date(), cargaKg: 80 },
    })

    expect((await treinador.delete(admin(`/alunos/${ana.id}`))).status).toBe(204)
    expect(await prisma.usuario.findUnique({ where: { id: ana.id } })).not.toBeNull()
    expect(await prisma.testeCarga.count({ where: { usuarioId: ana.id } })).toBe(1)
    expect((await treinador.get(admin('/alunos'))).body).toEqual([])
    expect((await treinador.get(admin('/cargas'))).body.resultados).toEqual([])
  })
})

describe('visão geral (indicadores do piloto)', () => {
  it('conta adesão dos alunos ativos e lista quem ainda não tem PR', async () => {
    const treinador = await logarComoTreinador(app)
    const turma = await criarTurma('Turma 18h')
    const exercicio = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
    const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@t.com', turmaId: turma.id })
    await criarUsuario({
      nome: 'Bruno Lima',
      email: 'bruno@t.com',
      emailConfirmado: false,
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

    const res = await treinador.get(admin('/visao-geral'))

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
