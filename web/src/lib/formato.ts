/** 52.5 → "52,5" */
export const formatarKg = (kg: number) => kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

/** "2026-03-15" → "15/03/2026" */
export const formatarData = (iso: string) => iso.split('-').reverse().join('/')

/** Data de hoje (fuso do aparelho) no formato do campo <input type="date">. */
export function hojeIso() {
  const agora = new Date()
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/** Aceita "52,5" ou "52.5"; devolve NaN se não for número. */
export const lerNumero = (texto: string) =>
  texto.trim() === '' ? NaN : Number(texto.trim().replace(',', '.'))
