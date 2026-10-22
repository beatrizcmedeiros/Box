import { Router } from 'express'
import { autenticar, exigirCadastroCompleto, exigirPerfil } from '../../middlewares/autenticacao.ts'
import { alunosRouter } from './alunos.ts'
import { cargasRouter } from './cargas.ts'
import { evolucaoRouter } from './evolucao.ts'
import { exerciciosRouter } from './exercicios.ts'
import { importacoesRouter } from './importacoes.ts'
import { lancamentosRouter } from './lancamentos.ts'
import { percentuaisRouter } from './percentuais.ts'
import { turmasRouter } from './turmas.ts'
import { visaoGeralRouter } from './visaoGeral.ts'

export function adminRouter() {
  const router = Router()

  router.use(autenticar, exigirCadastroCompleto, exigirPerfil('TREINADOR'))
  router.use('/turmas', turmasRouter())
  router.use('/exercicios', exerciciosRouter())
  router.use('/alunos', alunosRouter())
  router.use('/importacoes', importacoesRouter())
  router.use('/cargas', cargasRouter())
  router.use('/visao-geral', visaoGeralRouter())
  router.use('/evolucao', evolucaoRouter())
  router.use('/lancamentos', lancamentosRouter())
  router.use('/percentuais', percentuaisRouter())

  return router
}
