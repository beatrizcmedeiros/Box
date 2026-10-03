import { Router } from 'express'
import { prisma } from '../../lib/prisma.ts'
import { autenticar, exigirCadastroCompleto, exigirPerfil } from '../../middlewares/autenticacao.ts'
import { prsRouter } from './prs.ts'

export function alunoRouter() {
  const router = Router()

  router.use(autenticar, exigirCadastroCompleto, exigirPerfil('ALUNO'))
  router.use('/prs', prsRouter())

  /** Exercícios ativos, para o aluno escolher ao registrar um PR. */
  router.get('/exercicios', async (_req, res) => {
    const exercicios = await prisma.exercicio.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, categoria: true },
      orderBy: { nome: 'asc' },
    })
    res.json(exercicios)
  })

  return router
}
