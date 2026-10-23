import { Router } from 'express'
import { provedorEmail } from '../services/email.ts'

export type VerificarBanco = () => Promise<boolean>

export function healthRouter(verificarBanco: VerificarBanco) {
  const router = Router()

  router.get('/', async (_req, res) => {
    const banco = await verificarBanco()
    res.status(banco ? 200 : 503).json({
      status: banco ? 'ok' : 'degradado',
      banco: banco ? 'ok' : 'indisponivel',
      // Qual serviço envia os códigos por e-mail (nunca a chave): resend, smtp ou nao_configurado
      email: provedorEmail() ?? 'nao_configurado',
      horario: new Date().toISOString(),
    })
  })

  return router
}
