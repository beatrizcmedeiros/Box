import type { NextFunction, Request, Response } from 'express'
import type { Perfil, Usuario } from '../generated/prisma/client.ts'
import { ErroHttp } from '../lib/erros.ts'
import { prisma } from '../lib/prisma.ts'
import { verificarTokenAcesso } from '../lib/tokens.ts'
import { COOKIE_ACESSO } from '../services/sessoes.ts'

declare global {
  namespace Express {
    interface Request {
      usuario?: Usuario
    }
  }
}

/** Exige um token de acesso válido e um usuário ativo. */
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.[COOKIE_ACESSO]
  if (!token) throw new ErroHttp(401, 'Não autenticado', 'NAO_AUTENTICADO')

  const payload = await verificarTokenAcesso(token)
  if (!payload) throw new ErroHttp(401, 'Sessão expirada', 'TOKEN_INVALIDO')

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.usuarioId } })
  if (!usuario || !usuario.ativo) throw new ErroHttp(401, 'Não autenticado', 'NAO_AUTENTICADO')

  req.usuario = usuario
  next()
}

/**
 * Bloqueia o uso do sistema enquanto o usuário não trocar a senha temporária
 * e não aceitar o termo de consentimento (LGPD).
 */
export function exigirCadastroCompleto(req: Request, _res: Response, next: NextFunction) {
  const usuario = req.usuario!
  if (usuario.trocarSenha) {
    throw new ErroHttp(403, 'É necessário trocar a senha temporária', 'TROCAR_SENHA')
  }
  if (!usuario.consentimentoEm) {
    throw new ErroHttp(
      403,
      'É necessário aceitar o termo de consentimento',
      'CONSENTIMENTO_PENDENTE',
    )
  }
  next()
}

export function exigirPerfil(perfil: Perfil) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.usuario?.perfil !== perfil) {
      throw new ErroHttp(403, 'Acesso não permitido para este perfil', 'SEM_PERMISSAO')
    }
    next()
  }
}
