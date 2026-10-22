import { Router } from 'express'
import { z } from 'zod'
import { naoEncontrado } from '../lib/erros.ts'
import { prisma } from '../lib/prisma.ts'
import { autenticar, exigirAcademia, exigirCadastroCompleto } from '../middlewares/autenticacao.ts'
import { codigoAtual, gerarCodigo, revogarCodigo, validadeSchema } from '../services/codigos.ts'
import { parseId } from './admin/comum.ts'

const TIPOS = { alunos: 'ALUNOS_ACADEMIA', professores: 'PROFESSORES_ACADEMIA' } as const
const tipoSchema = z.enum(['alunos', 'professores'])

/**
 * Administração da academia (conta do dono do box): dados, códigos de vínculo e
 * professores. Alunos, turmas e consultas ficam em /api/c/:academiaId, como para os professores.
 */
export function academiaRouter() {
  const router = Router()
  router.use(autenticar, exigirCadastroCompleto, exigirAcademia)

  async function academiaDa(contaId: number) {
    const academia = await prisma.academia.findUnique({ where: { contaId } })
    if (!academia) throw naoEncontrado('Academia')
    return academia
  }

  router.get('/', async (req, res) => {
    const academia = await academiaDa(req.usuario!.id)
    const [professores, alunos] = await Promise.all([
      prisma.professorAcademia.count({ where: { academiaId: academia.id } }),
      prisma.vinculoAluno.count({ where: { academiaId: academia.id } }),
    ])
    res.json({ id: academia.id, nome: academia.nome, professores, alunos })
  })

  router.put('/', async (req, res) => {
    const { nome } = z
      .object({ nome: z.string().trim().min(2, 'Informe o nome da academia').max(80) })
      .parse(req.body)
    const academia = await academiaDa(req.usuario!.id)
    res.json(await prisma.academia.update({ where: { id: academia.id }, data: { nome } }))
  })

  // ---- Códigos: um para alunos e outro para professores ----

  router.get('/codigos', async (req, res) => {
    const academia = await academiaDa(req.usuario!.id)
    const dono = { academiaId: academia.id }
    res.json({
      alunos: await codigoAtual('ALUNOS_ACADEMIA', dono),
      professores: await codigoAtual('PROFESSORES_ACADEMIA', dono),
    })
  })

  router.post('/codigos/:tipo', async (req, res) => {
    const tipo = TIPOS[tipoSchema.parse(req.params.tipo)]
    const { validade } = validadeSchema.parse(req.body)
    const academia = await academiaDa(req.usuario!.id)
    res.status(201).json({ codigo: await gerarCodigo(tipo, { academiaId: academia.id }, validade) })
  })

  router.delete('/codigos/:tipo', async (req, res) => {
    const tipo = TIPOS[tipoSchema.parse(req.params.tipo)]
    const academia = await academiaDa(req.usuario!.id)
    await revogarCodigo(tipo, { academiaId: academia.id })
    res.status(204).end()
  })

  // ---- Professores da academia ----

  router.get('/professores', async (req, res) => {
    const academia = await academiaDa(req.usuario!.id)
    const professores = await prisma.professorAcademia.findMany({
      where: { academiaId: academia.id },
      include: { professor: { select: { id: true, nome: true, email: true } } },
      orderBy: { professor: { nome: 'asc' } },
    })
    res.json(professores.map((p) => ({ ...p.professor, desde: p.criadoEm })))
  })

  /** Remove o professor da academia: ele perde o acesso aos alunos dela na hora. */
  router.delete('/professores/:id', async (req, res) => {
    const academia = await academiaDa(req.usuario!.id)
    const removidos = await prisma.professorAcademia.deleteMany({
      where: { academiaId: academia.id, professorId: parseId(req.params.id) },
    })
    if (removidos.count === 0) throw naoEncontrado('Professor')
    res.status(204).end()
  })

  return router
}
