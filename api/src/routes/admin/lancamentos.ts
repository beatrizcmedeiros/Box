import { Router } from 'express'
import { z } from 'zod'
import { dataDoTesteSchema, formatarData, paraData } from '../../lib/datas.ts'
import { ErroHttp, naoEncontrado } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { normalizarTexto } from '../../lib/texto.ts'
import { cargaKgSchema } from '../../lib/validacao.ts'
import { idSchema, parseId } from './comum.ts'

const filtrosSchema = z.object({
  exercicioId: idSchema,
  data: dataDoTesteSchema,
  turmaId: idSchema.optional(),
  busca: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || undefined),
})

const lancamentoSchema = z.object({
  dataTeste: dataDoTesteSchema,
  exercicioId: idSchema,
  resultados: z
    .array(z.object({ usuarioId: idSchema, cargaKg: cargaKgSchema }))
    .min(1, 'Informe a carga de pelo menos um aluno')
    .max(500),
})

/**
 * Tela "Teste de carga" do treinador: lança a carga máxima de vários alunos de uma vez
 * (por turma) ou de um aluno por vez, no dia do teste.
 */
export function lancamentosRouter() {
  const router = Router()

  /** Alunos ativos (por turma e/ou nome/apelido) com o PR atual e o lançamento do dia, se houver. */
  router.get('/', async (req, res) => {
    const { exercicioId, data, turmaId, busca } = filtrosSchema.parse(req.query)
    const dia = paraData(data)

    const alunos = await prisma.usuario.findMany({
      where: { perfil: 'ALUNO', ativo: true, turmaId },
      select: {
        id: true,
        nome: true,
        turma: { select: { id: true, nome: true } },
        apelidos: { select: { apelido: true } },
        testesCarga: {
          where: { exercicioId },
          select: { id: true, dataTeste: true, cargaKg: true, origem: true, criadoEm: true },
          orderBy: [{ dataTeste: 'desc' }, { criadoEm: 'desc' }, { id: 'desc' }],
        },
      },
      orderBy: { nome: 'asc' },
    })

    // Busca sem diferenciar acentos, pelo nome ou por um apelido do aluno
    const termo = busca ? normalizarTexto(busca) : null
    const filtrados = termo
      ? alunos.filter(
          (a) =>
            normalizarTexto(a.nome).includes(termo) ||
            a.apelidos.some((ap) => ap.apelido.includes(termo)),
        )
      : alunos

    res.json({
      alunos: filtrados.map((a) => {
        const doDia = a.testesCarga.filter((t) => t.dataTeste.getTime() === dia.getTime())
        // No dia, vale o lançamento do treinador; senão, o que existir (aluno ou importação)
        const lancamento = doDia.find((t) => t.origem === 'TREINADOR') ?? doDia[0] ?? null
        const anteriores = a.testesCarga.filter((t) => t.dataTeste.getTime() < dia.getTime())
        const vigente = anteriores[0] ?? null
        return {
          aluno: { id: a.id, nome: a.nome },
          turma: a.turma,
          prAtual: vigente && {
            cargaKg: vigente.cargaKg.toNumber(),
            dataTeste: formatarData(vigente.dataTeste),
          },
          melhorAnteriorKg: anteriores.length
            ? Math.max(...anteriores.map((t) => t.cargaKg.toNumber()))
            : null,
          lancamento: lancamento && {
            id: lancamento.id,
            cargaKg: lancamento.cargaKg.toNumber(),
            origem: lancamento.origem,
          },
        }
      }),
    })
  })

  /** Grava as cargas do dia. Lançar de novo o mesmo aluno/exercício/data corrige a carga. */
  router.post('/', async (req, res) => {
    const { dataTeste, exercicioId, resultados } = lancamentoSchema.parse(req.body)

    const ids = resultados.map((r) => r.usuarioId)
    if (new Set(ids).size !== ids.length)
      throw new ErroHttp(400, 'Há o mesmo aluno mais de uma vez na lista')

    const exercicio = await prisma.exercicio.findUnique({ where: { id: exercicioId } })
    if (!exercicio || !exercicio.ativo) throw new ErroHttp(400, 'Exercício não disponível')

    const alunos = await prisma.usuario.findMany({
      where: { id: { in: ids }, perfil: 'ALUNO', ativo: true },
      select: { id: true, nome: true },
    })
    if (alunos.length !== ids.length)
      throw new ErroHttp(400, 'Há alunos inválidos ou inativos na lista')
    const nomes = new Map(alunos.map((a) => [a.id, a.nome]))

    const dia = paraData(dataTeste)
    const resumo = await prisma.$transaction(async (tx) => {
      let criados = 0
      let atualizados = 0
      const novosRecordes: {
        usuarioId: number
        nome: string
        cargaKg: number
        anteriorKg: number
      }[] = []

      for (const { usuarioId, cargaKg } of resultados) {
        const existente = await tx.testeCarga.findFirst({
          where: { usuarioId, exercicioId, dataTeste: dia, origem: 'TREINADOR' },
        })
        if (existente) {
          await tx.testeCarga.update({ where: { id: existente.id }, data: { cargaKg } })
          atualizados++
        } else {
          await tx.testeCarga.create({
            data: { usuarioId, exercicioId, dataTeste: dia, cargaKg, origem: 'TREINADOR' },
          })
          criados++
        }

        const melhorAnterior = await tx.testeCarga.aggregate({
          where: { usuarioId, exercicioId, dataTeste: { lt: dia } },
          _max: { cargaKg: true },
        })
        const anterior = melhorAnterior._max.cargaKg?.toNumber()
        if (anterior !== undefined && cargaKg > anterior) {
          novosRecordes.push({
            usuarioId,
            nome: nomes.get(usuarioId)!,
            cargaKg,
            anteriorKg: anterior,
          })
        }
      }
      return { criados, atualizados, novosRecordes }
    })

    res.status(201).json(resumo)
  })

  /** Exclui um lançamento feito pelo treinador nesta tela (ex.: aluno errado). */
  router.delete('/:id', async (req, res) => {
    const teste = await prisma.testeCarga.findUnique({ where: { id: parseId(req.params.id) } })
    if (!teste) throw naoEncontrado('Lançamento')
    if (teste.origem !== 'TREINADOR') {
      throw new ErroHttp(
        409,
        teste.origem === 'ALUNO'
          ? 'Este resultado foi registrado pelo próprio aluno'
          : 'Este resultado veio de uma importação; use "Desfazer" em Importar cargas',
      )
    }
    await prisma.testeCarga.delete({ where: { id: teste.id } })
    res.status(204).end()
  })

  return router
}
