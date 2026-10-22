import { Router } from 'express'
import { z } from 'zod'
import { naoEncontrado } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { evolucaoDasTurmas, evolucaoDoAluno } from '../../services/evolucao.ts'
import { idSchema, parseId } from './comum.ts'

const filtrosSchema = z.object({
  exercicioId: idSchema.optional(),
  turmaId: idSchema.optional(),
})

export function evolucaoRouter() {
  const router = Router()

  /** Evolução por semana de teste: média por turma, resumo e evolução de cada aluno. */
  router.get('/', async (req, res) => {
    res.json(await evolucaoDasTurmas(filtrosSchema.parse(req.query)))
  })

  /** Detalhe: evolução de um aluno em todos os exercícios. */
  router.get('/alunos/:id', async (req, res) => {
    const aluno = await prisma.usuario.findFirst({
      where: { id: parseId(req.params.id), perfil: 'ALUNO' },
      select: { id: true, nome: true, turma: { select: { id: true, nome: true } } },
    })
    if (!aluno) throw naoEncontrado('Aluno')
    res.json({ aluno, exercicios: await evolucaoDoAluno(aluno.id) })
  })

  return router
}
