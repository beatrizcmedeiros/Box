import type { NextFunction, Request, Response } from 'express'
import type { Prisma, Usuario } from '../generated/prisma/client.ts'
import { ErroHttp, naoEncontrado } from '../lib/erros.ts'
import { prisma } from '../lib/prisma.ts'
import { parseId } from '../routes/admin/comum.ts'

/**
 * Contexto de trabalho do professor ou da academia. Todas as telas de gestão
 * (alunos, turmas, teste de carga, consultas, importação) mostram só os alunos
 * vinculados ao contexto:
 *  - academia: alunos vinculados à academia. Acessam a conta da academia e os professores dela.
 *  - professor ("Meus alunos"): alunos vinculados diretamente ao professor. Só ele acessa.
 */
export type Contexto =
  | { tipo: 'academia'; academiaId: number; nome: string }
  | { tipo: 'professor'; professorId: number }

declare global {
  namespace Express {
    interface Request {
      contexto?: Contexto
    }
  }
}

/** Valor da rota para o contexto "Meus alunos" do professor. */
export const CONTEXTO_PESSOAL = 'pessoal'

/** Contextos em que o usuário pode trabalhar (para o seletor no app e na web). */
export async function contextosDoUsuario(usuario: Usuario) {
  if (usuario.tipo === 'ACADEMIA') {
    const academia = await prisma.academia.findUnique({ where: { contaId: usuario.id } })
    return academia
      ? [{ id: String(academia.id), tipo: 'academia' as const, nome: academia.nome }]
      : []
  }
  if (!usuario.ehProfessor) return []
  const academias = await prisma.professorAcademia.findMany({
    where: { professorId: usuario.id },
    include: { academia: { select: { id: true, nome: true } } },
    orderBy: { academia: { nome: 'asc' } },
  })
  return [
    { id: CONTEXTO_PESSOAL, tipo: 'professor' as const, nome: 'Meus alunos' },
    ...academias.map((a) => ({
      id: String(a.academia.id),
      tipo: 'academia' as const,
      nome: a.academia.nome,
    })),
  ]
}

export async function resolverContexto(usuario: Usuario, valor: string): Promise<Contexto> {
  if (valor === CONTEXTO_PESSOAL) {
    if (usuario.tipo !== 'PESSOA' || !usuario.ehProfessor) {
      throw new ErroHttp(403, 'Disponível apenas para professores', 'SEM_PERMISSAO')
    }
    return { tipo: 'professor', professorId: usuario.id }
  }

  const academia = await prisma.academia.findUnique({ where: { id: parseId(valor) } })
  if (!academia) throw naoEncontrado('Academia')
  const ehDona = academia.contaId === usuario.id
  const ehProfessor =
    !ehDona &&
    usuario.ehProfessor &&
    !!(await prisma.professorAcademia.findUnique({
      where: { academiaId_professorId: { academiaId: academia.id, professorId: usuario.id } },
    }))
  if (!ehDona && !ehProfessor) {
    throw new ErroHttp(403, 'Você não faz parte desta academia', 'SEM_PERMISSAO')
  }
  return { tipo: 'academia', academiaId: academia.id, nome: academia.nome }
}

/** Middleware das rotas /api/c/:contexto. Exige autenticar antes. */
export async function comContexto(req: Request, _res: Response, next: NextFunction) {
  req.contexto = await resolverContexto(req.usuario!, String(req.params.contexto))
  next()
}

// ---- Filtros do Prisma por contexto ----

/** Vínculo do aluno com o contexto. */
export const vinculoDoContexto = (ctx: Contexto): Prisma.VinculoAlunoWhereInput =>
  ctx.tipo === 'academia' ? { academiaId: ctx.academiaId } : { professorId: ctx.professorId }

/** Alunos ativos vinculados ao contexto (opcionalmente só de uma turma ou local). */
export const alunosDoContexto = (
  ctx: Contexto,
  filtros: { turmaId?: number; localId?: number } = {},
): Prisma.UsuarioWhereInput => ({
  tipo: 'PESSOA',
  ativo: true,
  vinculosComoAluno: {
    some: {
      ...vinculoDoContexto(ctx),
      ...(filtros.turmaId ? { turmaId: filtros.turmaId } : {}),
      ...(filtros.localId ? { localId: filtros.localId } : {}),
    },
  },
})

/** Turmas do contexto: as da academia, ou as dos locais do professor. */
export const turmasDoContexto = (ctx: Contexto): Prisma.TurmaWhereInput =>
  ctx.tipo === 'academia'
    ? { academiaId: ctx.academiaId }
    : { local: { professorId: ctx.professorId } }

/** Exercícios que o contexto pode usar: a lista padrão e os próprios. */
export const exerciciosDoContexto = (ctx: Contexto): Prisma.ExercicioWhereInput => ({
  OR: [
    { escopo: 'PADRAO' },
    ctx.tipo === 'academia'
      ? { escopo: 'ACADEMIA', academiaId: ctx.academiaId }
      : { escopo: 'PROFESSOR', donoId: ctx.professorId },
  ],
})

/** Dados do exercício criado no contexto. */
export const donoDoExercicio = (ctx: Contexto) =>
  ctx.tipo === 'academia'
    ? { escopo: 'ACADEMIA' as const, academiaId: ctx.academiaId }
    : { escopo: 'PROFESSOR' as const, donoId: ctx.professorId }

/** Nomes alternativos válidos no contexto: os da lista padrão e os do próprio contexto. */
export const aliasesDoContexto = (ctx: Contexto): Prisma.ExercicioAliasWhereInput => ({
  OR: [
    { academiaId: null, professorId: null },
    ctx.tipo === 'academia' ? { academiaId: ctx.academiaId } : { professorId: ctx.professorId },
  ],
})

/** Dono dos nomes alternativos gravados no contexto. */
export const donoDoAlias = (ctx: Contexto) =>
  ctx.tipo === 'academia' ? { academiaId: ctx.academiaId } : { professorId: ctx.professorId }

/** Exercícios que o ALUNO pode usar ao registrar PR. */
export async function exerciciosDoAluno(alunoId: number): Promise<Prisma.ExercicioWhereInput> {
  const vinculos = await prisma.vinculoAluno.findMany({
    where: { alunoId },
    select: { academiaId: true, professorId: true },
  })
  const academias = vinculos.flatMap((v) => (v.academiaId ? [v.academiaId] : []))
  const professores = vinculos.flatMap((v) => (v.professorId ? [v.professorId] : []))
  return {
    OR: [
      { escopo: 'PADRAO' },
      { escopo: 'PESSOAL', donoId: alunoId },
      ...(academias.length ? [{ escopo: 'ACADEMIA' as const, academiaId: { in: academias } }] : []),
      ...(professores.length
        ? [{ escopo: 'PROFESSOR' as const, donoId: { in: professores } }]
        : []),
    ],
  }
}

/** Garante que o aluno pertence ao contexto; devolve o vínculo. */
export async function vinculoDoAluno(ctx: Contexto, alunoId: number) {
  const vinculo = await prisma.vinculoAluno.findFirst({
    where: { alunoId, ...vinculoDoContexto(ctx), aluno: { tipo: 'PESSOA' } },
  })
  if (!vinculo) throw naoEncontrado('Aluno')
  return vinculo
}

/** Importações feitas no contexto (na academia, ou pelo professor para os alunos próprios). */
export const importacoesDoContexto = (ctx: Contexto) =>
  ctx.tipo === 'academia' ? { academiaId: ctx.academiaId } : { professorId: ctx.professorId }
