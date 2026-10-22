import { Router } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { ErroHttp, naoEncontrado } from '../lib/erros.ts'
import { prisma } from '../lib/prisma.ts'
import { autenticar, exigirCadastroCompleto, exigirPessoa } from '../middlewares/autenticacao.ts'
import { buscarCodigoValido } from '../services/codigos.ts'
import { parseId } from './admin/comum.ts'

const codigoSchema = z.object({
  codigo: z.string().trim().min(1, 'Digite o código'),
})

const UMA_HORA = 60 * 60 * 1000

/**
 * Um código tem só 6 dígitos: o limite de tentativas impede adivinhar códigos alheios.
 * Conta + IP (10 por hora) e um teto por IP (50 por hora). LIMITE_CODIGOS aumenta nos testes.
 */
function limiteDeTentativas() {
  const multiplicador = Number(process.env.LIMITE_CODIGOS ?? 1)
  const mensagem = { erro: 'Muitas tentativas de código. Tente novamente mais tarde.' }
  const porConta = rateLimit({
    windowMs: UMA_HORA,
    limit: 10 * multiplicador,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: mensagem,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}:${req.usuario?.id ?? ''}`,
  })
  const porIp = rateLimit({
    windowMs: UMA_HORA,
    limit: 50 * multiplicador,
    standardHeaders: false,
    legacyHeaders: false,
    message: mensagem,
  })
  return [porIp, porConta]
}

/**
 * Vínculos da pessoa: usar um código (de academia ou de professor), ver com quem
 * compartilha os PRs e desfazer vínculos.
 */
export function vinculosRouter() {
  const router = Router()
  router.use(autenticar, exigirCadastroCompleto, exigirPessoa)

  /** Academias e professores que veem os PRs da pessoa, e academias onde ela ensina. */
  router.get('/', async (req, res) => {
    const usuario = req.usuario!
    const [comoAluno, ondeEnsina] = await Promise.all([
      prisma.vinculoAluno.findMany({
        where: { alunoId: usuario.id },
        include: {
          academia: { select: { id: true, nome: true } },
          professor: { select: { id: true, nome: true } },
          turma: { select: { id: true, nome: true } },
        },
        orderBy: { criadoEm: 'asc' },
      }),
      prisma.professorAcademia.findMany({
        where: { professorId: usuario.id },
        include: { academia: { select: { id: true, nome: true } } },
        orderBy: { criadoEm: 'asc' },
      }),
    ])
    res.json({
      comoAluno: comoAluno.map((v) => ({
        id: v.id,
        tipo: v.academia ? ('academia' as const) : ('professor' as const),
        academia: v.academia,
        professor: v.professor,
        turma: v.turma,
        desde: v.criadoEm,
      })),
      academiasOndeEnsina: ondeEnsina.map((p) => ({ ...p.academia, desde: p.criadoEm })),
    })
  })

  /**
   * Usa um código: o aluno se vincula à academia ou ao professor; o professor que usa
   * o código de professores da academia passa a fazer parte dela. Vale na hora.
   */
  router.post('/codigo', ...limiteDeTentativas(), async (req, res) => {
    const usuario = req.usuario!
    const { codigo } = codigoSchema.parse(req.body)
    const encontrado = await buscarCodigoValido(codigo)
    if (!encontrado) {
      throw new ErroHttp(404, 'Código inválido ou expirado', 'CODIGO_INVALIDO')
    }

    switch (encontrado.tipo) {
      case 'ALUNOS_ACADEMIA': {
        const academia = encontrado.academia!
        const existente = await prisma.vinculoAluno.findFirst({
          where: { alunoId: usuario.id, academiaId: academia.id },
        })
        if (existente) throw new ErroHttp(409, `Você já está vinculado a ${academia.nome}`)
        const vinculo = await prisma.vinculoAluno.create({
          data: { alunoId: usuario.id, academiaId: academia.id },
        })
        res.status(201).json({ tipo: 'academia', vinculoId: vinculo.id, academia })
        return
      }
      case 'ALUNOS_PROFESSOR': {
        const professor = encontrado.professor!
        if (!professor.ativo || !professor.ehProfessor) {
          throw new ErroHttp(404, 'Código inválido ou expirado', 'CODIGO_INVALIDO')
        }
        if (professor.id === usuario.id) {
          throw new ErroHttp(400, 'Este é o seu próprio código de professor')
        }
        const existente = await prisma.vinculoAluno.findFirst({
          where: { alunoId: usuario.id, professorId: professor.id },
        })
        if (existente) throw new ErroHttp(409, `Você já está vinculado a ${professor.nome}`)
        const vinculo = await prisma.vinculoAluno.create({
          data: { alunoId: usuario.id, professorId: professor.id },
        })
        res.status(201).json({
          tipo: 'professor',
          vinculoId: vinculo.id,
          professor: { id: professor.id, nome: professor.nome },
        })
        return
      }
      case 'PROFESSORES_ACADEMIA': {
        const academia = encontrado.academia!
        if (!usuario.ehProfessor) {
          throw new ErroHttp(
            400,
            'Este código é para professores. Ative "Sou professor" no seu perfil para usá-lo.',
            'SO_PROFESSORES',
          )
        }
        const existente = await prisma.professorAcademia.findUnique({
          where: { academiaId_professorId: { academiaId: academia.id, professorId: usuario.id } },
        })
        if (existente) throw new ErroHttp(409, `Você já é professor de ${academia.nome}`)
        await prisma.professorAcademia.create({
          data: { academiaId: academia.id, professorId: usuario.id },
        })
        res.status(201).json({ tipo: 'professor_da_academia', academia })
        return
      }
    }
  })

  /** O aluno desfaz um vínculo. Os PRs continuam com ele; quem perdeu o vínculo deixa de vê-los. */
  router.delete('/:id', async (req, res) => {
    const vinculo = await prisma.vinculoAluno.findFirst({
      where: { id: parseId(req.params.id), alunoId: req.usuario!.id },
    })
    if (!vinculo) throw naoEncontrado('Vínculo')
    await prisma.vinculoAluno.delete({ where: { id: vinculo.id } })
    res.status(204).end()
  })

  /** O professor sai de uma academia: perde o acesso aos alunos dela na hora. */
  router.delete('/academias/:academiaId', async (req, res) => {
    const removidos = await prisma.professorAcademia.deleteMany({
      where: { academiaId: parseId(req.params.academiaId), professorId: req.usuario!.id },
    })
    if (removidos.count === 0) throw naoEncontrado('Academia')
    res.status(204).end()
  })

  return router
}
