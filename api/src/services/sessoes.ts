import type { Request, Response } from 'express'
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

/** Tokens entregues no corpo da resposta para o app Android (que não usa cookies). */
export type TokensApp = { acesso: string; refresh: string; acessoExpiraEm: string }

/**
 * O app Android se identifica com este cabeçalho. Para ele, os tokens vão no corpo da resposta
 * e o access token volta em "Authorization: Bearer"; a web continua com cookies httpOnly.
 */
export const CABECALHO_CLIENTE = 'x-prbox-cliente'
export const ehClienteApp = (req: Request) => req.get(CABECALHO_CLIENTE) === 'app'

/**
 * Cria a sessão no banco. Na web grava os cookies de acesso e de refresh;
 * no app devolve os tokens para a rota incluir na resposta.
 */
export async function abrirSessao(
  req: Request,
  res: Response,
  usuario: { id: number },
): Promise<TokensApp | undefined> {
  const refresh = gerarRefreshToken()
  await prisma.sessao.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: hashToken(refresh),
      expiraEm: new Date(Date.now() + REFRESH_TOKEN_DIAS * MS_DIA),
    },
  })
  const acesso = await assinarTokenAcesso({ usuarioId: usuario.id })

  if (ehClienteApp(req)) {
    const acessoExpiraEm = new Date(Date.now() + ACCESS_TOKEN_MINUTOS * 60 * 1000).toISOString()
    return { acesso, refresh, acessoExpiraEm }
  }

  res.cookie(COOKIE_ACESSO, acesso, opcoesCookie('/api', ACCESS_TOKEN_MINUTOS * 60 * 1000))
  res.cookie(COOKIE_REFRESH, refresh, opcoesCookie('/api/auth', REFRESH_TOKEN_DIAS * MS_DIA))
  return undefined
}

/** Refresh token da requisição: cookie (web) ou corpo da requisição (app). */
export function refreshDaRequisicao(req: Request): string | undefined {
  if (ehClienteApp(req)) {
    const doCorpo: unknown = req.body?.refreshToken
    return typeof doCorpo === 'string' && doCorpo ? doCorpo : undefined
  }
  return req.cookies?.[COOKIE_REFRESH]
}

/** Access token da requisição: "Authorization: Bearer" (app) ou cookie (web). */
export function acessoDaRequisicao(req: Request): string | undefined {
  const [tipo, token] = req.get('authorization')?.split(' ') ?? []
  if (tipo?.toLowerCase() === 'bearer' && token) return token
  return req.cookies?.[COOKIE_ACESSO]
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
