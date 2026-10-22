import { Router } from 'express'
import { z } from 'zod'
import { CategoriaExercicio } from '../../generated/prisma/client.ts'
import { ErroHttp, naoEncontrado } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { autenticar, exigirCadastroCompleto, exigirPessoa } from '../../middlewares/autenticacao.ts'
import { exerciciosDoAluno } from '../../services/contexto.ts'
import { evolucaoDoAluno } from '../../services/evolucao.ts'
import { parseId } from '../admin/comum.ts'
import { prsRouter } from './prs.ts'

const exercicioPessoalSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(60),
  categoria: z.enum(CategoriaExercicio).default('OUTRO'),
})

/** Área "Meus PRs": toda pessoa (aluno ou professor) registra e acompanha os próprios PRs. */
export function alunoRouter() {
  const router = Router()

  router.use(autenticar, exigirCadastroCompleto, exigirPessoa)
  router.use('/prs', prsRouter())

  /** Evolução do PR em cada exercício (dashboard de evolução do aluno). */
  router.get('/evolucao', async (req, res) => {
    res.json({ exercicios: await evolucaoDoAluno(req.usuario!.id) })
  })

  /**
   * Exercícios para registrar PR: a lista padrão, os das academias e professores
   * vinculados e os pessoais. `origem` identifica de onde vem cada um na tela.
   */
  router.get('/exercicios', async (req, res) => {
    const exercicios = await prisma.exercicio.findMany({
      where: { ativo: true, ...(await exerciciosDoAluno(req.usuario!.id)) },
      select: {
        id: true,
        nome: true,
        categoria: true,
        escopo: true,
        academia: { select: { nome: true } },
        dono: { select: { nome: true } },
      },
      orderBy: { nome: 'asc' },
    })
    res.json(
      exercicios.map(({ escopo, academia, dono, ...e }) => ({
        ...e,
        origem:
          escopo === 'PADRAO'
            ? null
            : escopo === 'PESSOAL'
              ? 'pessoal'
              : escopo === 'ACADEMIA'
                ? academia?.nome
                : dono?.nome,
        pessoal: escopo === 'PESSOAL',
      })),
    )
  })

  /** Exercício pessoal: só a própria pessoa usa. */
  router.post('/exercicios', async (req, res) => {
    const alunoId = req.usuario!.id
    const dados = exercicioPessoalSchema.parse(req.body)
    await validarNomePessoal(alunoId, dados.nome)
    const exercicio = await prisma.exercicio.create({
      data: { ...dados, escopo: 'PESSOAL', donoId: alunoId },
      select: { id: true, nome: true, categoria: true },
    })
    res.status(201).json({ ...exercicio, origem: 'pessoal', pessoal: true })
  })

  router.put('/exercicios/:id', async (req, res) => {
    const alunoId = req.usuario!.id
    const atual = await buscarPessoal(alunoId, parseId(req.params.id))
    const dados = exercicioPessoalSchema.parse(req.body)
    await validarNomePessoal(alunoId, dados.nome, atual.id)
    const exercicio = await prisma.exercicio.update({
      where: { id: atual.id },
      data: dados,
      select: { id: true, nome: true, categoria: true },
    })
    res.json({ ...exercicio, origem: 'pessoal', pessoal: true })
  })

  /** Só sem PRs registrados; com PRs, o exercício pessoal fica (é histórico do aluno). */
  router.delete('/exercicios/:id', async (req, res) => {
    const exercicio = await buscarPessoal(req.usuario!.id, parseId(req.params.id))
    if (await prisma.testeCarga.count({ where: { exercicioId: exercicio.id } })) {
      throw new ErroHttp(409, 'Este exercício já tem PRs registrados e não pode ser excluído')
    }
    await prisma.exercicio.delete({ where: { id: exercicio.id } })
    res.status(204).end()
  })

  return router
}

async function buscarPessoal(donoId: number, id: number) {
  const exercicio = await prisma.exercicio.findFirst({ where: { id, donoId, escopo: 'PESSOAL' } })
  if (!exercicio) throw naoEncontrado('Exercício')
  return exercicio
}

/** O nome pessoal não pode repetir outro exercício pessoal da mesma pessoa. */
async function validarNomePessoal(donoId: number, nome: string, ignorarId?: number) {
  const existente = await prisma.exercicio.findFirst({
    where: {
      donoId,
      escopo: 'PESSOAL',
      nome: { equals: nome, mode: 'insensitive' },
      NOT: ignorarId ? { id: ignorarId } : undefined,
    },
  })
  if (existente) throw new ErroHttp(409, `Você já tem o exercício "${existente.nome}"`)
}
