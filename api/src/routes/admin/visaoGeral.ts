import { Router } from 'express'
import { formatarData } from '../../lib/datas.ts'
import { prisma } from '../../lib/prisma.ts'

const DIAS_RECENTES = 30

/** Indicadores de adesão para acompanhar o piloto (seção 11 do plano). */
export function visaoGeralRouter() {
  const router = Router()

  router.get('/', async (_req, res) => {
    const desde = new Date(Date.now() - DIAS_RECENTES * 24 * 60 * 60 * 1000)
    const alunoAtivo = { perfil: 'ALUNO' as const, ativo: true }

    const [ativos, primeiroAcessoConcluido, comPr, registrosRecentes, ultimaImportacao, semPr] =
      await Promise.all([
        prisma.usuario.count({ where: alunoAtivo }),
        prisma.usuario.count({
          where: { ...alunoAtivo, trocarSenha: false, consentimentoEm: { not: null } },
        }),
        prisma.usuario.count({ where: { ...alunoAtivo, testesCarga: { some: {} } } }),
        prisma.testeCarga.groupBy({
          by: ['origem'],
          where: { criadoEm: { gte: desde }, usuario: alunoAtivo },
          _count: { _all: true },
        }),
        prisma.importacao.findFirst({
          where: { status: 'CONFIRMADA' },
          orderBy: { criadoEm: 'desc' },
          include: { _count: { select: { testesCarga: true } } },
        }),
        prisma.usuario.findMany({
          where: { ...alunoAtivo, testesCarga: { none: {} } },
          select: { id: true, nome: true, turma: { select: { nome: true } }, trocarSenha: true },
          orderBy: { nome: 'asc' },
          take: 10,
        }),
      ])

    const contar = (origem: 'ALUNO' | 'IMPORTACAO') =>
      registrosRecentes.find((r) => r.origem === origem)?._count._all ?? 0

    res.json({
      alunos: {
        ativos,
        primeiroAcessoConcluido,
        comPr,
        percentualComPr: ativos ? Math.round((comPr / ativos) * 100) : 0,
      },
      ultimos30Dias: { registradosPeloAluno: contar('ALUNO'), importados: contar('IMPORTACAO') },
      ultimaImportacao: ultimaImportacao && {
        dataTeste: formatarData(ultimaImportacao.dataTeste),
        criadoEm: ultimaImportacao.criadoEm,
        resultados: ultimaImportacao._count.testesCarga,
      },
      alunosSemPr: semPr.map((a) => ({
        id: a.id,
        nome: a.nome,
        turma: a.turma?.nome ?? null,
        aguardandoPrimeiroAcesso: a.trocarSenha,
      })),
    })
  })

  return router
}
