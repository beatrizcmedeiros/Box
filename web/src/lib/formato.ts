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

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "2026-03-16" → "mar/26" */
export const formatarMesAno = (iso: string) => {
  const [ano, mes] = iso.split('-')
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`
}

/** "2026-03-16" → dias desde 1970 (posição no eixo X de tempo) */
export const diasDesdeEpoca = (iso: string) =>
  Math.round(Date.parse(`${iso}T00:00:00Z`) / 86_400_000)

/** dias desde 1970 → "2026-03-16" */
export const isoDeDias = (dias: number) => new Date(dias * 86_400_000).toISOString().slice(0, 10)

/** 12.5 → "+12,5%" */
export const formatarPct = (pct: number) =>
  `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
