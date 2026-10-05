import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import { criarAppDeTeste, criarUsuario, limparBanco, logar, logarComoTreinador } from './apoio.ts'

const app = criarAppDeTeste()

beforeEach(limparBanco)

// Mesmo formato da nota real do treinador (nomes fictícios)
const LISTA = `Teste agachamento
Carla 55Kkg
Toninho 85
Ana 60 kg
Patricia Gomez 75kg
Fulano 1100 kg
`

async function cenario() {
  const t18 = await prisma.turma.create({ data: { nome: 'Turma 18h' } })
  const t07 = await prisma.turma.create({ data: { nome: 'Turma 07h' } })
  const carla = await criarUsuario({
    nome: 'Carla Mendes',
    email: 'carla@teste.com',
    turmaId: t18.id,
  })
  const antonio = await criarUsuario({
    nome: 'Antônio Pereira',
    email: 'antonio@teste.com',
    turmaId: t18.id,
  })
  const anaLima = await criarUsuario({
    nome: 'Ana Lima',
    email: 'ana.lima@teste.com',
    turmaId: t18.id,
  })
  const anaSouza = await criarUsuario({
    nome: 'Ana Souza',
    email: 'ana.souza@teste.com',
    turmaId: t07.id,
  })
  const patricia = await criarUsuario({
    nome: 'Patrícia Gomes',
    email: 'patricia@teste.com',
    turmaId: t18.id,
  })
  const backSquat = await prisma.exercicio.create({
    data: { nome: 'Back Squat', aliases: { create: [{ alias: 'agachamento livre' }] } },
  })
  const frontSquat = await prisma.exercicio.create({
    data: { nome: 'Front Squat', aliases: { create: [{ alias: 'agachamento frontal' }] } },
  })
  const treinador = await logarComoTreinador(app)
  return { t18, t07, carla, antonio, anaLima, anaSouza, patricia, backSquat, frontSquat, treinador }
}

describe('POST /api/admin/importacoes/previa', () => {
  it('interpreta a lista e associa os nomes aos alunos', async () => {
    const { treinador, carla, anaLima, patricia, t18, backSquat, frontSquat } = await cenario()

    const res = await treinador
      .post('/api/admin/importacoes/previa')
      .send({ texto: LISTA, turmaId: t18.id })

    expect(res.status).toBe(200)
    const [secao] = res.body.secoes
    expect(secao).toMatchObject({ titulo: 'Teste agachamento', tituloLimpo: 'agachamento' })
    // "agachamento" serve para dois exercícios: o treinador escolhe
    expect(secao.exercicio).toEqual({
      status: 'ambiguo',
      candidatos: [backSquat.id, frontSquat.id],
    })

    const [linhaCarla, linhaToninho, linhaAna, linhaPatricia, linhaFulano] = secao.linhas
    expect(linhaCarla).toMatchObject({
      nome: 'Carla',
      cargaKg: 55,
      aluno: { status: 'encontrado', aluno: { id: carla.id } },
    })
    expect(linhaToninho.aluno).toEqual({ status: 'nao_encontrado', candidatos: [] })
    // Duas "Ana", mas só uma na turma informada
    expect(linhaAna.aluno).toMatchObject({ status: 'encontrado', aluno: { id: anaLima.id } })
    expect(linhaPatricia.aluno).toMatchObject({ status: 'sugestao', aluno: { id: patricia.id } })
    expect(linhaFulano.problema).toContain('fora do intervalo')

    expect(res.body.resumo).toEqual({
      linhas: 5,
      encontrados: 2,
      sugestoes: 1,
      naoEncontrados: 2,
      comProblema: 1,
    })
    expect(res.body.alunos).toHaveLength(5)
    expect(res.body.exercicios.map((e: { nome: string }) => e.nome)).toEqual([
      'Back Squat',
      'Front Squat',
    ])
  })

  it('não grava nada', async () => {
    const { treinador } = await cenario()
    await treinador.post('/api/admin/importacoes/previa').send({ texto: LISTA })
    expect(await prisma.importacao.count()).toBe(0)
    expect(await prisma.testeCarga.count()).toBe(0)
  })

  it('avisa quando não há nenhum resultado no texto', async () => {
    const { treinador } = await cenario()
    const res = await treinador
      .post('/api/admin/importacoes/previa')
      .send({ texto: 'Teste agachamento\n\n' })
    expect(res.status).toBe(400)
    expect(res.body.erro).toContain('Nenhum resultado')
  })

  it('é exclusiva do treinador', async () => {
    await criarUsuario({ email: 'aluno@teste.com' })
    const aluno = await logar(app, 'aluno@teste.com')
    expect((await aluno.post('/api/admin/importacoes/previa').send({ texto: LISTA })).status).toBe(
      403,
    )
  })
})

describe('POST /api/admin/importacoes', () => {
  it('grava os resultados, aprende apelidos e o nome do exercício', async () => {
    const { treinador, carla, antonio, backSquat, t18 } = await cenario()

    const res = await treinador.post('/api/admin/importacoes').send({
      dataTeste: '2026-09-20',
      turmaId: t18.id,
      nomeArquivo: 'Notes_teste.pdf',
      resultados: [
        { usuarioId: carla.id, exercicioId: backSquat.id, cargaKg: 55, apelido: 'Carla' },
        { usuarioId: antonio.id, exercicioId: backSquat.id, cargaKg: 85, apelido: 'Toninho' },
      ],
      aliasesExercicio: [{ exercicioId: backSquat.id, alias: 'agachamento' }],
    })

    expect(res.status).toBe(201)
    // Apelido só é salvo quando difere do nome completo cadastrado ("carla" ≠ "carla mendes")
    expect(res.body).toMatchObject({
      criados: 2,
      atualizados: 0,
      apelidosSalvos: 2,
      aliasesSalvos: 1,
    })

    const testes = await prisma.testeCarga.findMany({ orderBy: { cargaKg: 'asc' } })
    expect(testes.map((t) => [t.usuarioId, t.cargaKg.toNumber(), t.origem])).toEqual([
      [carla.id, 55, 'IMPORTACAO'],
      [antonio.id, 85, 'IMPORTACAO'],
    ])

    // Na próxima prévia, "Toninho" e "agachamento" já são reconhecidos
    const previa = await treinador.post('/api/admin/importacoes/previa').send({ texto: LISTA })
    const [secao] = previa.body.secoes
    expect(secao.exercicio).toEqual({ status: 'encontrado', exercicioId: backSquat.id })
    expect(secao.linhas[1].aluno).toMatchObject({
      status: 'encontrado',
      aluno: { id: antonio.id },
      por: 'apelido',
    })
  })

  it('o aluno vê o resultado importado como PR, marcado como do treinador', async () => {
    const { treinador, carla, backSquat } = await cenario()
    await treinador.post('/api/admin/importacoes').send({
      dataTeste: '2026-09-20',
      resultados: [{ usuarioId: carla.id, exercicioId: backSquat.id, cargaKg: 55 }],
    })

    const aluna = await logar(app, 'carla@teste.com')
    const [pr] = (await aluna.get('/api/me/prs')).body
    expect(pr).toMatchObject({
      exercicio: { nome: 'Back Squat' },
      pr: { cargaKg: 55, origem: 'IMPORTACAO' },
    })
    expect(pr.percentuais[0]).toEqual({ percentual: 35, cargaKg: 19.5 })
  })

  it('reimportar a mesma data corrige a carga em vez de duplicar', async () => {
    const { treinador, carla, backSquat } = await cenario()
    const enviar = (cargaKg: number) =>
      treinador.post('/api/admin/importacoes').send({
        dataTeste: '2026-09-20',
        resultados: [{ usuarioId: carla.id, exercicioId: backSquat.id, cargaKg }],
      })

    await enviar(55)
    const segunda = await enviar(57.5)

    expect(segunda.body).toMatchObject({ criados: 0, atualizados: 1 })
    const testes = await prisma.testeCarga.findMany()
    expect(testes).toHaveLength(1)
    expect(testes[0].cargaKg.toNumber()).toBe(57.5)
  })

  it.each([
    [
      'aluno repetido no mesmo exercício',
      (c: Awaited<ReturnType<typeof cenario>>) => [
        { usuarioId: c.carla.id, exercicioId: c.backSquat.id, cargaKg: 55 },
        { usuarioId: c.carla.id, exercicioId: c.backSquat.id, cargaKg: 60 },
      ],
      'mesmo aluno',
    ],
    [
      'aluno inexistente',
      (c: Awaited<ReturnType<typeof cenario>>) => [
        { usuarioId: 9999, exercicioId: c.backSquat.id, cargaKg: 55 },
      ],
      'alunos inválidos',
    ],
    [
      'carga inválida',
      (c: Awaited<ReturnType<typeof cenario>>) => [
        { usuarioId: c.carla.id, exercicioId: c.backSquat.id, cargaKg: 0 },
      ],
      'Dados inválidos',
    ],
  ])('recusa %s', async (_caso, montar, mensagem) => {
    const c = await cenario()
    const res = await c.treinador
      .post('/api/admin/importacoes')
      .send({ dataTeste: '2026-09-20', resultados: montar(c) })
    expect(res.status).toBe(400)
    expect(res.body.erro).toContain(mensagem)
    expect(await prisma.importacao.count()).toBe(0)
  })

  it('não permite apelido que já é de outro aluno no cadastro manual', async () => {
    const { treinador, carla, antonio, backSquat } = await cenario()
    await treinador.post('/api/admin/importacoes').send({
      dataTeste: '2026-09-20',
      resultados: [
        { usuarioId: antonio.id, exercicioId: backSquat.id, cargaKg: 85, apelido: 'Toninho' },
      ],
    })

    const res = await treinador
      .put(`/api/admin/alunos/${carla.id}`)
      .send({ nome: 'Carla Mendes', email: 'carla@teste.com', apelidos: ['toninho'] })
    expect(res.status).toBe(409)
    expect(res.body.erro).toContain('Antônio Pereira')

    const lista = await treinador.get('/api/admin/alunos?busca=antonio')
    expect(lista.body[0].apelidos).toEqual(['toninho'])
  })
})

describe('histórico e desfazer', () => {
  it('lista as importações e desfaz removendo só os testes daquela importação', async () => {
    const { treinador, carla, antonio, backSquat, t18 } = await cenario()
    await prisma.testeCarga.create({
      data: {
        usuarioId: carla.id,
        exercicioId: backSquat.id,
        dataTeste: new Date('2026-03-15'),
        cargaKg: 50,
      },
    })
    const { body } = await treinador.post('/api/admin/importacoes').send({
      dataTeste: '2026-09-20',
      turmaId: t18.id,
      nomeArquivo: 'lista.pdf',
      resultados: [
        { usuarioId: carla.id, exercicioId: backSquat.id, cargaKg: 55 },
        { usuarioId: antonio.id, exercicioId: backSquat.id, cargaKg: 85 },
      ],
    })

    const lista = await treinador.get('/api/admin/importacoes')
    expect(lista.body[0]).toMatchObject({
      id: body.importacaoId,
      dataTeste: '2026-09-20',
      nomeArquivo: 'lista.pdf',
      status: 'CONFIRMADA',
      totalLinhas: 2,
      resultadosAtuais: 2,
      turma: { nome: 'Turma 18h' },
      treinador: 'Treinador',
    })

    const desfeita = await treinador.delete(`/api/admin/importacoes/${body.importacaoId}`)
    expect(desfeita.body).toEqual({ removidos: 2 })
    expect(await prisma.testeCarga.count()).toBe(1) // o lançamento do próprio aluno continua
    expect((await treinador.get('/api/admin/importacoes')).body[0].status).toBe('CANCELADA')
    expect((await treinador.delete(`/api/admin/importacoes/${body.importacaoId}`)).status).toBe(409)
  })
})
