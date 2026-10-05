import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type RequestHandler } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { tratarErros } from './lib/erros.ts'
import { adminRouter } from './routes/admin/index.ts'
import { alunoRouter } from './routes/aluno/index.ts'
import { authRouter } from './routes/auth.ts'
import { healthRouter, type VerificarBanco } from './routes/health.ts'

type Dependencias = {
  verificarBanco: VerificarBanco
  webOrigin: string
  /** Limite de tentativas de login; os testes passam um middleware que não limita. */
  limitarLogin?: RequestHandler
}

const QUINZE_MINUTOS = 15 * 60 * 1000
const mensagemLimite = { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }

/**
 * No box, os alunos costumam usar o mesmo Wi-Fi (mesmo IP público). Por isso o limite principal
 * é por conta + IP (10 tentativas/15 min), com um teto mais alto por IP (100/15 min) contra
 * tentativas em massa. LIMITE_LOGIN aumenta ambos (usado nos testes de ponta a ponta).
 */
function limitePadraoLogin(): RequestHandler {
  const multiplicador = Number(process.env.LIMITE_LOGIN ?? 1)
  const porConta = rateLimit({
    windowMs: QUINZE_MINUTOS,
    limit: 10 * multiplicador,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: mensagemLimite,
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
      return `${ipKeyGenerator(req.ip ?? '')}:${email}`
    },
  })
  const porIp = rateLimit({
    windowMs: QUINZE_MINUTOS,
    limit: 100 * multiplicador,
    standardHeaders: false,
    legacyHeaders: false,
    message: mensagemLimite,
  })
  return (req, res, next) =>
    porIp(req, res, (erro) => (erro ? next(erro) : porConta(req, res, next)))
}

export function criarApp({ verificarBanco, webOrigin, limitarLogin }: Dependencias) {
  const app = express()

  // Quantos proxies à frente da API são confiáveis para descobrir o IP real do aluno
  // (Render = 1; Vercel encaminhando /api para o Render = 2)
  app.set('trust proxy', Number(process.env.PROXIES_CONFIAVEIS ?? 1))
  app.use(helmet())
  app.use(cors({ origin: webOrigin, credentials: true }))
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  app.use('/api/health', healthRouter(verificarBanco))
  app.use('/api/auth', authRouter({ limitarLogin: limitarLogin ?? limitePadraoLogin() }))
  app.use('/api/admin', adminRouter())
  app.use('/api/me', alunoRouter())

  app.use('/api', (_req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada' })
  })

  app.use(tratarErros)

  return app
}
