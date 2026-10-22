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
  localId: idSchema.optional(),
  ordenar: z.enum(ORDENACOES).default('carga'),
  direcao: z.enum(['asc', 'desc']).default('desc'),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(200).default(50),
})

export function cargasRouter() {
  const router = Router()

  /** Cargas máximas vigentes dos alunos do contexto, com filtros por aluno, exercício, turma e local. */
  router.get('/', async (req, res) => {
    res.json(await consultarCargas(req.contexto!, filtrosSchema.parse(req.query)))
  })

  return router
}
