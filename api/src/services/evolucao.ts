import {
  type Ciclo,
  media,
  mediana,
  melhorPorCiclo,
  montarCiclos,
  serieDoExercicio,
  variacaoPercentual,
} from '../domain/evolucao.ts'
import { prisma } from '../lib/prisma.ts'
import { alunosDoContexto, type Contexto, vinculoDoContexto } from './contexto.ts'

const arredondar = (valor: number) => Math.round(valor * 10) / 10

/** Evolução de um aluno em cada exercício (aluno: própria; treinador: detalhe de um aluno). */
export async function evolucaoDoAluno(usuarioId: number) {
  const testes = await prisma.testeCarga.findMany({
    where: { usuarioId },
    select: {
      dataTeste: true,
      cargaKg: true,
      exercicio: { select: { id: true, nome: true, categoria: true } },
    },
  })

  const porExercicio = new Map<
    number,
    { exercicio: (typeof testes)[number]['exercicio']; pontos: { data: Date; cargaKg: number }[] }
  >()
  for (const t of testes) {
    const grupo = porExercicio.get(t.exercicio.id) ?? { exercicio: t.exercicio, pontos: [] }
    grupo.pontos.push({ data: t.dataTeste, cargaKg: t.cargaKg.toNumber() })
    porExercicio.set(t.exercicio.id, grupo)
  }

  return [...porExercicio.values()]
    .map(({ exercicio, pontos }) => ({ exercicio, ...serieDoExercicio(pontos) }))
    .sort((a, b) => a.exercicio.nome.localeCompare(b.exercicio.nome, 'pt-BR'))
}

type FiltrosTurma = { exercicioId?: number; turmaId?: number; localId?: number }

/**
 * Evolução por semana de teste (ciclo semestral) dos alunos do contexto: média por turma,
 * resumo do último ciclo × anterior e a evolução de cada aluno.
 */
export async function evolucaoDasTurmas(
  ctx: Contexto,
  { exercicioId, turmaId, localId }: FiltrosTurma,
) {
  const alunoAtivo = alunosDoContexto(ctx, { turmaId, localId })

  // Exercícios com dados (para o filtro); sem exercício escolhido, usa o mais testado
  const contagem = await prisma.testeCarga.groupBy({
    by: ['exercicioId'],
    where: { usuario: alunoAtivo },
    _count: { _all: true },
  })
  const exercicios = await prisma.exercicio.findMany({
    where: { id: { in: contagem.map((c) => c.exercicioId) } },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })
  const escolhido =
    exercicioId ??
    [...contagem].sort((a, b) => b._count._all - a._count._all || a.exercicioId - b.exercicioId)[0]
      ?.exercicioId

  const vazio = {
    exercicios,
    exercicio: null,
    ciclos: [] as Ciclo[],
    turmas: [],
    alunos: [],
    resumo: null,
  }
  if (!escolhido) return vazio
  const exercicio = await prisma.exercicio.findUnique({
    where: { id: escolhido },
    select: { id: true, nome: true },
  })
  if (!exercicio) return vazio

  const testes = await prisma.testeCarga.findMany({
    where: { exercicioId: escolhido, usuario: alunoAtivo },
    select: {
      dataTeste: true,
      cargaKg: true,
      usuario: {
        select: {
          id: true,
          nome: true,
          // A turma do aluno é a do vínculo com este contexto
          vinculosComoAluno: {
            where: vinculoDoContexto(ctx),
            select: { turma: { select: { id: true, nome: true } } },
          },
        },
      },
    },
  })

  const ciclos = montarCiclos(testes.map((t) => t.dataTeste))
  const chaves = ciclos.map((c) => c.chave)

  // Melhor carga de cada aluno em cada ciclo
  const porAluno = new Map<
    number,
    { usuario: (typeof testes)[number]['usuario']; pontos: { data: Date; cargaKg: number }[] }
  >()
  for (const t of testes) {
    const grupo = porAluno.get(t.usuario.id) ?? { usuario: t.usuario, pontos: [] }
    grupo.pontos.push({ data: t.dataTeste, cargaKg: t.cargaKg.toNumber() })
    porAluno.set(t.usuario.id, grupo)
  }

  const alunos = [...porAluno.values()].map(({ usuario, pontos }) => {
    const melhores = melhorPorCiclo(pontos)
    const comDados = chaves.filter((c) => melhores.has(c))
    const ultimo = comDados.at(-1) ?? null
    const anterior = comDados.at(-2) ?? null
    const ultimoKg = ultimo ? melhores.get(ultimo)! : null
    const anteriorKg = anterior ? melhores.get(anterior)! : null
    return {
      aluno: { id: usuario.id, nome: usuario.nome },
      turma: usuario.vinculosComoAluno[0]?.turma ?? null,
      porCiclo: Object.fromEntries(melhores),
      ultimoCiclo: ultimo,
      ultimoKg,
      anteriorKg,
      variacaoKg:
        ultimoKg !== null && anteriorKg !== null ? arredondar(ultimoKg - anteriorKg) : null,
      variacaoPct: variacaoPercentual(anteriorKg, ultimoKg),
    }
  })

  // Média por turma em cada ciclo (alunos sem turma formam o grupo "Sem turma")
  const gruposTurma = new Map<
    number | null,
    { turma: { id: number; nome: string } | null; alunos: typeof alunos }
  >()
  for (const a of alunos) {
    const id = a.turma?.id ?? null
    const grupo = gruposTurma.get(id) ?? { turma: a.turma, alunos: [] }
    grupo.alunos.push(a)
    gruposTurma.set(id, grupo)
  }
  const turmas = [...gruposTurma.values()]
    .sort((a, b) => (a.turma?.id ?? Infinity) - (b.turma?.id ?? Infinity))
    .map(({ turma, alunos: daTurma }) => ({
      turma,
      porCiclo: ciclos.map((c) => {
        const valores = daTurma.flatMap((a) =>
          a.porCiclo[c.chave] !== undefined ? [a.porCiclo[c.chave]] : [],
        )
        return { ciclo: c.chave, mediaKg: media(valores), alunos: valores.length }
      }),
    }))

  const cicloAtual = chaves.at(-1)!
  const cicloAnterior = chaves.at(-2) ?? null
  const valoresDo = (chave: string | null) =>
    chave ? alunos.flatMap((a) => (a.porCiclo[chave] !== undefined ? [a.porCiclo[chave]] : [])) : []
  const comparaveis = alunos.filter(
    (a) =>
      cicloAnterior &&
      a.porCiclo[cicloAtual] !== undefined &&
      a.porCiclo[cicloAnterior] !== undefined,
  )
  const deltas = comparaveis.map((a) => a.porCiclo[cicloAtual] - a.porCiclo[cicloAnterior!])
  const mediaAtual = media(valoresDo(cicloAtual))
  const mediaAnterior = media(valoresDo(cicloAnterior))

  return {
    exercicios,
    exercicio,
    ciclos,
    turmas,
    alunos: alunos.sort(
      (a, b) =>
        (b.variacaoKg ?? -Infinity) - (a.variacaoKg ?? -Infinity) ||
        a.aluno.nome.localeCompare(b.aluno.nome, 'pt-BR'),
    ),
    resumo: {
      cicloAtual,
      cicloAnterior,
      alunosAvaliados: valoresDo(cicloAtual).length,
      mediaAtualKg: mediaAtual,
      medianaAtualKg: mediana(valoresDo(cicloAtual)),
      mediaAnteriorKg: mediaAnterior,
      // Evolução média dos MESMOS alunos nos dois ciclos (não mistura quem entrou ou saiu)
      evolucaoMediaKg: media(deltas),
      evolucaoMediaPct: media(
        comparaveis.map((a) =>
          variacaoPercentual(a.porCiclo[cicloAnterior!], a.porCiclo[cicloAtual])!,
        ),
      ),
      comparaveis: comparaveis.length,
      evoluiram: deltas.filter((d) => d > 0).length,
      mantiveram: deltas.filter((d) => d === 0).length,
      cairam: deltas.filter((d) => d < 0).length,
    },
  }
}
