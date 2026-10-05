import { Router } from 'express'
import { z } from 'zod'
import { consultarCargas, ORDENACOES } from '../../services/consultaCargas.ts'
import { idSchema } from './comum.ts'

const filtrosSchema = z.object({
  busca: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || undefined),
  exercicioId: idSchema.optional(),
  turmaId: idSchema.optional(),
  ordenar: z.enum(ORDENACOES).default('carga'),
  direcao: z.enum(['asc', 'desc']).default('desc'),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(200).default(50),
})

export function cargasRouter() {
  const router = Router()

  /** Cargas máximas vigentes com filtros combináveis por aluno, exercício e turma (Figura 4). */
  router.get('/', async (req, res) => {
    res.json(await consultarCargas(filtrosSchema.parse(req.query)))
  })

  return router
}
