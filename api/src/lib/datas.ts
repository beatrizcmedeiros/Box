import { z } from 'zod'

/** Data de hoje no fuso do box (o servidor pode estar em UTC), no formato AAAA-MM-DD. */
export const hojeNoBrasil = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

/** "2026-03-15" → Date à meia-noite UTC (coluna do tipo DATE). */
export const paraData = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

/** Date → "2026-03-15" */
export const formatarData = (data: Date) => data.toISOString().slice(0, 10)

export const dataDoTesteSchema = z.iso
  .date('Data inválida')
  .refine((data) => data <= hojeNoBrasil(), 'A data do teste não pode ser no futuro')
