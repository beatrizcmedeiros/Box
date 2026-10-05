import { z } from 'zod'
import { CARGA_MAXIMA_KG, CARGA_MINIMA_KG } from '../domain/importacao/lerTexto.ts'

export const cargaKgSchema = z.coerce
  .number('Informe a carga')
  .min(CARGA_MINIMA_KG, `A carga deve ser de pelo menos ${CARGA_MINIMA_KG} kg`)
  .max(CARGA_MAXIMA_KG, `A carga deve ser de no máximo ${CARGA_MAXIMA_KG} kg`)
  .refine((v) => Number.isInteger(Math.round(v * 1e6) / 1e4), 'Use no máximo duas casas decimais')
