import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type RequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
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

const limitePadraoLogin = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
  })

export function criarApp({ verificarBanco, webOrigin, limitarLogin }: Dependencias) {
  const app = express()

  app.set('trust proxy', 1)
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
