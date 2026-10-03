import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.ts'
import { parseId } from './comum.ts'

const turmaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(60),
  horario: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use o formato HH:MM')
    .nullish()
    .transform((v) => v ?? null),
})

export function turmasRouter() {
  const router = Router()

  router.get('/', async (_req, res) => {
    const turmas = await prisma.turma.findMany({
      orderBy: [{ horario: 'asc' }, { nome: 'asc' }],
      include: { _count: { select: { alunos: true } } },
    })
    res.json(turmas.map(({ _count, ...turma }) => ({ ...turma, totalAlunos: _count.alunos })))
  })

  router.post('/', async (req, res) => {
    const turma = await prisma.turma.create({ data: turmaSchema.parse(req.body) })
    res.status(201).json(turma)
  })

  router.put('/:id', async (req, res) => {
    const turma = await prisma.turma.update({
      where: { id: parseId(req.params.id) },
      data: turmaSchema.parse(req.body),
    })
    res.json(turma)
  })

  // Os alunos da turma removida ficam sem turma (não são apagados)
  router.delete('/:id', async (req, res) => {
    await prisma.turma.delete({ where: { id: parseId(req.params.id) } })
    res.status(204).end()
  })

  return router
}
