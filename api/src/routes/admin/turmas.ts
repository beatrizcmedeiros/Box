import { Router } from 'express'
import { z } from 'zod'
import { ErroHttp, naoEncontrado } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { type Contexto, turmasDoContexto } from '../../services/contexto.ts'
import { idSchema, parseId } from './comum.ts'

const turmaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(60),
  horario: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use o formato HH:MM')
    .nullish()
    .transform((v) => v ?? null),
  // Obrigatório no contexto "Meus alunos": a turma fica dentro de um local do professor
  localId: idSchema.nullish().transform((v) => v ?? null),
})

/** Turmas do contexto: as da academia, ou as dos locais do professor. */
export function turmasRouter() {
  const router = Router()

  router.get('/', async (req, res) => {
    const turmas = await prisma.turma.findMany({
      where: turmasDoContexto(req.contexto!),
      orderBy: [{ local: { nome: 'asc' } }, { horario: 'asc' }, { nome: 'asc' }],
      include: {
        local: { select: { id: true, nome: true } },
        _count: { select: { vinculos: true } },
      },
    })
    res.json(
      turmas.map(({ _count, academiaId: _a, localId: _l, ...turma }) => ({
        ...turma,
        totalAlunos: _count.vinculos,
      })),
    )
  })

  router.post('/', async (req, res) => {
    const ctx = req.contexto!
    const { localId, ...dados } = turmaSchema.parse(req.body)
    const dono = await donoDaTurma(ctx, localId)
    await validarNomeLivre(dono, dados.nome)
    const turma = await prisma.turma.create({ data: { ...dados, ...dono } })
    res.status(201).json(turma)
  })

  router.put('/:id', async (req, res) => {
    const ctx = req.contexto!
    const atual = await buscarTurma(ctx, parseId(req.params.id))
    const { localId, ...dados } = turmaSchema.parse(req.body)
    const dono = await donoDaTurma(ctx, localId ?? atual.localId)
    await validarNomeLivre(dono, dados.nome, atual.id)
    const turma = await prisma.turma.update({
      where: { id: atual.id },
      data: { ...dados, ...dono },
    })
    // Mudou de local: os alunos da turma acompanham
    if (dono.localId && dono.localId !== atual.localId) {
      await prisma.vinculoAluno.updateMany({
        where: { turmaId: turma.id },
        data: { localId: dono.localId },
      })
    }
    res.json(turma)
  })

  // Os alunos da turma removida ficam sem turma (continuam vinculados)
  router.delete('/:id', async (req, res) => {
    const turma = await buscarTurma(req.contexto!, parseId(req.params.id))
    await prisma.turma.delete({ where: { id: turma.id } })
    res.status(204).end()
  })

  return router
}

async function donoDaTurma(ctx: Contexto, localId: number | null) {
  if (ctx.tipo === 'academia') return { academiaId: ctx.academiaId, localId: null }
  if (!localId) {
    throw new ErroHttp(400, 'Escolha o local da turma')
  }
  const local = await prisma.localProfessor.findFirst({
    where: { id: localId, professorId: ctx.professorId },
  })
  if (!local) throw naoEncontrado('Local')
  return { academiaId: null, localId: local.id }
}

export async function buscarTurma(ctx: Contexto, id: number) {
  const turma = await prisma.turma.findFirst({ where: { id, ...turmasDoContexto(ctx) } })
  if (!turma) throw naoEncontrado('Turma')
  return turma
}

async function validarNomeLivre(
  dono: { academiaId: number | null; localId: number | null },
  nome: string,
  ignorarId?: number,
) {
  const existente = await prisma.turma.findFirst({
    where: {
      ...(dono.academiaId ? { academiaId: dono.academiaId } : { localId: dono.localId }),
      nome: { equals: nome, mode: 'insensitive' },
      NOT: { id: ignorarId },
    },
  })
  if (existente) throw new ErroHttp(409, `Já existe a turma "${existente.nome}"`)
}
