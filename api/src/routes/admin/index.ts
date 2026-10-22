import { Router } from 'express'
import { prisma } from '../../lib/prisma.ts'
import { autenticar, exigirCadastroCompleto } from '../../middlewares/autenticacao.ts'
import { comContexto, contextosDoUsuario } from '../../services/contexto.ts'
import { alunosRouter } from './alunos.ts'
import { cargasRouter } from './cargas.ts'
import { evolucaoRouter } from './evolucao.ts'
import { exerciciosRouter } from './exercicios.ts'
import { importacoesRouter } from './importacoes.ts'
import { lancamentosRouter } from './lancamentos.ts'
import { percentuaisRouter } from './percentuais.ts'
import { turmasRouter } from './turmas.ts'
import { visaoGeralRouter } from './visaoGeral.ts'

/** GET /api/contextos: onde o professor ou a academia pode trabalhar (seletor do app e da web). */
export function contextosRouter() {
  const router = Router()
  router.get('/', autenticar, exigirCadastroCompleto, async (req, res) => {
    res.json(await contextosDoUsuario(req.usuario!))
  })
  return router
}

/**
 * Telas de gestão em /api/c/:contexto, onde o contexto é o id de uma academia ou
 * "pessoal" ("Meus alunos" do professor). Tudo aqui vê só os alunos vinculados ao contexto.
 */
export function contextoRouter() {
  const router = Router({ mergeParams: true })

  router.use(autenticar, exigirCadastroCompleto, comContexto)
  router.use('/turmas', turmasRouter())
  router.use('/exercicios', exerciciosRouter())
  router.use('/alunos', alunosRouter())
  router.use('/importacoes', importacoesRouter())
  router.use('/cargas', cargasRouter())
  router.use('/visao-geral', visaoGeralRouter())
  router.use('/evolucao', evolucaoRouter())
  router.use('/lancamentos', lancamentosRouter())
  router.use('/percentuais', percentuaisRouter())

  // Locais do professor, para os filtros (só existem em "Meus alunos")
  router.get('/locais', async (req, res) => {
    const ctx = req.contexto!
    if (ctx.tipo !== 'professor') {
      res.json([])
      return
    }
    res.json(
      await prisma.localProfessor.findMany({
        where: { professorId: ctx.professorId },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      }),
    )
  })

  return router
}
