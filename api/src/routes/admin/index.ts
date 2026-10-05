import { Router } from 'express'
import { autenticar, exigirCadastroCompleto, exigirPerfil } from '../../middlewares/autenticacao.ts'
import { alunosRouter } from './alunos.ts'
import { exerciciosRouter } from './exercicios.ts'
import { importacoesRouter } from './importacoes.ts'
import { turmasRouter } from './turmas.ts'

export function adminRouter() {
  const router = Router()

  router.use(autenticar, exigirCadastroCompleto, exigirPerfil('TREINADOR'))
  router.use('/turmas', turmasRouter())
  router.use('/exercicios', exerciciosRouter())
  router.use('/alunos', alunosRouter())
  router.use('/importacoes', importacoesRouter())

  return router
}
