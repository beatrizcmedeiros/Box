import { Router } from 'express'
import { z } from 'zod'
import { CategoriaExercicio } from '../../generated/prisma/client.ts'
import { ErroHttp } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { normalizarTexto } from '../../lib/texto.ts'
import { parseId } from './comum.ts'

const exercicioSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(60),
  categoria: z.enum(CategoriaExercicio),
  ativo: z.boolean().default(true),
  // Nomes alternativos usados no PDF do treinador; guardados normalizados e sem repetição
  aliases: z
    .array(z.string().max(60))
    .default([])
    .transform((lista) => [...new Set(lista.map(normalizarTexto).filter(Boolean))]),
})

const incluirAliases = { aliases: { select: { alias: true }, orderBy: { alias: 'asc' } } } as const

type ExercicioComAliases = {
  id: number
  nome: string
  categoria: CategoriaExercicio
  ativo: boolean
  aliases: { alias: string }[]
}

const formatar = ({ aliases, ...exercicio }: ExercicioComAliases) => ({
  ...exercicio,
  aliases: aliases.map((a) => a.alias),
})

async function validarAliases(aliases: string[], nome: string, exercicioId?: number) {
  const nomeNormalizado = normalizarTexto(nome)
  const conflitos = await prisma.exercicioAlias.findMany({
    where: { alias: { in: aliases }, NOT: exercicioId ? { exercicioId } : undefined },
    include: { exercicio: { select: { nome: true } } },
  })
  if (conflitos.length > 0) {
    const { alias, exercicio } = conflitos[0]
    throw new ErroHttp(409, `O nome alternativo "${alias}" já pertence a ${exercicio.nome}`)
  }
  return aliases.filter((a) => a !== nomeNormalizado)
}

export function exerciciosRouter() {
  const router = Router()

  router.get('/', async (_req, res) => {
    const exercicios = await prisma.exercicio.findMany({
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
      include: incluirAliases,
    })
    res.json(exercicios.map(formatar))
  })

  router.post('/', async (req, res) => {
    const { aliases, ...dados } = exercicioSchema.parse(req.body)
    const aliasesValidos = await validarAliases(aliases, dados.nome)
    const exercicio = await prisma.exercicio.create({
      data: { ...dados, aliases: { create: aliasesValidos.map((alias) => ({ alias })) } },
      include: incluirAliases,
    })
    res.status(201).json(formatar(exercicio))
  })

  router.put('/:id', async (req, res) => {
    const id = parseId(req.params.id)
    const { aliases, ...dados } = exercicioSchema.parse(req.body)
    const aliasesValidos = await validarAliases(aliases, dados.nome, id)

    const exercicio = await prisma.$transaction(async (tx) => {
      await tx.exercicio.update({ where: { id }, data: dados })
      await tx.exercicioAlias.deleteMany({ where: { exercicioId: id } })
      await tx.exercicioAlias.createMany({
        data: aliasesValidos.map((alias) => ({ alias, exercicioId: id })),
      })
      return tx.exercicio.findUniqueOrThrow({ where: { id }, include: incluirAliases })
    })
    res.json(formatar(exercicio))
  })

  // Só é possível excluir exercícios sem testes de carga; os demais devem ser desativados
  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params.id)
    const testes = await prisma.testeCarga.count({ where: { exercicioId: id } })
    if (testes > 0) {
      throw new ErroHttp(
        409,
        'Este exercício já possui testes de carga registrados. Desative-o em vez de excluir.',
      )
    }
    await prisma.exercicio.delete({ where: { id } })
    res.status(204).end()
  })

  return router
}
