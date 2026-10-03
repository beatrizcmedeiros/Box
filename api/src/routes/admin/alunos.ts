import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client.ts'
import { ErroHttp, naoEncontrado } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { gerarHashSenha, gerarSenhaTemporaria } from '../../lib/senha.ts'
import { revogarTodasAsSessoes } from '../../services/sessoes.ts'
import { idSchema, parseId } from './comum.ts'

const alunoSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome completo').max(120),
  email: z.string().trim().toLowerCase().pipe(z.email('E-mail inválido')),
  turmaId: idSchema.nullish().transform((v) => v ?? null),
  ativo: z.boolean().default(true),
})

const filtrosSchema = z.object({
  busca: z.string().trim().optional(),
  turmaId: idSchema.optional(),
  ativo: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
})

// Nunca devolver o hash da senha
const camposPublicos = {
  id: true,
  nome: true,
  email: true,
  ativo: true,
  trocarSenha: true,
  consentimentoEm: true,
  criadoEm: true,
  turma: { select: { id: true, nome: true } },
} satisfies Prisma.UsuarioSelect

export function alunosRouter() {
  const router = Router()

  router.get('/', async (req, res) => {
    const { busca, turmaId, ativo } = filtrosSchema.parse(req.query)
    const alunos = await prisma.usuario.findMany({
      where: {
        perfil: 'ALUNO',
        turmaId,
        ativo,
        OR: busca
          ? [
              { nome: { contains: busca, mode: 'insensitive' } },
              { email: { contains: busca, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { nome: 'asc' },
      select: camposPublicos,
    })
    res.json(alunos)
  })

  /** Cria o aluno com uma senha temporária, exibida uma única vez ao treinador. */
  router.post('/', async (req, res) => {
    const dados = alunoSchema.parse(req.body)
    await validarTurma(dados.turmaId)
    const senhaTemporaria = gerarSenhaTemporaria()
    const aluno = await prisma.usuario.create({
      data: {
        ...dados,
        perfil: 'ALUNO',
        senhaHash: await gerarHashSenha(senhaTemporaria),
        trocarSenha: true,
      },
      select: camposPublicos,
    })
    res.status(201).json({ aluno, senhaTemporaria })
  })

  router.put('/:id', async (req, res) => {
    const id = parseId(req.params.id)
    await buscarAluno(id)
    const dados = alunoSchema.parse(req.body)
    await validarTurma(dados.turmaId)
    const aluno = await prisma.usuario.update({
      where: { id },
      data: dados,
      select: camposPublicos,
    })
    if (!aluno.ativo) await revogarTodasAsSessoes(id)
    res.json(aluno)
  })

  /** Gera nova senha temporária (aluno esqueceu a senha) e encerra as sessões abertas. */
  router.post('/:id/redefinir-senha', async (req, res) => {
    const id = parseId(req.params.id)
    await buscarAluno(id)
    const senhaTemporaria = gerarSenhaTemporaria()
    await prisma.usuario.update({
      where: { id },
      data: { senhaHash: await gerarHashSenha(senhaTemporaria), trocarSenha: true },
    })
    await revogarTodasAsSessoes(id)
    res.json({ senhaTemporaria })
  })

  /** Remove o aluno e todos os seus dados (testes de carga e sessões). */
  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params.id)
    await buscarAluno(id)
    await prisma.usuario.delete({ where: { id } })
    res.status(204).end()
  })

  return router
}

async function validarTurma(turmaId: number | null) {
  if (turmaId && !(await prisma.turma.findUnique({ where: { id: turmaId } }))) {
    throw new ErroHttp(400, 'Turma não encontrada')
  }
}

async function buscarAluno(id: number) {
  const aluno = await prisma.usuario.findFirst({ where: { id, perfil: 'ALUNO' } })
  if (!aluno) throw naoEncontrado('Aluno')
  return aluno
}
