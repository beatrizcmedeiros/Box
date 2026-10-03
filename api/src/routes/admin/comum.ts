import { z } from 'zod'

export const idSchema = z.coerce.number().int().positive()

export const parseId = (valor: unknown) => idSchema.parse(valor)
