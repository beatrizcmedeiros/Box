import type { Response } from 'express'
import type { Perfil } from '../generated/prisma/client.ts'
import { env } from '../env.ts'
import { prisma } from '../lib/prisma.ts'
import {
  ACCESS_TOKEN_MINUTOS,
  assinarTokenAcesso,
  gerarRefreshToken,
  hashToken,
  REFRESH_TOKEN_DIAS,
} from '../lib/tokens.ts'

export const COOKIE_ACESSO = 'prbox_acesso'
export const COOKIE_REFRESH = 'prbox_refresh'

const MS_DIA = 24 * 60 * 60 * 1000

function opcoesCookie(path: string, maxAge: number) {
  return {
    httpOnly: true,
    secure: env.producao,
    // Em produção o front encaminha /api para a API (mesma origem), então "strict" funciona
    sameSite: 'strict' as const,
    path,
    maxAge,
  }
}

/** Cria a sessão no banco e grava os cookies de acesso e de refresh na resposta. */
export async function abrirSessao(res: Response, usuario: { id: number; perfil: Perfil }) {
  const refresh = gerarRefreshToken()
  await prisma.sessao.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: hashToken(refresh),
      expiraEm: new Date(Date.now() + REFRESH_TOKEN_DIAS * MS_DIA),
    },
  })
  const acesso = await assinarTokenAcesso({ usuarioId: usuario.id, perfil: usuario.perfil })

  res.cookie(COOKIE_ACESSO, acesso, opcoesCookie('/api', ACCESS_TOKEN_MINUTOS * 60 * 1000))
  res.cookie(COOKIE_REFRESH, refresh, opcoesCookie('/api/auth', REFRESH_TOKEN_DIAS * MS_DIA))
}

export function limparCookies(res: Response) {
  res.clearCookie(COOKIE_ACESSO, { path: '/api' })
  res.clearCookie(COOKIE_REFRESH, { path: '/api/auth' })
}

/** Busca uma sessão válida (não revogada e não expirada) pelo refresh token. */
export async function buscarSessaoValida(refresh: string) {
  const sessao = await prisma.sessao.findUnique({
    where: { tokenHash: hashToken(refresh) },
    include: { usuario: true },
  })
  if (!sessao || sessao.revogadaEm || sessao.expiraEm < new Date() || !sessao.usuario.ativo) {
    return null
  }
  return sessao
}

export async function revogarSessao(id: number) {
  await prisma.sessao.update({ where: { id }, data: { revogadaEm: new Date() } })
}

export async function revogarTodasAsSessoes(usuarioId: number) {
  await prisma.sessao.updateMany({
    where: { usuarioId, revogadaEm: null },
    data: { revogadaEm: new Date() },
  })
}
