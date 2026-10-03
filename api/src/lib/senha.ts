import { randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (
  senha: string,
  sal: Buffer,
  tamanho: number,
  opcoes: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>

// Parâmetros recomendados pela OWASP para scrypt (N=2^17, r=8, p=1)
const PARAMS = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }
const TAMANHO_CHAVE = 64

/** Formato armazenado: scrypt$N$r$p$sal(base64)$hash(base64) */
export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16)
  const hash = await scryptAsync(senha, sal, TAMANHO_CHAVE, PARAMS)
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    sal.toString('base64'),
    hash.toString('base64'),
  ].join('$')
}

export async function verificarSenha(senha: string, armazenado: string): Promise<boolean> {
  const partes = armazenado.split('$')
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false
  const [, N, r, p, salB64, hashB64] = partes
  const esperado = Buffer.from(hashB64, 'base64')
  const calculado = await scryptAsync(senha, Buffer.from(salB64, 'base64'), esperado.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: PARAMS.maxmem,
  })
  return timingSafeEqual(esperado, calculado)
}

// Sem caracteres ambíguos (0/O, 1/l/I) para facilitar a digitação no celular
const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function gerarSenhaTemporaria(tamanho = 10): string {
  let senha = ''
  for (let i = 0; i < tamanho; i++) senha += ALFABETO[randomInt(ALFABETO.length)]
  return senha
}
