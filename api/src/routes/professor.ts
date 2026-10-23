import { Router } from 'express'
import { z } from 'zod'
import { ErroHttp, naoEncontrado } from '../lib/erros.ts'
import { prisma } from '../lib/prisma.ts'
import {
  autenticar,
  exigirCadastroCompleto,
  exigirPessoa,
  exigirProfessor,
} from '../middlewares/autenticacao.ts'
import { codigoAtual, gerarCodigo, revogarCodigo, validadeSchema } from '../services/codigos.ts'
import { parseId } from './admin/comum.ts'

const localSchema = z.object({ nome: z.string().trim().min(1, 'Informe o nome').max(60) })

/**
 * Área do professor fora de um contexto: o código para os alunos se vincularem a ele e os
 * locais em que ele agrupa os alunos próprios.
 */
export function professorRouter() {
  const router = Router()
  router.use(autenticar, exigirCadastroCompleto, exigirPessoa)

  // Ser professor se escolhe só no cadastro: o aluno não muda o perfil para professor
  router.use(exigirProfessor)

  // ---- Código para os alunos se vincularem ao professor ----

  router.get('/codigo', async (req, res) => {
    res.json({ codigo: await codigoAtual('ALUNOS_PROFESSOR', { professorId: req.usuario!.id }) })
  })

  router.post('/codigo', async (req, res) => {
    const { validade } = validadeSchema.parse(req.body)
    const codigo = await gerarCodigo('ALUNOS_PROFESSOR', { professorId: req.usuario!.id }, validade)
    res.status(201).json({ codigo })
  })

  router.delete('/codigo', async (req, res) => {
    await revogarCodigo('ALUNOS_PROFESSOR', { professorId: req.usuario!.id })
    res.status(204).end()
  })

  // ---- Locais: agrupamentos dos alunos próprios (ex.: o nome de outra academia) ----

  router.get('/locais', async (req, res) => {
    const locais = await prisma.localProfessor.findMany({
      where: { professorId: req.usuario!.id },
      include: {
        turmas: { select: { id: true, nome: true, horario: true }, orderBy: { nome: 'asc' } },
        _count: { select: { vinculos: true } },
      },
      orderBy: { nome: 'asc' },
    })
    res.json(locais.map(({ _count, ...local }) => ({ ...local, totalAlunos: _count.vinculos })))
  })

  router.post('/locais', async (req, res) => {
    const { nome } = localSchema.parse(req.body)
    await validarNomeLivre(req.usuario!.id, nome)
    const local = await prisma.localProfessor.create({
      data: { nome, professorId: req.usuario!.id },
    })
    res.status(201).json(local)
  })

  router.put('/locais/:id', async (req, res) => {
    const local = await buscarLocal(req.usuario!.id, parseId(req.params.id))
    const { nome } = localSchema.parse(req.body)
    await validarNomeLivre(req.usuario!.id, nome, local.id)
    res.json(await prisma.localProfessor.update({ where: { id: local.id }, data: { nome } }))
  })

  // As turmas do local são removidas; os alunos ficam sem local e sem turma (não são desvinculados)
  router.delete('/locais/:id', async (req, res) => {
    const local = await buscarLocal(req.usuario!.id, parseId(req.params.id))
    await prisma.localProfessor.delete({ where: { id: local.id } })
    res.status(204).end()
  })

  return router
}

async function buscarLocal(professorId: number, id: number) {
  const local = await prisma.localProfessor.findFirst({ where: { id, professorId } })
  if (!local) throw naoEncontrado('Local')
  return local
}

async function validarNomeLivre(professorId: number, nome: string, ignorarId?: number) {
  const existente = await prisma.localProfessor.findFirst({
    where: { professorId, nome: { equals: nome, mode: 'insensitive' }, NOT: { id: ignorarId } },
  })
  if (existente) throw new ErroHttp(409, `Você já tem um local chamado "${existente.nome}"`)
}
