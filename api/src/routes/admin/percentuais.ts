import { Router } from 'express'
import { z } from 'zod'
import { cargaDoPercentual, PERCENTUAIS } from '../../domain/percentuais.ts'
import { ErroHttp } from '../../lib/erros.ts'
import { consultarCargas } from '../../services/consultaCargas.ts'
import { idSchema } from './comum.ts'

/** Limite de linhas por consulta; acima disso o treinador precisa filtrar mais. */
export const LIMITE_LINHAS = 600

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
  // Ex.: "35,45". Sem o parâmetro, vêm todos os percentuais padrão.
  percentuais: z
    .string()
    .optional()
    .transform((texto, ctx) => {
      if (!texto) return [...PERCENTUAIS]
      const valores = texto.split(',').map((v) => Number(v.trim()))
      if (valores.some((v) => !Number.isInteger(v) || v < 1 || v > 100)) {
        ctx.addIssue({ code: 'custom', message: 'Percentuais devem ser inteiros entre 1 e 100' })
        return z.NEVER
      }
      return [...new Set(valores)].sort((a, b) => a - b)
    }),
})

/**
 * Tela "Percentuais" do treinador: cargas de cada percentual do PR vigente, para vários
 * alunos de uma vez (por turma, exercício e/ou nome) — útil quando o aluno está sem o celular.
 */
export function percentuaisRouter() {
  const router = Router()

  router.get('/', async (req, res) => {
    const { percentuais, ...filtros } = filtrosSchema.parse(req.query)
    if (!filtros.busca && !filtros.exercicioId && !filtros.turmaId && !filtros.localId) {
      throw new ErroHttp(400, 'Escolha uma turma, um local, um exercício ou pesquise um aluno')
    }

    const consulta = await consultarCargas(req.contexto!, {
      ...filtros,
      ordenar: 'aluno',
      direcao: 'asc',
      pagina: 1,
      porPagina: LIMITE_LINHAS,
    })

    res.json({
      percentuais,
      resultados: consulta.resultados.map((r) => ({
        aluno: r.aluno,
        turma: r.turma,
        exercicio: r.exercicio,
        dataTeste: r.dataTeste,
        prKg: r.cargaKg,
        cargas: percentuais.map((percentual) => ({
          percentual,
          cargaKg: cargaDoPercentual(r.cargaKg, percentual),
        })),
      })),
      totais: { alunos: consulta.totais.alunos, registros: consulta.totais.registros },
      limitado: consulta.totais.registros > LIMITE_LINHAS,
    })
  })

  return router
}
