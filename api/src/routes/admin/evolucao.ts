import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.ts'
import { vinculoDoAluno } from '../../services/contexto.ts'
import { evolucaoDasTurmas, evolucaoDoAluno } from '../../services/evolucao.ts'
import { idSchema, parseId } from './comum.ts'

const filtrosSchema = z.object({
  exercicioId: idSchema.optional(),
  turmaId: idSchema.optional(),
  localId: idSchema.optional(),
})

export function evolucaoRouter() {
  const router = Router()

  /** Evolução por semana de teste: média por turma, resumo e evolução de cada aluno. */
  router.get('/', async (req, res) => {
    res.json(await evolucaoDasTurmas(req.contexto!, filtrosSchema.parse(req.query)))
  })

  /** Detalhe: evolução de um aluno em todos os exercícios. */
  router.get('/alunos/:id', async (req, res) => {
    // Só alunos vinculados ao contexto; a turma é a deste vínculo
    const vinculo = await vinculoDoAluno(req.contexto!, parseId(req.params.id))
    const { aluno, turma } = await prisma.vinculoAluno.findUniqueOrThrow({
      where: { id: vinculo.id },
      select: {
        aluno: { select: { id: true, nome: true } },
        turma: { select: { id: true, nome: true } },
      },
    })
    res.json({ aluno: { ...aluno, turma }, exercicios: await evolucaoDoAluno(aluno.id) })
  })

  return router
}
