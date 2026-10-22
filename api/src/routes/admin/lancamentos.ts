import { Router } from 'express'
import { z } from 'zod'
import { dataDoTesteSchema, formatarData, paraData } from '../../lib/datas.ts'
import { ErroHttp, naoEncontrado } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { normalizarTexto } from '../../lib/texto.ts'
import { cargaKgSchema } from '../../lib/validacao.ts'
import {
  alunosDoContexto,
  type Contexto,
  exerciciosDoContexto,
  vinculoDoContexto,
} from '../../services/contexto.ts'
import { idSchema, parseId } from './comum.ts'

const filtrosSchema = z.object({
  exercicioId: idSchema,
  data: dataDoTesteSchema,
  turmaId: idSchema.optional(),
  localId: idSchema.optional(),
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

/** Lançamentos do treinador ficam marcados com a academia do contexto (ou nenhuma). */
const academiaDoContexto = (ctx: Contexto) => (ctx.tipo === 'academia' ? ctx.academiaId : null)

/**
 * Tela "Teste de carga": lança a carga máxima de vários alunos do contexto de uma vez
 * (por turma ou local) ou de um aluno por vez, no dia do teste.
 */
export function lancamentosRouter() {
  const router = Router()

  /** Alunos do contexto (por turma, local e/ou nome/apelido) com o PR atual e o lançamento do dia. */
  router.get('/', async (req, res) => {
    const ctx = req.contexto!
    const { exercicioId, data, turmaId, localId, busca } = filtrosSchema.parse(req.query)
    const dia = paraData(data)

    const alunos = await prisma.usuario.findMany({
      where: alunosDoContexto(ctx, { turmaId, localId }),
      select: {
        id: true,
        nome: true,
        vinculosComoAluno: {
          where: vinculoDoContexto(ctx),
          select: {
            turma: { select: { id: true, nome: true } },
            apelidos: { select: { apelido: true } },
          },
        },
        testesCarga: {
          where: { exercicioId },
          select: { id: true, dataTeste: true, cargaKg: true, origem: true, criadoEm: true },
          orderBy: [{ dataTeste: 'desc' }, { criadoEm: 'desc' }, { id: 'desc' }],
        },
      },
      orderBy: { nome: 'asc' },
    })

    // Busca sem diferenciar acentos, pelo nome ou por um apelido do aluno neste contexto
    const termo = busca ? normalizarTexto(busca) : null
    const filtrados = termo
      ? alunos.filter(
          (a) =>
            normalizarTexto(a.nome).includes(termo) ||
            a.vinculosComoAluno[0]?.apelidos.some((ap) => ap.apelido.includes(termo)),
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
          turma: a.vinculosComoAluno[0]?.turma ?? null,
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
    const ctx = req.contexto!
    const { dataTeste, exercicioId, resultados } = lancamentoSchema.parse(req.body)

    const ids = resultados.map((r) => r.usuarioId)
    if (new Set(ids).size !== ids.length)
      throw new ErroHttp(400, 'Há o mesmo aluno mais de uma vez na lista')

    const exercicio = await prisma.exercicio.findFirst({
      where: { id: exercicioId, ativo: true, ...exerciciosDoContexto(ctx) },
    })
    if (!exercicio) throw new ErroHttp(400, 'Exercício não disponível')

    const alunos = await prisma.usuario.findMany({
      where: { id: { in: ids }, ...alunosDoContexto(ctx) },
      select: { id: true, nome: true },
    })
    if (alunos.length !== ids.length)
      throw new ErroHttp(400, 'Há alunos inválidos, inativos ou sem vínculo na lista')
    const nomes = new Map(alunos.map((a) => [a.id, a.nome]))

    const dia = paraData(dataTeste)
    const lancadoPorId = req.usuario!.id
    const academiaId = academiaDoContexto(ctx)
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
          await tx.testeCarga.update({
            where: { id: existente.id },
            data: { cargaKg, lancadoPorId, academiaId },
          })
          atualizados++
        } else {
          await tx.testeCarga.create({
            data: {
              usuarioId,
              exercicioId,
              dataTeste: dia,
              cargaKg,
              origem: 'TREINADOR',
              lancadoPorId,
              academiaId,
            },
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

  /** Exclui um lançamento feito nesta tela (ex.: aluno errado) por este contexto. */
  router.delete('/:id', async (req, res) => {
    const ctx = req.contexto!
    const teste = await prisma.testeCarga.findFirst({
      where: { id: parseId(req.params.id), usuario: alunosDoContexto(ctx) },
    })
    if (!teste) throw naoEncontrado('Lançamento')
    if (teste.origem !== 'TREINADOR') {
      throw new ErroHttp(
        409,
        teste.origem === 'ALUNO'
          ? 'Este resultado foi registrado pelo próprio aluno'
          : 'Este resultado veio de uma importação; use "Desfazer" em Importar cargas',
      )
    }
    // Só quem lançou desfaz: a academia (e seus professores) ou o professor em "Meus alunos"
    const doContexto =
      ctx.tipo === 'academia'
        ? teste.academiaId === ctx.academiaId
        : teste.academiaId === null && teste.lancadoPorId === ctx.professorId
    if (!doContexto) {
      throw new ErroHttp(409, 'Este resultado foi lançado em outra academia ou por outro professor')
    }
    await prisma.testeCarga.delete({ where: { id: teste.id } })
    res.status(204).end()
  })

  return router
}
