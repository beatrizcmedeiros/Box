import { createHash, randomBytes } from 'node:crypto'
import { jwtVerify, SignJWT } from 'jose'
import type { Perfil } from '../generated/prisma/client.ts'
import { env } from '../env.ts'

export const ACCESS_TOKEN_MINUTOS = 15
export const REFRESH_TOKEN_DIAS = 7

export type PayloadAcesso = { usuarioId: number; perfil: Perfil }

const chave = () => new TextEncoder().encode(env.jwtSecret)

export async function assinarTokenAcesso({ usuarioId, perfil }: PayloadAcesso): Promise<string> {
  return new SignJWT({ perfil })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(usuarioId))
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_MINUTOS}m`)
    .sign(chave())
}

/** Retorna o payload ou null se o token for inválido ou estiver expirado. */
export async function verificarTokenAcesso(token: string): Promise<PayloadAcesso | null> {
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ['HS256'] })
    const usuarioId = Number(payload.sub)
    if (!Number.isInteger(usuarioId)) return null
    return { usuarioId, perfil: payload.perfil as Perfil }
  } catch {
    return null
  }
}

export function gerarRefreshToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
