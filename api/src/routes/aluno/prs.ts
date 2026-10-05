import { Router } from 'express'
import { z } from 'zod'
import { calcularPercentuais } from '../../domain/percentuais.ts'
import type { Exercicio, TesteCarga } from '../../generated/prisma/client.ts'
import { dataDoTesteSchema, formatarData, paraData } from '../../lib/datas.ts'
import { ErroHttp, naoEncontrado } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { cargaKgSchema } from '../../lib/validacao.ts'
import { parseId } from '../admin/comum.ts'

const novoPrSchema = z.object({
  exercicioId: z.coerce.number().int().positive('Escolha o exercício'),
  dataTeste: dataDoTesteSchema,
  cargaKg: cargaKgSchema,
})

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

/**
 * Resumo de um exercício: PR vigente, cargas por percentual e se o vigente é um
 * novo recorde (maior que todos os testes anteriores).
 */
function resumir([vigente, ...anteriores]: TesteComExercicio[]) {
  const cargaKg = vigente.cargaKg.toNumber()
  const melhorAnterior = Math.max(...anteriores.map((t) => t.cargaKg.toNumber()))
  return {
    exercicio: {
      id: vigente.exercicio.id,
      nome: vigente.exercicio.nome,
      categoria: vigente.exercicio.categoria,
    },
    pr: formatarTeste(vigente),
    percentuais: calcularPercentuais(cargaKg),
    novoRecorde: anteriores.length > 0 && cargaKg > melhorAnterior,
    diferencaKg: anteriores.length > 0 ? cargaKg - anteriores[0].cargaKg.toNumber() : null,
  }
}

export function prsRouter() {
  const router = Router()

  /** PR vigente de cada exercício, com as cargas de 35% a 55% já calculadas. */
  router.get('/', async (req, res) => {
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
      .map(resumir)
      .sort((a, b) => a.exercicio.nome.localeCompare(b.exercicio.nome, 'pt-BR'))
    res.json(resumos)
  })

  /** Detalhe de um exercício: resumo + histórico completo de testes. */
  router.get('/:exercicioId', async (req, res) => {
    const exercicioId = parseId(req.params.exercicioId)
    const testes = await prisma.testeCarga.findMany({
      where: { usuarioId: req.usuario!.id, exercicioId },
      include: { exercicio: true },
      orderBy: [...ordemVigente],
    })
    if (testes.length === 0) throw naoEncontrado('PR deste exercício')

    res.json({ ...resumir(testes), historico: testes.map(formatarTeste) })
  })

  router.post('/', async (req, res) => {
    const { exercicioId, dataTeste, cargaKg } = novoPrSchema.parse(req.body)

    const exercicio = await prisma.exercicio.findUnique({ where: { id: exercicioId } })
    if (!exercicio || !exercicio.ativo) throw new ErroHttp(400, 'Exercício não disponível')

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
