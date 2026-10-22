import { Router } from 'express'
import { z } from 'zod'
import { CategoriaExercicio } from '../../generated/prisma/client.ts'
import { ErroHttp, naoEncontrado } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { normalizarTexto } from '../../lib/texto.ts'
import {
  aliasesDoContexto,
  type Contexto,
  donoDoAlias,
  donoDoExercicio,
  exerciciosDoContexto,
} from '../../services/contexto.ts'
import { parseId } from './comum.ts'

// Nomes alternativos usados na lista do teste; guardados normalizados e sem repetição
const aliasesSchema = z
  .array(z.string().max(60))
  .default([])
  .transform((lista) => [...new Set(lista.map(normalizarTexto).filter(Boolean))])

const exercicioSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(60),
  categoria: z.enum(CategoriaExercicio),
  ativo: z.boolean().default(true),
  aliases: aliasesSchema,
})

/** Exercício do contexto com os nomes alternativos visíveis nele. */
async function carregar(ctx: Contexto, ids?: number[]) {
  const exercicios = await prisma.exercicio.findMany({
    where: { ...exerciciosDoContexto(ctx), ...(ids ? { id: { in: ids } } : {}) },
    include: {
      aliases: {
        where: aliasesDoContexto(ctx),
        select: { alias: true },
        orderBy: { alias: 'asc' },
      },
    },
    orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
  })
  return exercicios.map(({ aliases, academiaId: _a, donoId: _d, ...e }) => ({
    ...e,
    aliases: aliases.map((a) => a.alias),
    // A lista padrão vem com o app: só os nomes alternativos podem ser acrescentados
    editavel: e.escopo !== 'PADRAO',
  }))
}

/**
 * Exercícios do contexto: a lista padrão (somente leitura) e os criados pela academia
 * ou pelo professor. Os nomes alternativos gravados aqui valem só neste contexto.
 */
export function exerciciosRouter() {
  const router = Router()

  router.get('/', async (req, res) => {
    res.json(await carregar(req.contexto!))
  })

  router.post('/', async (req, res) => {
    const ctx = req.contexto!
    const { aliases, ...dados } = exercicioSchema.parse(req.body)
    await validarNomeLivre(ctx, dados.nome)
    const exercicio = await prisma.$transaction(async (tx) => {
      const criado = await tx.exercicio.create({ data: { ...dados, ...donoDoExercicio(ctx) } })
      await salvarAliases(tx, ctx, criado.id, criado.nome, aliases)
      return criado
    })
    res.status(201).json((await carregar(ctx, [exercicio.id]))[0])
  })

  router.put('/:id', async (req, res) => {
    const ctx = req.contexto!
    const atual = await buscarProprio(ctx, parseId(req.params.id))
    const { aliases, ...dados } = exercicioSchema.parse(req.body)
    await validarNomeLivre(ctx, dados.nome, atual.id)
    await prisma.$transaction(async (tx) => {
      await tx.exercicio.update({ where: { id: atual.id }, data: dados })
      await salvarAliases(tx, ctx, atual.id, dados.nome, aliases)
    })
    res.json((await carregar(ctx, [atual.id]))[0])
  })

  /** Nomes alternativos do contexto para qualquer exercício visível (inclusive os padrão). */
  router.put('/:id/aliases', async (req, res) => {
    const ctx = req.contexto!
    const [exercicio] = await carregar(ctx, [parseId(req.params.id)])
    if (!exercicio) throw naoEncontrado('Exercício')
    const aliases = aliasesSchema.parse(req.body?.aliases)
    await prisma.$transaction((tx) => salvarAliases(tx, ctx, exercicio.id, exercicio.nome, aliases))
    res.json((await carregar(ctx, [exercicio.id]))[0])
  })

  // Só é possível excluir exercícios sem testes de carga; os demais devem ser desativados
  router.delete('/:id', async (req, res) => {
    const exercicio = await buscarProprio(req.contexto!, parseId(req.params.id))
    const testes = await prisma.testeCarga.count({ where: { exercicioId: exercicio.id } })
    if (testes > 0) {
      throw new ErroHttp(
        409,
        'Este exercício já possui testes de carga registrados. Desative-o em vez de excluir.',
      )
    }
    await prisma.exercicio.delete({ where: { id: exercicio.id } })
    res.status(204).end()
  })

  return router
}

/** Exercício criado pelo contexto (a lista padrão não pode ser alterada). */
async function buscarProprio(ctx: Contexto, id: number) {
  const exercicio = await prisma.exercicio.findFirst({ where: { id, ...donoDoExercicio(ctx) } })
  if (exercicio) return exercicio
  const padrao = await prisma.exercicio.findFirst({ where: { id, escopo: 'PADRAO' } })
  if (padrao) throw new ErroHttp(403, 'Os exercícios da lista padrão não podem ser alterados')
  throw naoEncontrado('Exercício')
}

/** O nome não pode repetir um da lista padrão nem outro do próprio contexto. */
async function validarNomeLivre(ctx: Contexto, nome: string, ignorarId?: number) {
  const existente = await prisma.exercicio.findFirst({
    where: {
      ...exerciciosDoContexto(ctx),
      nome: { equals: nome, mode: 'insensitive' },
      NOT: ignorarId ? { id: ignorarId } : undefined,
    },
  })
  if (existente) throw new ErroHttp(409, `Já existe o exercício "${existente.nome}"`)
}

type Transacao = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/** Substitui os nomes alternativos do contexto para o exercício. */
export async function salvarAliases(
  tx: Transacao,
  ctx: Contexto,
  exercicioId: number,
  nome: string,
  aliases: string[],
) {
  const validos = aliases.filter((a) => a !== normalizarTexto(nome))
  if (validos.length > 0) {
    const conflito = await tx.exercicioAlias.findFirst({
      where: { ...aliasesDoContexto(ctx), alias: { in: validos }, NOT: { exercicioId } },
      include: { exercicio: { select: { nome: true } } },
    })
    if (conflito) {
      throw new ErroHttp(
        409,
        `O nome alternativo "${conflito.alias}" já pertence a ${conflito.exercicio.nome}`,
      )
    }
  }
  await tx.exercicioAlias.deleteMany({ where: { exercicioId, ...donoDoAlias(ctx) } })
  // Os da lista padrão já valem para todos: não precisam ser gravados de novo no contexto
  const padrao = await tx.exercicioAlias.findMany({
    where: { exercicioId, academiaId: null, professorId: null },
    select: { alias: true },
  })
  const jaExistem = new Set(padrao.map((p) => p.alias))
  await tx.exercicioAlias.createMany({
    data: validos
      .filter((alias) => !jaExistem.has(alias))
      .map((alias) => ({ alias, exercicioId, ...donoDoAlias(ctx) })),
  })
}
