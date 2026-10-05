import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import { criarAppDeTeste, criarUsuario, limparBanco, logar, logarComoTreinador } from './apoio.ts'

const app = criarAppDeTeste()

beforeEach(limparBanco)

type Agente = Awaited<ReturnType<typeof logarComoTreinador>>

async function teste(
  usuarioId: number,
  exercicioId: number,
  data: string,
  cargaKg: number,
  origem: 'ALUNO' | 'IMPORTACAO' = 'IMPORTACAO',
) {
  await prisma.testeCarga.create({
    data: { usuarioId, exercicioId, dataTeste: new Date(`${data}T00:00:00Z`), cargaKg, origem },
  })
}

/** Cenário da Figura 4: Back Squat da turma 18h, mais dados de outras turmas e exercícios. */
async function cenario() {
  const t18 = await prisma.turma.create({ data: { nome: 'Turma 18h' } })
  const t07 = await prisma.turma.create({ data: { nome: 'Turma 07h' } })
  const backSquat = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
  const deadlift = await prisma.exercicio.create({ data: { nome: 'Deadlift' } })

  const bruno = await criarUsuario({ nome: 'Bruno Lima', email: 'bruno@t.com', turmaId: t18.id })
  const diego = await criarUsuario({ nome: 'Diego Rocha', email: 'diego@t.com', turmaId: t18.id })
  const joao = await criarUsuario({ nome: 'João Pereira', email: 'joao@t.com', turmaId: t18.id })
  const ana = await criarUsuario({ nome: 'Ana Souza', email: 'ana@t.com', turmaId: t18.id })
  const helena = await criarUsuario({
    nome: 'Helena Martins',
    email: 'helena@t.com',
    turmaId: t18.id,
  })
  const carla = await criarUsuario({ nome: 'Carla Mendes', email: 'carla@t.com', turmaId: t07.id })
  const inativo = await criarUsuario({
    nome: 'Fulano Inativo',
    email: 'fulano@t.com',
    turmaId: t18.id,
    ativo: false,
  })
  await prisma.alunoApelido.create({ data: { usuarioId: helena.id, apelido: 'lena' } })

  // Back Squat: setembro/2025 → março/2026
  for (const [aluno, antes, depois] of [
    [bruno, 120, 130],
    [diego, 120, 125],
    [joao, 97.5, 105],
    [ana, 75, 80],
    [helena, 75, 75],
  ] as const) {
    await teste(aluno.id, backSquat.id, '2025-09-12', antes)
    await teste(aluno.id, backSquat.id, '2026-03-15', depois)
  }
  await teste(carla.id, backSquat.id, '2026-03-15', 75) // outra turma, sem teste anterior
  await teste(inativo.id, backSquat.id, '2026-03-15', 200) // inativo: fica fora
  await teste(bruno.id, deadlift.id, '2026-03-15', 170, 'ALUNO')

  const treinador = await logarComoTreinador(app)
  return { t18, t07, backSquat, deadlift, bruno, joao, helena, carla, treinador }
}

const consultar = (agente: Agente, query = '') => agente.get(`/api/admin/cargas${query}`)
const nomes = (body: { resultados: { aluno: { nome: string } }[] }) =>
  body.resultados.map((r) => r.aluno.nome)

describe('GET /api/admin/cargas', () => {
  it('filtra por exercício e turma ao mesmo tempo, com totais e variação (Figura 4)', async () => {
    const { treinador, backSquat, t18 } = await cenario()

    const res = await consultar(treinador, `?exercicioId=${backSquat.id}&turmaId=${t18.id}`)

    expect(res.status).toBe(200)
    expect(
      res.body.resultados.map(
        (r: { aluno: { nome: string }; cargaKg: number; variacaoKg: number }) => [
          r.aluno.nome,
          r.cargaKg,
          r.variacaoKg,
        ],
      ),
    ).toEqual([
      ['Bruno Lima', 130, 10],
      ['Diego Rocha', 125, 5],
      ['João Pereira', 105, 7.5],
      ['Ana Souza', 80, 5],
      ['Helena Martins', 75, 0],
    ])
    expect(res.body.resultados[0]).toMatchObject({
      turma: { nome: 'Turma 18h' },
      exercicio: { nome: 'Back Squat' },
      dataTeste: '2026-03-15',
      origem: 'IMPORTACAO',
    })
    expect(res.body.totais).toEqual({ registros: 5, alunos: 5, maiorCargaKg: 130, mediaKg: 103 })
  })

  it('sem filtro de exercício, lista todos e não calcula média (exercícios diferentes)', async () => {
    const { treinador } = await cenario()
    const res = await consultar(treinador)

    expect(res.body.totais).toEqual({ registros: 7, alunos: 6, maiorCargaKg: 170, mediaKg: null })
    expect(res.body.resultados[0]).toMatchObject({
      aluno: { nome: 'Bruno Lima' },
      exercicio: { nome: 'Deadlift' },
      origem: 'ALUNO',
      variacaoKg: null,
    })
    expect(nomes(res.body)).not.toContain('Fulano Inativo')
  })

  it('busca pelo nome sem acento e pelo apelido', async () => {
    const { treinador } = await cenario()
    expect(nomes((await consultar(treinador, '?busca=joao')).body)).toEqual(['João Pereira'])
    expect(nomes((await consultar(treinador, '?busca=LENA')).body)).toEqual(['Helena Martins'])
    expect(nomes((await consultar(treinador, '?busca=100%25')).body)).toEqual([])
  })

  it('combina busca, exercício e turma', async () => {
    const { treinador, deadlift, t18 } = await cenario()
    const res = await consultar(
      treinador,
      `?busca=bru&exercicioId=${deadlift.id}&turmaId=${t18.id}`,
    )
    expect(res.body.resultados).toHaveLength(1)
    expect(res.body.resultados[0]).toMatchObject({ aluno: { nome: 'Bruno Lima' }, cargaKg: 170 })
  })

  it('ordena por aluno, data ou variação', async () => {
    const { treinador, backSquat } = await cenario()
    const ordem = async (q: string) =>
      nomes((await consultar(treinador, `?exercicioId=${backSquat.id}&${q}`)).body)

    expect(await ordem('ordenar=aluno&direcao=asc')).toEqual([
      'Ana Souza',
      'Bruno Lima',
      'Carla Mendes',
      'Diego Rocha',
      'Helena Martins',
      'João Pereira',
    ])
    // Carla não tem teste anterior: fica por último
    expect((await ordem('ordenar=variacao&direcao=desc')).slice(0, 2)).toEqual([
      'Bruno Lima',
      'João Pereira',
    ])
    expect((await ordem('ordenar=variacao&direcao=desc')).at(-1)).toBe('Carla Mendes')
  })

  it('pagina os resultados', async () => {
    const { treinador } = await cenario()
    const pagina1 = (await consultar(treinador, '?porPagina=3')).body
    const pagina3 = (await consultar(treinador, '?porPagina=3&pagina=3')).body

    expect(pagina1).toMatchObject({ pagina: 1, porPagina: 3, totalPaginas: 3 })
    expect(pagina1.resultados).toHaveLength(3)
    expect(pagina3.resultados).toHaveLength(1)
    expect(pagina3.totais.registros).toBe(7)
  })

  it('valida os parâmetros', async () => {
    const { treinador } = await cenario()
    expect((await consultar(treinador, '?ordenar=senha')).status).toBe(400)
    expect((await consultar(treinador, '?porPagina=1000')).status).toBe(400)
    expect((await consultar(treinador, '?exercicioId=abc')).status).toBe(400)
  })

  it('é exclusiva do treinador', async () => {
    await criarUsuario({ email: 'aluno@t.com' })
    const aluno = await logar(app, 'aluno@t.com')
    expect((await consultar(aluno)).status).toBe(403)
  })
})

describe('desempenho', () => {
  it('responde rápido com 1.000 registros de testes', async () => {
    const treinador = await logarComoTreinador(app)
    const turmas = await Promise.all(
      ['06h', '07h', '18h', '19h'].map((h) =>
        prisma.turma.create({ data: { nome: `Turma ${h}` } }),
      ),
    )
    const exercicios = await Promise.all(
      ['Back Squat', 'Front Squat', 'Deadlift', 'Clean', 'Snatch'].map((nome) =>
        prisma.exercicio.create({ data: { nome } }),
      ),
    )
    await prisma.usuario.createMany({
      data: Array.from({ length: 100 }, (_, i) => ({
        nome: `Aluno ${String(i).padStart(3, '0')}`,
        email: `aluno${i}@carga.com`,
        senhaHash: 'x',
        turmaId: turmas[i % 4].id,
      })),
    })
    const alunos = await prisma.usuario.findMany({ where: { email: { endsWith: '@carga.com' } } })
    // 100 alunos × 5 exercícios × 2 testes semestrais = 1.000 registros
    await prisma.testeCarga.createMany({
      data: alunos.flatMap((a, i) =>
        exercicios.flatMap((e, j) => [
          {
            usuarioId: a.id,
            exercicioId: e.id,
            dataTeste: new Date('2025-09-12'),
            cargaKg: 40 + ((i * 7 + j * 13) % 120),
          },
          {
            usuarioId: a.id,
            exercicioId: e.id,
            dataTeste: new Date('2026-03-15'),
            cargaKg: 45 + ((i * 11 + j * 5) % 120),
          },
        ]),
      ),
    })
    expect(await prisma.testeCarga.count()).toBe(1000)

    const combinacoes = [
      '',
      `?exercicioId=${exercicios[0].id}`,
      `?turmaId=${turmas[2].id}`,
      `?exercicioId=${exercicios[2].id}&turmaId=${turmas[1].id}`,
      `?busca=aluno 05&exercicioId=${exercicios[3].id}&turmaId=${turmas[3].id}&ordenar=variacao`,
    ]
    await consultar(treinador) // aquecimento (primeira consulta prepara o plano)

    const tempos: number[] = []
    for (const q of combinacoes) {
      const inicio = performance.now()
      const res = await consultar(treinador, q)
      tempos.push(performance.now() - inicio)
      expect(res.status).toBe(200)
    }

    console.log(
      `Consulta de cargas com 1.000 registros: ${tempos.map((t) => `${t.toFixed(0)} ms`).join(', ')}`,
    )
    // Meta do plano: < 500 ms por consulta
    expect(Math.max(...tempos)).toBeLessThan(500)
  })
})
