/** 52.5 → "52,5" */
export const formatarKg = (kg: number) => kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

/** "2026-03-15" → "15/03/2026" */
export const formatarData = (iso: string) => iso.split('-').reverse().join('/')

/** Data de hoje no fuso do aparelho, em "AAAA-MM-DD". */
export function hojeIso() {
  const agora = new Date()
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/** "15/03/2026" → "2026-03-15"; null se a data não existir. */
export function lerData(texto: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim())
  if (!partes) return null
  const [, dia, mes, ano] = partes
  const iso = `${ano}-${mes}-${dia}`
  const data = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(data.getTime()) && data.toISOString().startsWith(iso) ? iso : null
}

/** Formata enquanto a pessoa digita: "15032026" → "15/03/2026". */
export function mascaraData(texto: string) {
  const digitos = texto.replace(/\D/g, '').slice(0, 8)
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join('/')
}

/** Aceita "52,5" ou "52.5"; devolve NaN se não for número. */
export const lerNumero = (texto: string) =>
  texto.trim() === '' ? NaN : Number(texto.trim().replace(',', '.'))

/** 12.5 → "+12,5%" */
export const formatarPct = (pct: number) =>
  `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
