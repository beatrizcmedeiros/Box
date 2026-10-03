import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { healthRouter, type VerificarBanco } from './routes/health.ts'

type Dependencias = {
  verificarBanco: VerificarBanco
  webOrigin: string
}

export function criarApp({ verificarBanco, webOrigin }: Dependencias) {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: webOrigin, credentials: true }))
  app.use(express.json({ limit: '100kb' }))

  app.use('/api/health', healthRouter(verificarBanco))

  app.use('/api', (_req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada' })
  })

  return app
}
