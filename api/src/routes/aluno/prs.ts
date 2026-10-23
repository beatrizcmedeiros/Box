import { Router } from 'express'
import { z } from 'zod'
import { calcularPercentuais } from '../../domain/percentuais.ts'
import type { Exercicio, TesteCarga } from '../../generated/prisma/client.ts'
import { dataDoTesteSchema, formatarData, paraData } from '../../lib/datas.ts'
import { ErroHttp, naoEncontrado } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { exerciciosDoAluno } from '../../services/contexto.ts'
import { type BaseDoPr, baseDoPrSchema, cargaKgSchema } from '../../lib/validacao.ts'
import { parseId } from '../admin/comum.ts'

const novoPrSchema = z.object({
  exercicioId: z.coerce.number().int().positive('Escolha o exercício'),
  dataTeste: dataDoTesteSchema,
  cargaKg: cargaKgSchema,
})

const edicaoSchema = z.object({ dataTeste: dataDoTesteSchema, cargaKg: cargaKgSchema })
const consultaSchema = z.object({ base: baseDoPrSchema })

type TesteComExercicio = TesteCarga & { exercicio: Exercicio }

function formatarTeste(teste: TesteCarga) {
  return {
    id: teste.id,
    dataTeste: formatarData(teste.dataTeste),
    cargaKg: teste.cargaKg.toNumber(),
    origem: teste.origem,
  }
}

// O PR vigente é o teste mais recente; em caso de mesma data, o último lançado
const ordemVigente = [{ dataTeste: 'desc' }, { criadoEm: 'desc' }, { id: 'desc' }] as const

/** Maior carga já registrada; no empate, o teste mais recente (a lista vem do mais novo). */
function maiorTeste(testes: TesteComExercicio[]) {
  return testes.reduce((maior, t) => (t.cargaKg.greaterThan(maior.cargaKg) ? t : maior))
}

/**
 * Resumo de um exercício: o PR usado nas porcentagens (o último teste ou o maior, conforme
 * a base escolhida), as cargas por percentual e se o último teste é um novo recorde.
 */
function resumir(testes: TesteComExercicio[], base: BaseDoPr) {
  const [ultimo, ...anteriores] = testes
  const pr = base === 'maior' ? maiorTeste(testes) : ultimo
  const ultimoKg = ultimo.cargaKg.toNumber()
  const melhorAnterior = Math.max(...anteriores.map((t) => t.cargaKg.toNumber()))
  return {
    exercicio: {
      id: ultimo.exercicio.id,
      nome: ultimo.exercicio.nome,
      categoria: ultimo.exercicio.categoria,
    },
    base,
    pr: formatarTeste(pr),
    percentuais: calcularPercentuais(pr.cargaKg.toNumber()),
    novoRecorde: anteriores.length > 0 && ultimoKg > melhorAnterior,
    diferencaKg: anteriores.length > 0 ? ultimoKg - anteriores[0].cargaKg.toNumber() : null,
  }
}

export function prsRouter() {
  const router = Router()

  /** PR de cada exercício (último ou maior), com as cargas de 35% a 55% já calculadas. */
  router.get('/', async (req, res) => {
    const { base } = consultaSchema.parse(req.query)
    const testes = await prisma.testeCarga.findMany({
      where: { usuarioId: req.usuario!.id },
      include: { exercicio: true },
      orderBy: [...ordemVigente],
    })

    const porExercicio = new Map<number, TesteComExercicio[]>()
    for (const teste of testes) {
      const lista = porExercicio.get(teste.exercicioId) ?? []
      lista.push(teste)
      porExercicio.set(teste.exercicioId, lista)
    }

    const resumos = [...porExercicio.values()]
      .map((lista) => resumir(lista, base))
      .sort((a, b) => a.exercicio.nome.localeCompare(b.exercicio.nome, 'pt-BR'))
    res.json(resumos)
  })

  /** Detalhe de um exercício: resumo + histórico completo de testes. */
  router.get('/:exercicioId', async (req, res) => {
    const exercicioId = parseId(req.params.exercicioId)
    const { base } = consultaSchema.parse(req.query)
    const testes = await prisma.testeCarga.findMany({
      where: { usuarioId: req.usuario!.id, exercicioId },
      include: { exercicio: true },
      orderBy: [...ordemVigente],
    })
    if (testes.length === 0) throw naoEncontrado('PR deste exercício')

    res.json({ ...resumir(testes, base), historico: testes.map(formatarTeste) })
  })

  router.post('/', async (req, res) => {
    const { exercicioId, dataTeste, cargaKg } = novoPrSchema.parse(req.body)

    // Só exercícios disponíveis para a pessoa: padrão, pessoais e os dos vínculos dela
    const exercicio = await prisma.exercicio.findFirst({
      where: { id: exercicioId, ativo: true, ...(await exerciciosDoAluno(req.usuario!.id)) },
    })
    if (!exercicio) throw new ErroHttp(400, 'Exercício não disponível')

    const teste = await prisma.testeCarga.create({
      data: {
        usuarioId: req.usuario!.id,
        exercicioId,
        dataTeste: paraData(dataTeste),
        cargaKg,
        origem: 'ALUNO',
      },
    })
    res.status(201).json(formatarTeste(teste))
  })

  /** O aluno corrige a data ou a carga de qualquer PR dele, inclusive os lançados pelo professor. */
  router.put('/lancamentos/:id', async (req, res) => {
    const id = parseId(req.params.id)
    const { dataTeste, cargaKg } = edicaoSchema.parse(req.body)
    const teste = await prisma.testeCarga.findFirst({ where: { id, usuarioId: req.usuario!.id } })
    if (!teste) throw naoEncontrado('Lançamento')
    const atualizado = await prisma.testeCarga.update({
      where: { id },
      data: { dataTeste: paraData(dataTeste), cargaKg },
    })
    res.json(formatarTeste(atualizado))
  })

  /** O aluno pode apagar um lançamento próprio feito por engano (não os importados pelo treinador). */
  router.delete('/lancamentos/:id', async (req, res) => {
    const id = parseId(req.params.id)
    const teste = await prisma.testeCarga.findFirst({ where: { id, usuarioId: req.usuario!.id } })
    if (!teste) throw naoEncontrado('Lançamento')
    if (teste.origem !== 'ALUNO') {
      throw new ErroHttp(403, 'Resultados importados pelo treinador só podem ser alterados por ele')
    }
    await prisma.testeCarga.delete({ where: { id } })
    res.status(204).end()
  })

  return router
}
