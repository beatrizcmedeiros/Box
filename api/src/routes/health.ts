import { Router } from 'express'

export type VerificarBanco = () => Promise<boolean>

export function healthRouter(verificarBanco: VerificarBanco) {
  const router = Router()

  router.get('/', async (_req, res) => {
    const banco = await verificarBanco()
    res.status(banco ? 200 : 503).json({
      status: banco ? 'ok' : 'degradado',
      banco: banco ? 'ok' : 'indisponivel',
      horario: new Date().toISOString(),
    })
  })

  return router
}
