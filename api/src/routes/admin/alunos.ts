import { Router } from 'express'
import { z } from 'zod'
import { ErroHttp, naoEncontrado } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { normalizarTexto } from '../../lib/texto.ts'
import { type Contexto, vinculoDoAluno, vinculoDoContexto } from '../../services/contexto.ts'
import { idSchema, parseId } from './comum.ts'
import { buscarTurma } from './turmas.ts'

const filtrosSchema = z.object({
  busca: z.string().trim().optional(),
  turmaId: idSchema.optional(),
  localId: idSchema.optional(),
})

// O que o professor ou a academia pode mudar no vínculo do aluno (não nos dados da conta dele)
const vinculoSchema = z.object({
  turmaId: idSchema.nullish().transform((v) => v ?? null),
  localId: idSchema.nullish().transform((v) => v ?? null),
  // Como o aluno aparece na lista do teste; se omitido, os apelidos atuais são mantidos
  apelidos: z
    .array(z.string().max(80))
    .optional()
    .transform((lista) => lista && [...new Set(lista.map(normalizarTexto).filter(Boolean))]),
})

const incluir = {
  aluno: {
    select: { id: true, nome: true, email: true, trocarSenha: true, consentimentoEm: true },
  },
  turma: { select: { id: true, nome: true } },
  local: { select: { id: true, nome: true } },
  apelidos: { select: { apelido: true }, orderBy: { apelido: 'asc' } },
} as const

type VinculoCompleto = Awaited<ReturnType<typeof buscarVinculos>>[number]

const buscarVinculos = (where: Parameters<typeof prisma.vinculoAluno.findMany>[0]) =>
  prisma.vinculoAluno.findMany({ ...where, include: incluir })

const formatar = (v: VinculoCompleto) => ({
  id: v.aluno.id,
  nome: v.aluno.nome,
  email: v.aluno.email,
  vinculoId: v.id,
  turma: v.turma,
  local: v.local,
  apelidos: v.apelidos.map((a) => a.apelido),
  desde: v.criadoEm,
  // Ainda não concluiu o primeiro acesso (troca de senha e termo)
  primeiroAcessoPendente: v.aluno.trocarSenha || !v.aluno.consentimentoEm,
})

/**
 * Alunos vinculados ao contexto. O professor ou a academia organiza o aluno (turma, local,
 * apelidos) e pode desfazer o vínculo; os dados da conta pertencem ao próprio aluno.
 */
export function alunosRouter() {
  const router = Router()

  router.get('/', async (req, res) => {
    const ctx = req.contexto!
    const { busca, turmaId, localId } = filtrosSchema.parse(req.query)
    const vinculos = await buscarVinculos({
      where: {
        ...vinculoDoContexto(ctx),
        aluno: {
          tipo: 'PESSOA',
          ativo: true,
          OR: busca
            ? [
                { nome: { contains: busca, mode: 'insensitive' } },
                { email: { contains: busca, mode: 'insensitive' } },
              ]
            : undefined,
        },
        ...(turmaId ? { turmaId } : {}),
        ...(localId ? { localId } : {}),
      },
      orderBy: { aluno: { nome: 'asc' } },
    })
    res.json(vinculos.map(formatar))
  })

  /** Turma, local e apelidos do aluno neste contexto. */
  router.put('/:id', async (req, res) => {
    const ctx = req.contexto!
    const vinculo = await vinculoDoAluno(ctx, parseId(req.params.id))
    const { turmaId, localId, apelidos } = vinculoSchema.parse(req.body)
    const organizacao = await validarOrganizacao(ctx, turmaId, localId)
    if (apelidos) await validarApelidos(ctx, apelidos, vinculo.id)

    await prisma.vinculoAluno.update({
      where: { id: vinculo.id },
      data: {
        ...organizacao,
        apelidos: apelidos && {
          deleteMany: {},
          create: apelidos.map((apelido) => ({ apelido })),
        },
      },
    })
    const [atualizado] = await buscarVinculos({ where: { id: vinculo.id } })
    res.json(formatar(atualizado))
  })

  /** Desfaz o vínculo: o aluno continua com a conta e os PRs; o contexto deixa de vê-los. */
  router.delete('/:id', async (req, res) => {
    const vinculo = await vinculoDoAluno(req.contexto!, parseId(req.params.id))
    await prisma.vinculoAluno.delete({ where: { id: vinculo.id } })
    res.status(204).end()
  })

  return router
}

/** Turma e local precisam ser do contexto; no professor, a turma define o local. */
async function validarOrganizacao(ctx: Contexto, turmaId: number | null, localId: number | null) {
  if (ctx.tipo === 'academia') {
    if (localId) throw new ErroHttp(400, 'Locais são usados só em "Meus alunos"')
    if (turmaId) await buscarTurma(ctx, turmaId)
    return { turmaId, localId: null }
  }
  if (turmaId) {
    const turma = await buscarTurma(ctx, turmaId)
    return { turmaId, localId: turma.localId }
  }
  if (localId) {
    const local = await prisma.localProfessor.findFirst({
      where: { id: localId, professorId: ctx.professorId },
    })
    if (!local) throw naoEncontrado('Local')
  }
  return { turmaId: null, localId }
}

/** Dentro do mesmo contexto, cada apelido aponta para um só aluno. */
export async function validarApelidos(ctx: Contexto, apelidos: string[], vinculoId?: number) {
  if (apelidos.length === 0) return
  const emUso = await prisma.apelidoVinculo.findFirst({
    where: {
      apelido: { in: apelidos },
      vinculo: { ...vinculoDoContexto(ctx), NOT: vinculoId ? { id: vinculoId } : undefined },
    },
    include: { vinculo: { include: { aluno: { select: { nome: true } } } } },
  })
  if (emUso) {
    throw new ErroHttp(
      409,
      `O apelido "${emUso.apelido}" já pertence a ${emUso.vinculo.aluno.nome}`,
    )
  }
}
