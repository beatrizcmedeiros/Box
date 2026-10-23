import { Router } from 'express'
import { formatarData } from '../../lib/datas.ts'
import { prisma } from '../../lib/prisma.ts'
import {
  alunosDoContexto,
  importacoesDoContexto,
  vinculoDoContexto,
} from '../../services/contexto.ts'

const DIAS_RECENTES = 30

/** Indicadores de adesão dos alunos do contexto. */
export function visaoGeralRouter() {
  const router = Router()

  router.get('/', async (req, res) => {
    const ctx = req.contexto!
    const desde = new Date(Date.now() - DIAS_RECENTES * 24 * 60 * 60 * 1000)
    const doContexto = alunosDoContexto(ctx)

    const [ativos, primeiroAcessoConcluido, comPr, registrosRecentes, ultimaImportacao, semPr] =
      await Promise.all([
        prisma.usuario.count({ where: doContexto }),
        prisma.usuario.count({
          where: {
            ...doContexto,
            consentimentoEm: { not: null },
          },
        }),
        prisma.usuario.count({ where: { ...doContexto, testesCarga: { some: {} } } }),
        prisma.testeCarga.groupBy({
          by: ['origem'],
          where: { criadoEm: { gte: desde }, usuario: doContexto },
          _count: { _all: true },
        }),
        prisma.importacao.findFirst({
          where: { status: 'CONFIRMADA', ...importacoesDoContexto(ctx) },
          orderBy: { criadoEm: 'desc' },
          include: { _count: { select: { testesCarga: true } } },
        }),
        prisma.usuario.findMany({
          where: { ...doContexto, testesCarga: { none: {} } },
          select: {
            id: true,
            nome: true,
            emailVerificadoEm: true,
            consentimentoEm: true,
            vinculosComoAluno: {
              where: vinculoDoContexto(ctx),
              select: { turma: { select: { nome: true } } },
            },
          },
          orderBy: { nome: 'asc' },
          take: 10,
        }),
      ])

    const contar = (origem: 'ALUNO' | 'IMPORTACAO' | 'TREINADOR') =>
      registrosRecentes.find((r) => r.origem === origem)?._count._all ?? 0

    res.json({
      alunos: {
        ativos,
        primeiroAcessoConcluido,
        comPr,
        percentualComPr: ativos ? Math.round((comPr / ativos) * 100) : 0,
      },
      // Lista importada e lançamentos na tela Teste de carga contam como registros do treinador
      ultimos30Dias: {
        registradosPeloAluno: contar('ALUNO'),
        importados: contar('IMPORTACAO') + contar('TREINADOR'),
      },
      ultimaImportacao: ultimaImportacao && {
        dataTeste: formatarData(ultimaImportacao.dataTeste),
        criadoEm: ultimaImportacao.criadoEm,
        resultados: ultimaImportacao._count.testesCarga,
      },
      alunosSemPr: semPr.map((a) => ({
        id: a.id,
        nome: a.nome,
        turma: a.vinculosComoAluno[0]?.turma?.nome ?? null,
        aguardandoPrimeiroAcesso: !a.consentimentoEm,
      })),
    })
  })

  return router
}
